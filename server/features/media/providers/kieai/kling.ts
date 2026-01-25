// Kling 2.6 провайдер через Kie.ai API
// Документация: https://kie.ai/kling-2-6
import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import { PROVIDER_STATUS_MAP } from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import { uploadToImgbb, isImgbbConfigured } from "../../imgbb.service";
import type {
  KieAiConfig,
  KieAiCreateResponse,
  KieAiStatusResponse,
  KieAiTaskStatus,
  KieAiKlingTextToVideoRequest,
  KieAiKlingImageToVideoRequest,
  KieAiKlingAspectRatio,
  KieAiKlingDuration,
  KieAiTaskDetailResponse,
  KieAiResultJson,
} from "./interfaces";

// Маппинг статусов Kie.ai на внутренние статусы
const KIEAI_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
  pending: "pending",
  processing: "processing",
  completed: "done",
  done: "done",
  failed: "failed",
  success: "done", // Новый статус от API
};

// Маппинг соотношений сторон
function mapKlingAspectRatio(
  aspectRatio?: "1:1" | "4:3" | "3:4" | "9:16" | "16:9" | "2:3" | "3:2" | "21:9",
): KieAiKlingAspectRatio {
  if (aspectRatio === "9:16") return "9:16";
  if (aspectRatio === "16:9") return "16:9";
  return "1:1"; // По умолчанию
}

// Маппинг длительности
function mapKlingDuration(duration?: number): KieAiKlingDuration {
  if (duration === 10) return "10";
  return "5"; // По умолчанию 5 секунд
}

export function createKieAiKlingProvider(config: KieAiConfig): MediaProvider {
  const { apiKey, baseURL } = config;

  // Создание задачи на генерацию видео
  async function createKlingTask(
    params: GenerateParams,
  ): Promise<KieAiCreateResponse> {
    console.log("[Kie.ai Kling 2.6] Создание задачи:", {
      prompt: params.prompt.substring(0, 100),
      hasInputFiles: !!(params.inputFiles && params.inputFiles.length > 0),
    });

    const isImageToVideo = params.inputFiles && params.inputFiles.length > 0;
    const duration = mapKlingDuration(params.duration);
    const sound = params.sound ?? true; // По умолчанию звук включен

    // Формируем модель в зависимости от типа запроса
    const model = isImageToVideo
      ? "kling-2.6/image-to-video"
      : "kling-2.6/text-to-video";

    // Формируем input объект
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      sound,
      duration,
    };

    if (isImageToVideo) {
      // Image-to-Video режим
      const inputImage = params.inputFiles![0];

      // Если это data URL (base64) - загружаем на imgbb
      let imageUrl: string;
      if (inputImage.startsWith("data:")) {
        if (!isImgbbConfigured()) {
          throw new Error(
            "IMGBB_API_KEY не настроен. Для image-to-video нужен imgbb.",
          );
        }
        console.log("[Kie.ai Kling 2.6] Загрузка изображения на imgbb...");
        imageUrl = await uploadToImgbb(inputImage);
      } else {
        // Уже URL - используем как есть
        imageUrl = inputImage;
      }

      input.image_urls = [imageUrl];
    } else {
      // Text-to-Video режим
      const aspectRatio = mapKlingAspectRatio(params.aspectRatio);
      input.aspect_ratio = aspectRatio;
    }

    // Формируем тело запроса согласно документации
    const requestBody = {
      model,
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
      console.error("[Kie.ai Kling 2.6] Ошибка создания задачи:", {
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
        `Kie.ai Kling 2.6 API error: ${response.status} - ${errorText}`,
      );
    }

    // API возвращает { code: 200, msg: "success", data: { taskId: "task_kling-2.6_..." } }
    const responseData = (await response.json()) as {
      code: number;
      msg: string;
      data: {
        taskId: string;
      };
    };

    console.log("[Kie.ai Kling 2.6] Ответ от API:", {
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

    console.log("[Kie.ai Kling 2.6] Задача создана:", { taskId });

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

    console.log("[Kie.ai Kling 2.6] Проверка статуса задачи:", {
      taskId,
    });

    // Правильный эндпоинт согласно документации
    const url = `${baseURL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;

    console.log(`[Kie.ai Kling 2.6] Запрос к эндпоинту: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log(`[Kie.ai Kling 2.6] Ответ:`, {
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
      console.error("[Kie.ai Kling 2.6] ❌ Ошибка API:", {
        taskId,
        status: response.status,
        error: parsed,
      });
      throw new Error(
        `Kie.ai Kling 2.6 API error: ${response.status} - ${errorText}`,
      );
    }

    const apiResponse = (await response.json()) as {
      code: number;
      message: string;
      data: {
        taskId: string;
        model: string;
        state: "waiting" | "queuing" | "generating" | "success" | "fail";
        param: string;
        resultJson: string;
        failCode: string;
        failMsg: string;
        completeTime: number;
        createTime: number;
        updateTime: number;
      };
    };

    console.log("[Kie.ai Kling 2.6] Статус задачи:", {
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
        console.log("[Kie.ai Kling 2.6] Распарсен resultJson:", resultUrls);
      } catch (error) {
        console.error("[Kie.ai Kling 2.6] Ошибка парсинга resultJson:", error);
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
    name: "kieai-kling",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createKlingTask(params);

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

      // Подробное логирование структуры результата
      console.log(
        "[Kie.ai Kling 2.6] ========== СТРУКТУРА РЕЗУЛЬТАТА (checkTaskStatus) ==========",
      );
      console.log(
        "[Kie.ai Kling 2.6] Полный объект result:",
        JSON.stringify(result, null, 2),
      );
      console.log("[Kie.ai Kling 2.6] Тип result:", typeof result);
      if (result && typeof result === "object") {
        console.log("[Kie.ai Kling 2.6] Ключи в result:", Object.keys(result));
        console.log("[Kie.ai Kling 2.6] result.status:", result.status);
        console.log("[Kie.ai Kling 2.6] result.taskId:", result.taskId);
        console.log(
          "[Kie.ai Kling 2.6] result.errorMessage:",
          result.errorMessage,
        );
        console.log("[Kie.ai Kling 2.6] result.errorCode:", result.errorCode);
        console.log(
          "[Kie.ai Kling 2.6] result.successFlag:",
          result.successFlag,
        );
        console.log(
          "[Kie.ai Kling 2.6] result.resultInfoJson:",
          result.resultInfoJson,
        );
        console.log("[Kie.ai Kling 2.6] result.resultUrls:", result.resultUrls);
        if (result.result) {
          console.log(
            "[Kie.ai Kling 2.6] result.result:",
            JSON.stringify(result.result, null, 2),
          );
          console.log(
            "[Kie.ai Kling 2.6] result.result.url:",
            (result.result as { url?: string }).url,
          );
          console.log(
            "[Kie.ai Kling 2.6] result.result.urls:",
            (result.result as { urls?: string[] }).urls,
          );
        }
      }
      console.log(
        "[Kie.ai Kling 2.6] ================================================================",
      );

      const mappedStatus = KIEAI_STATUS_MAP[result.status] || "pending";

      // Логируем ошибки при статусе failed
      if (result.status === "failed") {
        console.warn("[Kie.ai Kling 2.6] Задача завершилась с ошибкой:", {
          taskId,
          status: result.status,
          mappedStatus,
          error: result.error,
        });
      } else {
        console.log("[Kie.ai Kling 2.6] Статус задачи:", {
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

      console.log("[Kie.ai Kling 2.6] Извлеченный resultUrl:", resultUrl);

      return {
        status: mappedStatus,
        url: resultUrl,
        error: result.error || undefined,
      };
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      const result = await getTaskResultFromAPI(taskId);

      // Подробное логирование структуры результата перед обработкой
      console.log(
        "[Kie.ai Kling 2.6] ========== СТРУКТУРА РЕЗУЛЬТАТА (getTaskResult) ==========",
      );
      console.log(
        "[Kie.ai Kling 2.6] Полный объект result:",
        JSON.stringify(result, null, 2),
      );
      console.log("[Kie.ai Kling 2.6] result.status:", result.status);
      console.log("[Kie.ai Kling 2.6] result.taskId:", result.taskId);
      console.log(
        "[Kie.ai Kling 2.6] result.resultInfoJson:",
        JSON.stringify(result.resultInfoJson, null, 2),
      );
      console.log("[Kie.ai Kling 2.6] result.resultUrls:", result.resultUrls);
      console.log(
        "[Kie.ai Kling 2.6] result.result:",
        JSON.stringify(result.result, null, 2),
      );
      if (result.result) {
        console.log(
          "[Kie.ai Kling 2.6] result.result.url:",
          (result.result as { url?: string }).url,
        );
        console.log(
          "[Kie.ai Kling 2.6] result.result.urls:",
          (result.result as { urls?: string[] }).urls,
        );
      }
      console.log(
        "[Kie.ai Kling 2.6] ================================================================",
      );

      if (result.status !== "completed") {
        throw new Error(
          `Задача Kie.ai Kling 2.6 не завершена: status=${result.status}, error=${result.error}`,
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

      // 4. Проверяем resultInfoJson (старый формат для совместимости)
      if (
        result.resultInfoJson?.resultUrls &&
        result.resultInfoJson.resultUrls.length > 0
      ) {
        for (const item of result.resultInfoJson.resultUrls) {
          if (item.resultUrl) {
            urlsToDownload.push(item.resultUrl);
          }
        }
      }

      // Скачиваем только уникальные URL
      console.log(
        "[Kie.ai Kling 2.6] Всего URL найдено:",
        urlsToDownload.length,
      );

      for (const url of urlsToDownload) {
        if (!downloadedUrls.has(url)) {
          console.log("[Kie.ai Kling 2.6] Скачивание файла:", url);
          const savedFile = await saveFileFromUrl(url);
          files.push(savedFile);
          downloadedUrls.add(url);
        } else {
          console.log(
            "[Kie.ai Kling 2.6] ⏭️  URL уже скачан, пропускаем:",
            url,
          );
        }
      }

      if (files.length === 0) {
        console.error(
          "[Kie.ai Kling 2.6] ❌ Не найдено ни одного URL для скачивания. Полная структура:",
          JSON.stringify(result, null, 2),
        );
        throw new Error(
          `Не удалось получить результат задачи Kie.ai Kling 2.6: taskId=${taskId}`,
        );
      }

      console.log(`[Kie.ai Kling 2.6] Файлы сохранены: ${files.length} файлов`);

      return files;
    },
  };
}
