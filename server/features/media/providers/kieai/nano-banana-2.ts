// Nano Banana 2 провайдер через Kie.ai API
// Документация: https://kie.ai/nano-banana-2
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

// Соотношения сторон для Nano Banana 2 (расширенный список по сравнению с Pro)
// Поддерживает: 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9, auto
export type KieAiNanoBanana2AspectRatio =
  | "1:1"
  | "1:4"
  | "1:8"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:1"
  | "4:3"
  | "4:5"
  | "5:4"
  | "8:1"
  | "9:16"
  | "16:9"
  | "21:9"
  | "auto";

// Разрешение изображения для Nano Banana 2
export type KieAiNanoBanana2Resolution = "1K" | "2K" | "4K";

// Формат выходного файла для Nano Banana 2
export type KieAiNanoBanana2OutputFormat = "png" | "jpg";

// Запрос на создание задачи Nano Banana 2
export interface KieAiNanoBanana2Request {
  model: "nano-banana-2";
  callBackUrl?: string;
  input: {
    prompt: string;
    image_input?: string[]; // Массив URL изображений для image-to-image (до 14 файлов)
    aspect_ratio?: KieAiNanoBanana2AspectRatio;
    resolution?: KieAiNanoBanana2Resolution;
    output_format?: KieAiNanoBanana2OutputFormat;
    google_search?: boolean; // Опция для search-grounded generation
  };
}

// Маппинг соотношений сторон: стандартное качество -> специфичное для Nano Banana 2
function mapAspectRatio(
  aspectRatio?: GenerateParams['aspectRatio'],
): KieAiNanoBanana2AspectRatio {
  if (!aspectRatio) return "auto";

  // Nano Banana 2 поддерживает расширенный список соотношений сторон
  const supportedRatios: Record<string, KieAiNanoBanana2AspectRatio> = {
    "1:1": "1:1",
    "9:16": "9:16",
    "16:9": "16:9",
    "21:9": "21:9",
    "4:3": "4:3",
    "3:4": "3:4",
    "2:3": "2:3",
    "3:2": "3:2",
    "4:5": "4:5",
    "5:4": "5:4",
    "1:4": "1:4",
    "1:8": "1:8",
    "4:1": "4:1",
    "8:1": "8:1",
  };

  return supportedRatios[aspectRatio] || "auto";
}

// Маппинг качества/разрешения: стандартное качество -> специфичное для Nano Banana 2
function mapResolutionToNanoBanana2(
  quality: GenerateParams['quality']
): KieAiNanoBanana2Resolution {
  // Сначала маппим в стандартное качество
  const standardQuality = mapToStandardQuality(quality) || '4k';

  // Затем маппим стандартное качество в формат Nano Banana 2 (с большой буквой K)
  const mapping: Record<StandardQuality, KieAiNanoBanana2Resolution> = {
    '1k': '1K',
    '2k': '2K',
    '4k': '4K',
  };

  return mapping[standardQuality] || '4K';
}

export function createKieAiNanoBanana2Provider(
  config: KieAiConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  // Загрузка файла в Kie.ai (конвертация base64 в публичный URL через imgbb)
  async function uploadFileToKieAi(fileUrlOrPath: string): Promise<string> {
    console.log(
      "[Kie.ai Nano Banana 2] Обработка файла:",
      fileUrlOrPath.substring(0, 50) + "...",
    );

    // Если это уже URL (начинается с http:// или https://), возвращаем как есть
    if (
      fileUrlOrPath.startsWith("http://") ||
      fileUrlOrPath.startsWith("https://")
    ) {
      console.log("[Kie.ai Nano Banana 2] Файл уже является публичным URL");
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
        "[Kie.ai Nano Banana 2] Загрузка base64 изображения на imgbb...",
      );
      const publicUrl = await uploadToImgbb(fileUrlOrPath);
      console.log("[Kie.ai Nano Banana 2] Изображение загружено:", publicUrl);
      return publicUrl;
    }

    // Если это локальный путь - ошибка
    throw new Error(
      `Kie.ai Nano Banana 2 требует публичные URLs или base64 изображений. ` +
        `Получен неподдерживаемый формат: ${fileUrlOrPath.substring(0, 100)}`,
    );
  }

  // Создание задачи на генерацию изображения
  async function createNanoBanana2Task(
    params: GenerateParams,
  ): Promise<{ taskId: string }> {
    const { prompt, inputFiles, aspectRatio, quality, outputFormat } = params;

    console.log("[Kie.ai Nano Banana 2] Создание задачи:", {
      prompt: prompt.substring(0, 100),
      hasInputFiles: !!inputFiles && inputFiles.length > 0,
      aspectRatio,
      quality,
      outputFormat,
    });

    // Формируем тело запроса согласно документации
    const requestBody: KieAiNanoBanana2Request = {
      model: "nano-banana-2",
      input: {
        prompt: prompt,
        aspect_ratio: mapAspectRatio(aspectRatio),
        resolution: mapResolutionToNanoBanana2(quality),
        output_format: (outputFormat === "jpg" || outputFormat === "jpeg"
          ? "jpg"
          : "png") as KieAiNanoBanana2OutputFormat,
        google_search: false, // По умолчанию отключаем search-grounded generation
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
            "[Kie.ai Nano Banana 2] Ошибка загрузки файла:",
            file,
            error,
          );
          throw error;
        }
      }

      requestBody.input.image_input = imageUrls;
      console.log(
        "[Kie.ai Nano Banana 2] Image-to-Image режим с",
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
      console.error("[Kie.ai Nano Banana 2] Ошибка создания задачи:", {
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
        `Kie.ai Nano Banana 2 API error: ${response.status} - ${errorText}`,
      );
    }

    const responseData = (await response.json()) as KieAiUnifiedCreateResponse;

    console.log(
      "[Kie.ai Nano Banana 2] Полный ответ API:",
      JSON.stringify(responseData, null, 2),
    );

    // Проверяем код ответа
    if (responseData.code !== 200) {
      throw new Error(
        `Kie.ai Nano Banana 2 API error: ${responseData.code} - ${responseData.msg}`,
      );
    }

    // Извлекаем taskId из data
    if (!responseData.data || !responseData.data.taskId) {
      console.error(
        "[Kie.ai Nano Banana 2] Не удалось найти taskId в ответе:",
        responseData,
      );
      throw new Error(
        `Не удалось получить taskId из ответа API. Ответ: ${JSON.stringify(responseData)}`,
      );
    }

    const taskId = responseData.data.taskId;

    console.log("[Kie.ai Nano Banana 2] Задача создана:", {
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

    console.log("[Kie.ai Nano Banana 2] Проверка статуса задачи:", taskId);

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
      console.error("[Kie.ai Nano Banana 2] Ошибка получения статуса:", {
        taskId,
        status: response.status,
        error: parsed,
      });
      throw new Error(
        `Kie.ai Nano Banana 2 API error: ${response.status} - ${errorText}`,
      );
    }

    const apiResponse = (await response.json()) as KieAiUnifiedTaskResponse;

    console.log(
      "[Kie.ai Nano Banana 2] Полный ответ статуса:",
      JSON.stringify(apiResponse, null, 2),
    );

    // Проверяем код ответа
    if (apiResponse.code !== 200) {
      throw new Error(
        `Kie.ai Nano Banana 2 API error: ${apiResponse.code} - ${apiResponse.msg}`,
      );
    }

    if (!apiResponse.data) {
      throw new Error(
        `Kie.ai Nano Banana 2 API: данные отсутствуют в ответе`,
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
          "[Kie.ai Nano Banana 2] Ошибка парсинга resultJson:",
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

    console.log("[Kie.ai Nano Banana 2] Парсинг статуса:", {
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
    name: "kieai-nano-banana-2",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createNanoBanana2Task(params);

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
        console.warn("[Kie.ai Nano Banana 2] Задача завершилась с ошибкой:", {
          taskId,
          status: result.status,
          mappedStatus,
          error: result.error,
        });
      } else {
        console.log("[Kie.ai Nano Banana 2] Статус задачи:", {
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
          `Задача Kie.ai Nano Banana 2 не завершена или результаты отсутствуют: status=${result.status}, taskId=${taskId}`,
        );
      }

      const files: SavedFileInfo[] = [];

      // Скачиваем все результаты
      console.log(
        `[Kie.ai Nano Banana 2] Скачивание ${result.resultUrls.length} результатов:`,
        result.resultUrls,
      );

      for (let i = 0; i < result.resultUrls.length; i++) {
        const url = result.resultUrls[i];
        console.log(
          `[Kie.ai Nano Banana 2] Скачивание файла ${i + 1}/${result.resultUrls.length}: ${url}`,
        );
        const savedFile = await saveFileFromUrl(url);
        files.push(savedFile);
        console.log(
          `[Kie.ai Nano Banana 2] Файл ${i + 1} сохранён: ${savedFile.filename}`,
        );
      }

      if (files.length === 0) {
        throw new Error(
          `Не удалось получить результат задачи Kie.ai Nano Banana 2: taskId=${taskId}`,
        );
      }

      console.log(
        `[Kie.ai Nano Banana 2] Файлы сохранены: ${files.length} файлов`,
      );

      return files;
    },
  };
}
