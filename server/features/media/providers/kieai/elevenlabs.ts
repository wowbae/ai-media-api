// ElevenLabs Multilingual v2 провайдер через Kie.ai API
// Документация: https://docs.kie.ai/market/elevenlabs/text-to-speech-multilingual-v2
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
  KieAiElevenLabsRequest,
  KieAiStatusResponse,
  KieAiTaskStatus,
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
  completed: "done",
  done: "done",
  pending: "pending",
  processing: "processing",
  failed: "failed",
};

export function createKieAiElevenLabsProvider(
  config: KieAiConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  // Создание задачи на генерацию аудио
  async function createElevenLabsTask(
    params: GenerateParams,
  ): Promise<{ taskId: string; status: KieAiTaskStatus }> {
    console.log("[Kie.ai ElevenLabs] Создание задачи:", {
      prompt: params.prompt.substring(0, 100),
    });

    // Парсим настройки из params.settings (если передаются через JSON)
    // Пока используем значения по умолчанию, так как settings не поддерживается в GenerateParams
    const settings: {
      voice?: string;
      stability?: number;
      similarity_boost?: number;
      style?: number;
      speed?: number;
      timestamps?: boolean;
      previous_text?: string;
      next_text?: string;
      language_code?: string;
    } = {};

    // Формируем input объект согласно документации
    const input: KieAiElevenLabsRequest["input"] = {
      text: params.prompt,
      voice: settings.voice || "Rachel",
      stability: settings.stability ?? 0.5,
      similarity_boost: settings.similarity_boost ?? 0.75,
      style: settings.style ?? 0,
      speed: settings.speed ?? 1,
      timestamps: settings.timestamps ?? false,
      previous_text: settings.previous_text || "",
      next_text: settings.next_text || "",
      language_code: settings.language_code || "",
    };

    // Формируем тело запроса согласно документации
    const requestBody: KieAiElevenLabsRequest = {
      model: "elevenlabs/text-to-speech-multilingual-v2",
      callBackUrl: "", // Можно оставить пустым, если не используется callback
      input,
    };

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
      console.error("[Kie.ai ElevenLabs] Ошибка создания задачи:", {
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
        `Kie.ai ElevenLabs API error: ${response.status} - ${errorText}`,
      );
    }

    // API возвращает { code: 200, msg: "success", data: { taskId: "task_elevenlabs_..." } }
    const responseData = (await response.json()) as KieAiUnifiedCreateResponse;

    console.log("[Kie.ai ElevenLabs] Ответ от API:", {
      code: responseData.code,
      msg: responseData.msg,
      taskId: responseData.data?.taskId,
    });

    if (responseData.code !== 200) {
      throw new Error(
        `Kie.ai API вернул ошибку: ${responseData.code} - ${responseData.msg}`,
      );
    }

    if (!responseData.data?.taskId) {
      throw new Error(
        `Не удалось получить taskId от API. Ответ: ${JSON.stringify(responseData)}`,
      );
    }

    const taskId = responseData.data.taskId;

    console.log("[Kie.ai ElevenLabs] Задача создана:", { taskId });

    return {
      taskId,
      status: "pending",
    };
  }

  // Получение результата задачи
  async function getTaskResultFromAPI(
    taskId: string,
  ): Promise<KieAiStatusResponse> {
    if (!taskId || taskId === "undefined") {
      throw new Error(`Некорректный taskId: ${taskId}`);
    }

    console.log("[Kie.ai ElevenLabs] Проверка статуса задачи:", {
      taskId,
    });

    // Правильный эндпоинт согласно документации
    const url = `${baseURL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;

    console.log(`[Kie.ai ElevenLabs] Запрос к эндпоинту: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log(`[Kie.ai ElevenLabs] Ответ:`, {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(errorText);
      } catch {
        parsed = errorText;
      }
      console.error("[Kie.ai ElevenLabs] ❌ Ошибка API:", {
        taskId,
        status: response.status,
        error: parsed,
      });
      throw new Error(
        `Kie.ai ElevenLabs API error: ${response.status} - ${errorText}`,
      );
    }

    const apiResponse = (await response.json()) as {
      code: number;
      message: string;
      data: KieAiUnifiedTaskResponse["data"];
    };

    console.log("[Kie.ai ElevenLabs] Статус задачи:", {
      taskId,
      state: apiResponse.data?.state,
    });

    if (apiResponse.code !== 200) {
      throw new Error(
        `Kie.ai API вернул ошибку: ${apiResponse.code} - ${apiResponse.message}`,
      );
    }

    const taskData = apiResponse.data;

    // Маппинг state на наши статусы
    let status: KieAiTaskStatus;
    switch (taskData.state) {
      case "waiting":
      case "queuing":
        status = "pending";
        break;
      case "generating":
        status = "processing";
        break;
      case "success":
        status = "completed";
        break;
      case "fail":
        status = "failed";
        break;
      default:
        status = "pending";
    }

    // Парсим resultJson если задача завершена успешно
    let resultUrls: string[] = [];
    if (taskData.state === "success" && taskData.resultJson) {
      try {
        const resultData = JSON.parse(taskData.resultJson) as {
          resultUrls: string[];
        };
        resultUrls = resultData.resultUrls || [];
        console.log("[Kie.ai ElevenLabs] Распарсен resultJson:", resultUrls);
      } catch (error) {
        console.error("[Kie.ai ElevenLabs] Ошибка парсинга resultJson:", error);
      }
    }

    // Формируем ответ в старом формате для совместимости
    const responseResult: KieAiStatusResponse = {
      taskId: taskData.taskId,
      status,
      resultUrls,
      error: taskData.state === "fail" ? taskData.failMsg : undefined,
    };

    // Добавляем result.urls для удобства
    if (resultUrls.length > 0) {
      responseResult.result = {
        urls: resultUrls,
        url: resultUrls[0],
      };
    }

    return responseResult;
  }

  return {
    name: "kieai-elevenlabs",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createElevenLabsTask(params);

      // Маппим статус на внутренний формат
      const mappedStatus =
        KIEAI_STATUS_MAP[result.status ?? "pending"] || "pending";

      return {
        taskId: result.taskId,
        status: mappedStatus === "pending" ? "pending" : "processing",
      };
    },

    async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
      const result = await getTaskResultFromAPI(taskId);

      const mappedStatus = KIEAI_STATUS_MAP[result.status] || "pending";

      // Логируем ошибки при статусе failed
      if (result.status === "failed") {
        console.warn("[Kie.ai ElevenLabs] Задача завершилась с ошибкой:", {
          taskId,
          status: result.status,
          mappedStatus,
          error: result.error,
        });
      } else {
        console.log("[Kie.ai ElevenLabs] Статус задачи:", {
          taskId,
          status: result.status,
          mappedStatus,
          hasResult: !!result.result,
          error: result.error || undefined,
        });
      }

      // Получаем URL результата (может быть один или массив)
      const resultUrl =
        result.result?.url ||
        (result.result?.urls && result.result.urls[0]) ||
        undefined;

      console.log("[Kie.ai ElevenLabs] Извлеченный resultUrl:", resultUrl);

      return {
        status: mappedStatus,
        url: resultUrl,
        error: result.error || undefined,
      };
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      const result = await getTaskResultFromAPI(taskId);

      if (result.status !== "completed") {
        throw new Error(
          `Задача Kie.ai ElevenLabs не завершена: status=${result.status}, error=${result.error}`,
        );
      }

      const files: SavedFileInfo[] = [];
      const downloadedUrls = new Set<string>(); // Отслеживаем уже скачанные URL

      // Собираем все уникальные URL из разных источников
      const urlsToDownload: string[] = [];

      // 1. Проверяем result.result?.url
      if (result.result?.url) {
        urlsToDownload.push(result.result.url);
      }

      // 2. Проверяем result.result?.urls
      if (result.result?.urls && result.result.urls.length > 0) {
        urlsToDownload.push(...result.result.urls);
      }

      // 3. Проверяем resultUrls напрямую
      if (result.resultUrls && result.resultUrls.length > 0) {
        urlsToDownload.push(...result.resultUrls);
      }

      // Скачиваем только уникальные URL
      console.log(
        "[Kie.ai ElevenLabs] Всего URL найдено:",
        urlsToDownload.length,
      );

      for (const url of urlsToDownload) {
        if (!downloadedUrls.has(url)) {
          console.log("[Kie.ai ElevenLabs] Скачивание файла:", url);
          const savedFile = await saveFileFromUrl(url);
          files.push(savedFile);
          downloadedUrls.add(url);
        } else {
          console.log(
            "[Kie.ai ElevenLabs] ⏭️  URL уже скачан, пропускаем:",
            url,
          );
        }
      }

      if (files.length === 0) {
        console.error(
          "[Kie.ai ElevenLabs] ❌ Не найдено ни одного URL для скачивания. Полная структура:",
          JSON.stringify(result, null, 2),
        );
        throw new Error(
          `Не удалось получить результат задачи Kie.ai ElevenLabs: taskId=${taskId}`,
        );
      }

      console.log(`[Kie.ai ElevenLabs] Файлы сохранены: ${files.length} файлов`);

      return files;
    },
  };
}
