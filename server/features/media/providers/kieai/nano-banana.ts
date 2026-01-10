// Nano Banana Pro провайдер через Kie.ai API
// Документация: https://docs.kie.ai/market/google/pro-image-to-image
import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import { uploadToImgbb, isImgbbConfigured } from "../../imgbb.service";
import type {
  KieAiConfig,
  KieAiNanoBananaRequest,
  KieAiNanoBananaAspectRatio,
  KieAiNanoBananaResolution,
  KieAiNanoBananaOutputFormat,
  KieAiUnifiedCreateResponse,
  KieAiUnifiedTaskResponse,
} from "./interfaces";
import { mapToStandardQuality, type StandardQuality } from "../utils";

// Маппинг статусов Kie.ai на внутренние статусы
const KIEAI_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
  waiting: "pending",
  queuing: "pending",
  generating: "processing",
  success: "done",
  fail: "failed",
};

// Маппинг соотношений сторон: принимает полный тип, но поддерживает только 1:1, 9:16, 16:9
function mapAspectRatio(
  aspectRatio?: GenerateParams['aspectRatio'],
): KieAiNanoBananaAspectRatio {
  if (!aspectRatio) return "1:1";

  // Nano Banana поддерживает только эти соотношения сторон
  const supportedRatios: Record<string, KieAiNanoBananaAspectRatio> = {
    "1:1": "1:1",
    "9:16": "9:16",
    "16:9": "16:9",
  };

  return supportedRatios[aspectRatio] || "1:1";
}

// Маппинг качества/разрешения: стандартное качество -> специфичное для Nano Banana
function mapResolutionToNanoBanana(
  quality: GenerateParams['quality']
): KieAiNanoBananaResolution {
  // Сначала маппим в стандартное качество
  const standardQuality = mapToStandardQuality(quality) || '4k';

  // Затем маппим стандартное качество в формат Nano Banana (с большой буквой K)
  const mapping: Record<StandardQuality, KieAiNanoBananaResolution> = {
    '1k': '1K',
    '2k': '2K',
    '4k': '4K',
  };

  return mapping[standardQuality] || '4K';
}

export function createKieAiNanoBananaProvider(
  config: KieAiConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  // Загрузка файла в Kie.ai (конвертация base64 в публичный URL через imgbb)
  async function uploadFileToKieAi(fileUrlOrPath: string): Promise<string> {
    console.log(
      "[Kie.ai Nano Banana Pro] Обработка файла:",
      fileUrlOrPath.substring(0, 50) + "...",
    );

    // Если это уже URL (начинается с http:// или https://), возвращаем как есть
    if (
      fileUrlOrPath.startsWith("http://") ||
      fileUrlOrPath.startsWith("https://")
    ) {
      console.log("[Kie.ai Nano Banana Pro] Файл уже является публичным URL");
      return fileUrlOrPath;
    }

    // Если это data URL (base64) - загружаем на imgbb
    if (fileUrlOrPath.startsWith("data:")) {
      if (!isImgbbConfigured()) {
        throw new Error(
          "IMGBB_API_KEY не настроен. Для image-to-image с base64 нужен imgbb.",
        );
      }
      console.log(
        "[Kie.ai Nano Banana Pro] Загрузка base64 изображения на imgbb...",
      );
      const publicUrl = await uploadToImgbb(fileUrlOrPath);
      console.log("[Kie.ai Nano Banana Pro] Изображение загружено:", publicUrl);
      return publicUrl;
    }

    // Если это локальный путь - ошибка
    throw new Error(
      `Kie.ai Nano Banana Pro требует публичные URLs или base64 изображений. ` +
        `Получен неподдерживаемый формат: ${fileUrlOrPath.substring(0, 100)}`,
    );
  }

  // Создание задачи на генерацию изображения
  async function createNanoBananaTask(
    params: GenerateParams,
  ): Promise<{ taskId: string }> {
    const { prompt, inputFiles, aspectRatio, quality, outputFormat } = params;

    console.log("[Kie.ai Nano Banana Pro] Создание задачи:", {
      prompt: prompt.substring(0, 100),
      hasInputFiles: !!inputFiles && inputFiles.length > 0,
      aspectRatio,
      quality,
      outputFormat,
    });

    // Формируем тело запроса согласно документации
    const requestBody: KieAiNanoBananaRequest = {
      model: "nano-banana-pro",
      input: {
        prompt: prompt,
        aspect_ratio: mapAspectRatio(aspectRatio),
        resolution: mapResolutionToNanoBanana(quality),
        output_format: (outputFormat === "jpg" || outputFormat === "jpeg"
          ? "jpg"
          : "png") as KieAiNanoBananaOutputFormat,
      },
    };

    // Добавляем image_input если есть входные изображения
    if (inputFiles && inputFiles.length > 0) {
      // Проверяем и конвертируем файлы в публичные URLs
      const imageUrls: string[] = [];
      for (const file of inputFiles) {
        try {
          const url = await uploadFileToKieAi(file);
          imageUrls.push(url);
        } catch (error) {
          console.error(
            "[Kie.ai Nano Banana Pro] Ошибка загрузки файла:",
            file,
            error,
          );
          throw error;
        }
      }

      requestBody.input.image_input = imageUrls;
      console.log(
        "[Kie.ai Nano Banana Pro] Image-to-Image режим с",
        imageUrls.length,
        "изображениями:",
        imageUrls,
      );
    }

    const response = await fetch(`${baseURL}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(errorText);
      } catch {
        parsed = errorText;
      }
      console.error("[Kie.ai Nano Banana Pro] Ошибка создания задачи:", {
        status: response.status,
        error: parsed,
      });

      // Обрабатываем типичные ошибки
      if (response.status === 401) {
        throw new Error("Ошибка авторизации Kie.ai API");
      }
      if (response.status === 402 || response.status === 403) {
        throw new Error("Недостаточно средств на балансе Kie.ai");
      }

      throw new Error(
        `Kie.ai Nano Banana Pro API error: ${response.status} - ${errorText}`,
      );
    }

    const responseData = (await response.json()) as KieAiUnifiedCreateResponse;

    console.log(
      "[Kie.ai Nano Banana Pro] Полный ответ API:",
      JSON.stringify(responseData, null, 2),
    );

    // Проверяем код ответа
    if (responseData.code !== 200) {
      throw new Error(
        `Kie.ai Nano Banana Pro API error: ${responseData.code} - ${responseData.msg}`,
      );
    }

    // Извлекаем taskId из data
    if (!responseData.data || !responseData.data.taskId) {
      console.error(
        "[Kie.ai Nano Banana Pro] Не удалось найти taskId в ответе:",
        responseData,
      );
      throw new Error(
        `Не удалось получить taskId из ответа API. Ответ: ${JSON.stringify(responseData)}`,
      );
    }

    const taskId = responseData.data.taskId;

    console.log("[Kie.ai Nano Banana Pro] Задача создана:", {
      taskId,
      code: responseData.code,
      msg: responseData.msg,
    });

    return {
      taskId,
    };
  }

  // Получение результата задачи
  async function getTaskResultFromAPI(taskId: string): Promise<{
    status: string;
    resultUrls?: string[];
    error?: string;
  }> {
    if (!taskId || taskId === "undefined") {
      throw new Error(`Некорректный taskId: ${taskId}`);
    }

    console.log("[Kie.ai Nano Banana Pro] Проверка статуса задачи:", taskId);

    // Используем универсальный эндпоинт для получения статуса задачи
    const url = `${baseURL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(errorText);
      } catch {
        parsed = errorText;
      }
      console.error("[Kie.ai Nano Banana Pro] Ошибка получения статуса:", {
        taskId,
        status: response.status,
        error: parsed,
      });
      throw new Error(
        `Kie.ai Nano Banana Pro API error: ${response.status} - ${errorText}`,
      );
    }

    const apiResponse = (await response.json()) as KieAiUnifiedTaskResponse;

    console.log(
      "[Kie.ai Nano Banana Pro] Полный ответ статуса:",
      JSON.stringify(apiResponse, null, 2),
    );

    // Проверяем код ответа
    if (apiResponse.code !== 200) {
      throw new Error(
        `Kie.ai Nano Banana Pro API error: ${apiResponse.code} - ${apiResponse.msg}`,
      );
    }

    if (!apiResponse.data) {
      throw new Error(
        `Kie.ai Nano Banana Pro API: данные отсутствуют в ответе`,
      );
    }

    const taskData = apiResponse.data;
    const state = taskData.state;

    // Извлекаем URL результата из resultJson
    let resultUrls: string[] = [];
    if (state === "success" && taskData.resultJson) {
      try {
        const resultData = JSON.parse(taskData.resultJson);
        if (resultData.resultUrls && Array.isArray(resultData.resultUrls)) {
          resultUrls = resultData.resultUrls;
        } else if (resultData.resultUrl) {
          // На случай, если в ответе одиночный URL
          resultUrls = [resultData.resultUrl];
        }
      } catch (error) {
        console.error(
          "[Kie.ai Nano Banana Pro] Ошибка парсинга resultJson:",
          error,
        );
      }
    }

    // Формируем сообщение об ошибке
    const errorMessage =
      state === "fail"
        ? taskData.failMsg ||
          taskData.failCode ||
          "Задача завершилась с ошибкой"
        : undefined;

    console.log("[Kie.ai Nano Banana Pro] Парсинг статуса:", {
      taskId: taskData.taskId,
      state,
      resultUrlsCount: resultUrls.length,
      error: errorMessage,
    });

    return {
      status: state,
      resultUrls,
      error: errorMessage,
    };
  }

  return {
    name: "kieai-nano-banana",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createNanoBananaTask(params);

      return {
        taskId: result.taskId,
        status: "pending", // Задача только создана
      };
    },

    async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
      const result = await getTaskResultFromAPI(taskId);

      const mappedStatus = KIEAI_STATUS_MAP[result.status] || "pending";

      // Логируем статус
      if (result.status === "fail") {
        console.warn("[Kie.ai Nano Banana Pro] Задача завершилась с ошибкой:", {
          taskId,
          status: result.status,
          mappedStatus,
          error: result.error,
        });
      } else {
        console.log("[Kie.ai Nano Banana Pro] Статус задачи:", {
          taskId,
          status: result.status,
          mappedStatus,
          resultUrlsCount: result.resultUrls?.length || 0,
        });
      }

      // Получаем URL результата из массива resultUrls
      const resultUrl =
        result.resultUrls && result.resultUrls.length > 0
          ? result.resultUrls[0]
          : undefined;

      return {
        status: mappedStatus,
        url: resultUrl,
        error: result.error,
      };
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      const result = await getTaskResultFromAPI(taskId);

      if (!result.resultUrls || result.resultUrls.length === 0) {
        throw new Error(
          `Задача Kie.ai Nano Banana Pro не завершена или результаты отсутствуют: status=${result.status}, taskId=${taskId}`,
        );
      }

      const files: SavedFileInfo[] = [];

      // Скачиваем все результаты
      console.log(
        `[Kie.ai Nano Banana Pro] Скачивание ${result.resultUrls.length} результатов:`,
        result.resultUrls,
      );

      for (let i = 0; i < result.resultUrls.length; i++) {
        const url = result.resultUrls[i];
        console.log(
          `[Kie.ai Nano Banana Pro] Скачивание файла ${i + 1}/${result.resultUrls.length}: ${url}`,
        );
        const savedFile = await saveFileFromUrl(url);
        files.push(savedFile);
        console.log(
          `[Kie.ai Nano Banana Pro] Файл ${i + 1} сохранён: ${savedFile.filename}`,
        );
      }

      if (files.length === 0) {
        throw new Error(
          `Не удалось получить результат задачи Kie.ai Nano Banana Pro: taskId=${taskId}`,
        );
      }

      console.log(
        `[Kie.ai Nano Banana Pro] Файлы сохранены: ${files.length} файлов`,
      );

      return files;
    },
  };
}
