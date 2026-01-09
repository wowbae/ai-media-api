// Midjourney провайдер через Kie.ai API
// Документация: https://kie.ai/model-preview/features/mj-api
import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import { PROVIDER_STATUS_MAP } from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import type {
  KieAiConfig,
  KieAiCreateRequest,
  KieAiCreateResponse,
  KieAiStatusResponse,
  KieAiTaskStatus,
  KieAiAspectRatio,
  KieAiApiResponse,
} from "./interfaces";

// Маппинг статусов Kie.ai на внутренние статусы
const KIEAI_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
  pending: "pending",
  processing: "processing",
  completed: "done",
  done: "done",
  failed: "failed",
};

// Маппинг соотношений сторон
function mapAspectRatio(
  aspectRatio?: "1:1" | "9:16" | "16:9",
): KieAiAspectRatio | undefined {
  if (!aspectRatio) return undefined;
  // Маппинг наших форматов на форматы Kie.ai
  const mapping: Record<string, KieAiAspectRatio> = {
    "1:1": "1:1",
    "9:16": "9:16",
    "16:9": "16:9",
  };
  return mapping[aspectRatio];
}

export function createKieAiMidjourneyProvider(
  config: KieAiConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  // Создание задачи на генерацию изображения
  async function createImagineTask(
    params: GenerateParams,
  ): Promise<KieAiCreateResponse> {
    console.log("[Kie.ai Midjourney] Создание задачи:", {
      prompt: params.prompt.substring(0, 100),
    });

    // Формируем тело запроса согласно документации
    const requestBody: KieAiCreateRequest = {
      taskType: "mj_txt2img",
      speed: "fast", // По умолчанию fast
      prompt: params.prompt,
      aspectRatio: mapAspectRatio(params.aspectRatio),
      version: "7", // По умолчанию версия 7
    };

    // Добавляем fileUrls если есть входные изображения (для image-to-image)
    if (params.inputFiles && params.inputFiles.length > 0) {
      requestBody.fileUrls = params.inputFiles;
      requestBody.taskType = "mj_img2img";
    }

    const response = await fetch(`${baseURL}/api/v1/mj/generate`, {
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
      console.error("[Kie.ai Midjourney] Ошибка создания задачи:", {
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
        `Kie.ai Midjourney API error: ${response.status} - ${errorText}`,
      );
    }

    const responseData =
      (await response.json()) as KieAiApiResponse<KieAiCreateResponse>;

    console.log(
      "[Kie.ai Midjourney] Полный ответ API:",
      JSON.stringify(responseData, null, 2),
    );

    // Проверяем код ответа
    if (responseData.code !== 200) {
      throw new Error(
        `Kie.ai Midjourney API error: ${responseData.code} - ${responseData.msg}`,
      );
    }

    // Извлекаем taskId из data
    if (!responseData.data || !responseData.data.taskId) {
      console.error(
        "[Kie.ai Midjourney] Не удалось найти taskId в ответе:",
        responseData,
      );
      throw new Error(
        `Не удалось получить taskId из ответа API. Ответ: ${JSON.stringify(responseData)}`,
      );
    }

    const taskId = responseData.data.taskId;

    console.log("[Kie.ai Midjourney] Задача создана:", {
      taskId,
      code: responseData.code,
      msg: responseData.msg,
    });

    return {
      taskId,
    };
  }

  // Получение результата задачи
  async function getTaskResultFromAPI(
    taskId: string,
  ): Promise<KieAiStatusResponse> {
    if (!taskId || taskId === "undefined") {
      throw new Error(`Некорректный taskId: ${taskId}`);
    }

    console.log("[Kie.ai Midjourney] Проверка статуса задачи:", taskId);

    // Используем эндпоинт для получения деталей задачи (taskId в query параметре)
    const response = await fetch(
      `${baseURL}/api/v1/mj/record-info?taskId=${encodeURIComponent(taskId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(errorText);
      } catch {
        parsed = errorText;
      }
      console.error("[Kie.ai Midjourney] Ошибка получения статуса:", {
        taskId,
        status: response.status,
        error: parsed,
      });
      throw new Error(
        `Kie.ai Midjourney API error: ${response.status} - ${errorText}`,
      );
    }

    const responseData =
      (await response.json()) as KieAiApiResponse<KieAiStatusResponse>;

    console.log(
      "[Kie.ai Midjourney] Полный ответ статуса:",
      JSON.stringify(responseData, null, 2),
    );

    // Проверяем код ответа
    if (responseData.code !== 200) {
      throw new Error(
        `Kie.ai Midjourney API error: ${responseData.code} - ${responseData.msg}`,
      );
    }

    if (!responseData.data) {
      throw new Error(
        `Kie.ai Midjourney API: данные отсутствуют в ответе. Ответ: ${JSON.stringify(responseData)}`,
      );
    }

    const data = responseData.data;

    // Извлекаем URL из resultInfoJson.resultUrls
    let resultUrls: string[] = [];
    if (data.resultInfoJson?.resultUrls) {
      resultUrls = data.resultInfoJson.resultUrls.map((item) => item.resultUrl);
    }

    // Определяем статус на основе successFlag и наличия результатов
    let status: KieAiTaskStatus = "pending";
    if (data.successFlag === 1 && resultUrls.length > 0) {
      status = "completed";
    } else if (data.successFlag === 0 || !data.resultInfoJson) {
      status = "processing";
    } else if (data.errorMessage || data.errorCode) {
      status = "failed";
    }

    console.log("[Kie.ai Midjourney] Парсинг статуса:", {
      taskId: data.taskId,
      successFlag: data.successFlag,
      resultUrlsCount: resultUrls.length,
      resultUrls: resultUrls, // Логируем все URL для отладки
      status,
    });

    return {
      ...data,
      resultUrls, // Извлеченные URL для обратной совместимости
      status,
    };
  }

  return {
    name: "kieai-midjourney",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createImagineTask(params);

      return {
        taskId: result.taskId,
        status: "pending", // Задача только создана
      };
    },

    async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
      const result = await getTaskResultFromAPI(taskId);

      const mappedStatus = KIEAI_STATUS_MAP[result.status] || "pending";

      // Получаем сообщение об ошибке
      const errorMessage = result.errorMessage || result.errorCode || undefined;

      // Логируем ошибки при статусе failed
      if (result.status === "failed") {
        console.warn("[Kie.ai Midjourney] Задача завершилась с ошибкой:", {
          taskId,
          status: result.status,
          mappedStatus,
          errorMessage,
          errorCode: result.errorCode,
        });
      } else {
        console.log("[Kie.ai Midjourney] Статус задачи:", {
          taskId,
          status: result.status,
          mappedStatus,
          resultUrlsCount: result.resultUrls?.length || 0,
          successFlag: result.successFlag,
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
        error: errorMessage,
      };
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      const result = await getTaskResultFromAPI(taskId);

      if (!result.resultUrls || result.resultUrls.length === 0) {
        throw new Error(
          `Задача Kie.ai Midjourney не завершена или результаты отсутствуют: status=${result.status}, taskId=${taskId}`,
        );
      }

      const files: SavedFileInfo[] = [];

      // Обрабатываем массив URL результатов
      if (result.resultUrls && result.resultUrls.length > 0) {
        console.log(
          `[Kie.ai Midjourney] Скачивание ${result.resultUrls.length} результатов:`,
          result.resultUrls,
        );
        for (let i = 0; i < result.resultUrls.length; i++) {
          const url = result.resultUrls[i];
          console.log(
            `[Kie.ai Midjourney] Скачивание файла ${i + 1}/${result.resultUrls.length}: ${url}`,
          );
          const savedFile = await saveFileFromUrl(url);
          files.push(savedFile);
          console.log(
            `[Kie.ai Midjourney] Файл ${i + 1} сохранён: ${savedFile.filename}`,
          );
        }
      }

      if (files.length === 0) {
        throw new Error(
          `Не удалось получить результат задачи Kie.ai Midjourney: taskId=${taskId}`,
        );
      }

      console.log(
        `[Kie.ai Midjourney] Файлы сохранены: ${files.length} файлов`,
      );

      return files;
    },
  };
}
