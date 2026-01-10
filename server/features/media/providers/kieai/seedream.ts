// Seedream 4.5 провайдер через Kie.ai API
// Документация: https://kie.ai/seedream-4-5
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
  KieAiSeedreamAspectRatio,
  KieAiSeedreamQuality,
  KieAiSeedreamTextToImageRequest,
  KieAiSeedreamEditRequest,
  KieAiUnifiedCreateResponse,
  KieAiUnifiedTaskResponse,
} from "./interfaces";

// Маппинг статусов Kie.ai на внутренние статусы
const KIEAI_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
  waiting: "pending",
  queuing: "pending",
  generating: "processing",
  success: "done",
  fail: "failed",
};

// Маппинг соотношений сторон для Seedream 4.5
function mapAspectRatio(
  aspectRatio?:
    | "1:1"
    | "4:3"
    | "3:4"
    | "9:16"
    | "16:9"
    | "2:3"
    | "3:2"
    | "21:9",
): KieAiSeedreamAspectRatio {
  if (!aspectRatio) return "16:9";

  const mapping: Record<string, KieAiSeedreamAspectRatio> = {
    "1:1": "1:1",
    "4:3": "4:3",
    "3:4": "3:4",
    "9:16": "9:16",
    "16:9": "16:9",
    "2:3": "2:3",
    "3:2": "3:2",
    "21:9": "21:9",
  };
  return mapping[aspectRatio] || "16:9";
}

// Маппинг качества: 2k -> basic, 4k -> high
function mapQuality(
  quality?: "1k" | "2k" | "4k" | "LOW" | "MEDIUM" | "HIGH" | "ULTRA",
): KieAiSeedreamQuality {
  const mapping: Record<string, KieAiSeedreamQuality> = {
    "1k": "basic",
    "2k": "basic",
    "4k": "high",
    LOW: "basic",
    MEDIUM: "basic",
    HIGH: "high",
    ULTRA: "high",
  };
  return mapping[quality || "HIGH"] || "high";
}

export function createKieAiSeedreamProvider(
  config: KieAiConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  // Загрузка файла в Kie.ai (конвертация base64 в публичный URL через imgbb)
  async function uploadFileToKieAi(fileUrlOrPath: string): Promise<string> {
    console.log(
      "[Kie.ai Seedream 4.5] Обработка файла:",
      fileUrlOrPath.substring(0, 50) + "...",
    );

    // Если это уже URL (начинается с http:// или https://), возвращаем как есть
    if (
      fileUrlOrPath.startsWith("http://") ||
      fileUrlOrPath.startsWith("https://")
    ) {
      console.log("[Kie.ai Seedream 4.5] Файл уже является публичным URL");
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
        "[Kie.ai Seedream 4.5] Загрузка base64 изображения на imgbb...",
      );
      const publicUrl = await uploadToImgbb(fileUrlOrPath);
      console.log("[Kie.ai Seedream 4.5] Изображение загружено:", publicUrl);
      return publicUrl;
    }

    // Если это локальный путь - ошибка
    throw new Error(
      `Kie.ai Seedream 4.5 требует публичные URLs или base64 изображений. ` +
        `Получен неподдерживаемый формат: ${fileUrlOrPath.substring(0, 100)}`,
    );
  }

  // Создание задачи на генерацию изображения
  async function createSeedreamTask(
    params: GenerateParams,
  ): Promise<{ taskId: string }> {
    const { prompt, inputFiles, aspectRatio, quality, model } = params;

    console.log("[Kie.ai Seedream 4.5] Создание задачи:", {
      model,
      prompt: prompt.substring(0, 100),
      hasInputFiles: !!inputFiles && inputFiles.length > 0,
      aspectRatio,
      quality,
    });

    // Определяем режим работы: если есть inputFiles и модель SEEDREAM_4_5_EDIT -> Edit режим
    const isEditMode =
      (model === "SEEDREAM_4_5_EDIT" ||
        (inputFiles && inputFiles.length > 0)) &&
      model !== "SEEDREAM_4_5";

    // Валидация: для Edit режима максимум 14 файлов
    if (isEditMode && inputFiles && inputFiles.length > 14) {
      throw new Error(
        `Seedream 4.5 Edit поддерживает максимум 14 файлов. Получено: ${inputFiles.length}`,
      );
    }

    // Проверяем и конвертируем файлы в публичные URLs для Edit режима
    let imageUrls: string[] = [];
    if (isEditMode && inputFiles && inputFiles.length > 0) {
      for (const file of inputFiles) {
        try {
          const url = await uploadFileToKieAi(file);
          imageUrls.push(url);
        } catch (error) {
          console.error(
            "[Kie.ai Seedream 4.5] Ошибка загрузки файла:",
            file,
            error,
          );
          throw error;
        }
      }
      console.log(
        "[Kie.ai Seedream 4.5] Edit режим с",
        imageUrls.length,
        "изображениями:",
        imageUrls,
      );
    }

    // Формируем тело запроса в зависимости от режима
    let requestBody:
      | KieAiSeedreamTextToImageRequest
      | KieAiSeedreamEditRequest;

    if (isEditMode) {
      requestBody = {
        model: "seedream/4.5-edit",
        input: {
          prompt: prompt,
          image_urls: imageUrls,
          aspect_ratio: mapAspectRatio(aspectRatio),
          quality: mapQuality(quality),
        },
      };
    } else {
      requestBody = {
        model: "seedream/4.5-text-to-image",
        input: {
          prompt: prompt,
          aspect_ratio: mapAspectRatio(aspectRatio),
          quality: mapQuality(quality),
        },
      };
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
      console.error("[Kie.ai Seedream 4.5] Ошибка создания задачи:", {
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
        `Kie.ai Seedream 4.5 API error: ${response.status} - ${errorText}`,
      );
    }

    const responseData = (await response.json()) as KieAiUnifiedCreateResponse;

    console.log(
      "[Kie.ai Seedream 4.5] Полный ответ API:",
      JSON.stringify(responseData, null, 2),
    );

    // Проверяем код ответа
    if (responseData.code !== 200) {
      throw new Error(
        `Kie.ai Seedream 4.5 API error: ${responseData.code} - ${responseData.msg}`,
      );
    }

    // Извлекаем taskId из data
    if (!responseData.data || !responseData.data.taskId) {
      console.error(
        "[Kie.ai Seedream 4.5] Не удалось найти taskId в ответе:",
        responseData,
      );
      throw new Error(
        `Не удалось получить taskId из ответа API. Ответ: ${JSON.stringify(responseData)}`,
      );
    }

    const taskId = responseData.data.taskId;

    console.log("[Kie.ai Seedream 4.5] Задача создана:", {
      taskId,
      mode: isEditMode ? "Edit" : "Text-to-Image",
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

    console.log("[Kie.ai Seedream 4.5] Проверка статуса задачи:", taskId);

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
      console.error("[Kie.ai Seedream 4.5] Ошибка получения статуса:", {
        taskId,
        status: response.status,
        error: parsed,
      });
      throw new Error(
        `Kie.ai Seedream 4.5 API error: ${response.status} - ${errorText}`,
      );
    }

    const apiResponse = (await response.json()) as KieAiUnifiedTaskResponse;

    console.log(
      "[Kie.ai Seedream 4.5] Полный ответ статуса:",
      JSON.stringify(apiResponse, null, 2),
    );

    // Проверяем код ответа
    if (apiResponse.code !== 200) {
      throw new Error(
        `Kie.ai Seedream 4.5 API error: ${apiResponse.code} - ${apiResponse.msg}`,
      );
    }

    if (!apiResponse.data) {
      throw new Error(
        `Kie.ai Seedream 4.5 API: данные отсутствуют в ответе`,
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
          "[Kie.ai Seedream 4.5] Ошибка парсинга resultJson:",
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

    console.log("[Kie.ai Seedream 4.5] Парсинг статуса:", {
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
    name: "kieai-seedream-4.5",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createSeedreamTask(params);

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
        console.warn("[Kie.ai Seedream 4.5] Задача завершилась с ошибкой:", {
          taskId,
          status: result.status,
          mappedStatus,
          error: result.error,
        });
      } else {
        console.log("[Kie.ai Seedream 4.5] Статус задачи:", {
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
          `Задача Kie.ai Seedream 4.5 не завершена или результаты отсутствуют: status=${result.status}, taskId=${taskId}`,
        );
      }

      const files: SavedFileInfo[] = [];

      // Скачиваем все результаты
      console.log(
        `[Kie.ai Seedream 4.5] Скачивание ${result.resultUrls.length} результатов:`,
        result.resultUrls,
      );

      for (let i = 0; i < result.resultUrls.length; i++) {
        const url = result.resultUrls[i];
        console.log(
          `[Kie.ai Seedream 4.5] Скачивание файла ${i + 1}/${result.resultUrls.length}: ${url}`,
        );
        const savedFile = await saveFileFromUrl(url);
        files.push(savedFile);
        console.log(
          `[Kie.ai Seedream 4.5] Файл ${i + 1} сохранён: ${savedFile.filename}`,
        );
      }

      if (files.length === 0) {
        throw new Error(
          `Не удалось получить результат задачи Kie.ai Seedream 4.5: taskId=${taskId}`,
        );
      }

      console.log(
        `[Kie.ai Seedream 4.5] Файлы сохранены: ${files.length} файлов`,
      );

      return files;
    },
  };
}
