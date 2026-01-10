// Google Imagen4 провайдер через Kie.ai API
// Документация: https://docs.kie.ai/market/google/imagen4

import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import type {
  KieAiConfig,
  KieAiUnifiedCreateResponse,
  KieAiUnifiedTaskResponse,
} from "./interfaces";

// Интерфейс для input параметров Imagen4
interface KieAiImagen4Input {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  seed?: string;
}

// Интерфейс для тела запроса
interface KieAiImagen4Request {
  model: "google/imagen4";
  callBackUrl?: string;
  input: KieAiImagen4Input;
}

// Маппинг статусов Kie.ai на внутренние статусы
const KIEAI_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
  waiting: "pending",
  queuing: "pending",
  generating: "processing",
  success: "done",
  fail: "failed",
};

export function createKieAiImagen4Provider(
  config: KieAiConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  // Создание задачи на генерацию изображения
  async function createImagen4Task(
    params: GenerateParams,
  ): Promise<{ taskId: string }> {
    const { prompt, negativePrompt, aspectRatio, seed } = params;

    console.log("[Kie.ai Imagen4] Создание задачи:", {
      prompt: prompt.substring(0, 100),
      negativePrompt: negativePrompt?.substring(0, 100),
      aspectRatio,
      seed,
    });

    // Формируем тело запроса согласно документации
    const requestBody: KieAiImagen4Request = {
      model: "google/imagen4",
      input: {
        prompt,
        negative_prompt: negativePrompt || "",
        aspect_ratio: aspectRatio || "1:1",
        seed: seed?.toString() || "",
      },
    };

    // Если нужно добавить callback URL (можно взять из env или params, но для простоты optional)
    // Здесь предполагаем, что callback добавляется в generation.service.ts
    // requestBody.callBackUrl = process.env.APP_URL + "/callback/kieai" || "";

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
      console.error("[Kie.ai Imagen4] Ошибка создания задачи:", {
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
        `Kie.ai Imagen4 API error: ${response.status} - ${errorText}`,
      );
    }

    const responseData = (await response.json()) as KieAiUnifiedCreateResponse;

    console.log(
      "[Kie.ai Imagen4] Полный ответ API:",
      JSON.stringify(responseData, null, 2),
    );

    // Проверяем код ответа
    if (responseData.code !== 200) {
      throw new Error(
        `Kie.ai Imagen4 API error: ${responseData.code} - ${responseData.msg}`,
      );
    }

    // Извлекаем taskId из data
    if (!responseData.data || !responseData.data.taskId) {
      console.error(
        "[Kie.ai Imagen4] Не удалось найти taskId в ответе:",
        responseData,
      );
      throw new Error(
        `Не удалось получить taskId из ответа API. Ответ: ${JSON.stringify(responseData)}`,
      );
    }

    const taskId = responseData.data.taskId;

    console.log("[Kie.ai Imagen4] Задача создана:", {
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

    console.log("[Kie.ai Imagen4] Проверка статуса задачи:", taskId);

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
      console.error("[Kie.ai Imagen4] Ошибка получения статуса:", {
        taskId,
        status: response.status,
        error: parsed,
      });
      throw new Error(
        `Kie.ai Imagen4 API error: ${response.status} - ${errorText}`,
      );
    }

    const apiResponse = (await response.json()) as KieAiUnifiedTaskResponse;

    console.log(
      "[Kie.ai Imagen4] Полный ответ статуса:",
      JSON.stringify(apiResponse, null, 2),
    );

    // Проверяем код ответа
    if (apiResponse.code !== 200) {
      throw new Error(
        `Kie.ai Imagen4 API error: ${apiResponse.code} - ${apiResponse.msg}`,
      );
    }

    if (!apiResponse.data) {
      throw new Error(
        `Kie.ai Imagen4 API: данные отсутствуют в ответе`,
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
          resultUrls = [resultData.resultUrl];
        }
      } catch (error) {
        console.error(
          "[Kie.ai Imagen4] Ошибка парсинга resultJson:",
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

    console.log("[Kie.ai Imagen4] Парсинг статуса:", {
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
    name: "kieai-imagen4",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createImagen4Task(params);

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
        console.warn("[Kie.ai Imagen4] Задача завершилась с ошибкой:", {
          taskId,
          status: result.status,
          mappedStatus,
          error: result.error,
        });
      } else {
        console.log("[Kie.ai Imagen4] Статус задачи:", {
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
          `Задача Kie.ai Imagen4 не завершена или результаты отсутствуют: status=${result.status}, taskId=${taskId}`,
        );
      }

      const files: SavedFileInfo[] = [];

      // Скачиваем все результаты
      console.log(
        `[Kie.ai Imagen4] Скачивание ${result.resultUrls.length} результатов:`,
        result.resultUrls,
      );

      for (let i = 0; i < result.resultUrls.length; i++) {
        const url = result.resultUrls[i];
        console.log(
          `[Kie.ai Imagen4] Скачивание файла ${i + 1}/${result.resultUrls.length}: ${url}`,
        );
        const savedFile = await saveFileFromUrl(url);
        files.push(savedFile);
        console.log(
          `[Kie.ai Imagen4] Файл ${i + 1} сохранён: ${savedFile.filename}`,
        );
      }

      if (files.length === 0) {
        throw new Error(
          `Не удалось получить результат задачи Kie.ai Imagen4: taskId=${taskId}`,
        );
      }

      console.log(
        `[Kie.ai Imagen4] Файлы сохранены: ${files.length} файлов`,
      );

      return files;
    },
  };
}
