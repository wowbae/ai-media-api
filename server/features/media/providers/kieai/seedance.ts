// Seedance 1.5 Pro провайдер через Kie.ai API
// Документация: https://kie.ai/seedance-1-5-pro (Playground)
// API model: bytedance/seedance-1.5-pro — https://docs.kie.ai/market/bytedance/seedance-1.5-pro
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
  KieAiSeedanceTextToVideoRequest,
  KieAiSeedanceImageToVideoRequest,
  KieAiSeedanceAspectRatio,
  KieAiSeedanceDuration,
  KieAiSeedanceResolution,
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

// Маппинг соотношений сторон (только 9:16 и 16:9)
function mapSeedanceAspectRatio(
  aspectRatio?: "1:1" | "4:3" | "3:4" | "9:16" | "16:9" | "2:3" | "3:2" | "21:9",
): KieAiSeedanceAspectRatio {
  if (aspectRatio === "9:16") return "9:16";
  if (aspectRatio === "16:9") return "16:9";
  return "9:16"; // По умолчанию 9:16
}

// Маппинг длительности (4, 8, 12 секунд)
function mapSeedanceDuration(
  duration?: number,
): KieAiSeedanceDuration {
  if (duration === 4) return "4";
  if (duration === 8) return "8";
  if (duration === 12) return "12";
  return "4"; // По умолчанию 4 секунды (как в UI)
}

// Маппинг разрешения
function mapSeedanceResolution(
  videoQuality?: "480p" | "720p" | "1080p",
): KieAiSeedanceResolution {
  if (videoQuality === "480p") return "480p";
  if (videoQuality === "720p") return "720p";
  return "720p"; // По умолчанию 720p
}

export function createKieAiSeedanceProvider(
  config: KieAiConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  // Создание задачи на генерацию видео
  async function createSeedanceTask(
    params: GenerateParams,
  ): Promise<KieAiCreateResponse> {
    console.log("[Kie.ai Seedance 1.5 Pro] Создание задачи:", {
      prompt: params.prompt.substring(0, 100),
      hasInputFiles: !!(params.inputFiles && params.inputFiles.length > 0),
      aspectRatio: params.aspectRatio,
      duration: params.duration,
      videoQuality: params.videoQuality,
    });

    const isImageToVideo = params.inputFiles && params.inputFiles.length > 0;
    const duration = mapSeedanceDuration(params.duration);
    const aspectRatio = mapSeedanceAspectRatio(params.aspectRatio);
    const resolution = mapSeedanceResolution(params.videoQuality);

    console.log("[Kie.ai Seedance 1.5 Pro] Маппированные параметры:", {
      aspectRatio,
      duration,
      resolution,
    });

    // Одна модель для T2V и I2V (дока: https://docs.kie.ai/market/bytedance/seedance-1.5-pro)
    const model = "bytedance/seedance-1.5-pro";

    // Формируем input объект
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      aspect_ratio: aspectRatio,
      resolution,
      duration,
    };

    // Опциональные параметры
    if (params.sound !== undefined) {
      input.generate_audio = params.sound;
    }

    if (isImageToVideo) {
      // Image-to-Video режим - поддерживает до 2 изображений
      const inputImages = params.inputFiles!.slice(0, 2); // Максимум 2 изображения
      const imageUrls: string[] = [];

      for (const inputImage of inputImages) {
        // Если это data URL (base64) - загружаем на imgbb
        let imageUrl: string;
        if (inputImage.startsWith("data:")) {
          if (!isImgbbConfigured()) {
            throw new Error(
              "IMGBB_API_KEY не настроен. Для image-to-video нужен imgbb.",
            );
          }
          console.log(
            "[Kie.ai Seedance 1.5 Pro] Загрузка изображения на imgbb...",
          );
          imageUrl = await uploadToImgbb(inputImage);
        } else {
          // Уже URL - используем как есть
          imageUrl = inputImage;
        }
        imageUrls.push(imageUrl);
      }

      input.input_urls = imageUrls;
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
      console.error("[Kie.ai Seedance 1.5 Pro] Ошибка создания задачи:", {
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
        `Kie.ai Seedance 1.5 Pro API error: ${response.status} - ${errorText}`,
      );
    }

    // API возвращает { code: 200, msg: "success", data: { taskId: "task_seedance-1-5-pro_..." } }
    const responseData = (await response.json()) as {
      code: number;
      msg: string;
      data: {
        taskId: string;
      };
    };

    console.log("[Kie.ai Seedance 1.5 Pro] Ответ от API:", {
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

    console.log("[Kie.ai Seedance 1.5 Pro] Задача создана:", { taskId });

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

    console.log("[Kie.ai Seedance 1.5 Pro] Проверка статуса задачи:", {
      taskId,
    });

    // Правильный эндпоинт согласно документации
    const url = `${baseURL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;

    console.log(`[Kie.ai Seedance 1.5 Pro] Запрос к эндпоинту: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log(`[Kie.ai Seedance 1.5 Pro] Ответ:`, {
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
      console.error("[Kie.ai Seedance 1.5 Pro] ❌ Ошибка API:", {
        taskId,
        status: response.status,
        error: parsed,
      });
      throw new Error(
        `Kie.ai Seedance 1.5 Pro API error: ${response.status} - ${errorText}`,
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

    console.log("[Kie.ai Seedance 1.5 Pro] Статус задачи:", {
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
          resultUrls?: string[];
          resultUrl?: string;
          resultVideoUrl?: string;
        };

        // 1. Основной путь из документации Market API — массив resultUrls
        if (resultData.resultUrls && Array.isArray(resultData.resultUrls)) {
          resultUrls = resultData.resultUrls.filter(
            (url) => typeof url === "string" && url.length > 0,
          );
        }

        // 2. Fallback: одиночный resultUrl
        if (
          resultUrls.length === 0 &&
          typeof resultData.resultUrl === "string" &&
          resultData.resultUrl.length > 0
        ) {
          resultUrls = [resultData.resultUrl];
        }

        // 3. Fallback: поле resultVideoUrl (как в Aleph / других видео API)
        if (
          resultUrls.length === 0 &&
          typeof resultData.resultVideoUrl === "string" &&
          resultData.resultVideoUrl.length > 0
        ) {
          resultUrls = [resultData.resultVideoUrl];
        }

        if (resultUrls.length === 0) {
          console.warn(
            "[Kie.ai Seedance 1.5 Pro] Статус success, но resultUrls пустой. Ключи resultJson:",
            Object.keys(resultData),
          );
        } else {
          console.log(
            "[Kie.ai Seedance 1.5 Pro] Распарсен resultJson:",
            resultUrls,
          );
        }
      } catch (error) {
        console.error(
          "[Kie.ai Seedance 1.5 Pro] Ошибка парсинга resultJson:",
          {
            error: error instanceof Error ? error.message : error,
            resultJson: taskData.resultJson.substring(0, 200),
          },
        );
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
    name: "kieai-seedance",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createSeedanceTask(params);

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
        console.warn(
          "[Kie.ai Seedance 1.5 Pro] Задача завершилась с ошибкой:",
          {
            taskId,
            status: result.status,
            mappedStatus,
            error: result.error,
          },
        );
      } else {
        console.log("[Kie.ai Seedance 1.5 Pro] Статус задачи:", {
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

      console.log(
        "[Kie.ai Seedance 1.5 Pro] Извлеченный resultUrl:",
        resultUrl,
      );

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
          `Задача Kie.ai Seedance 1.5 Pro не завершена: status=${result.status}, error=${result.error}`,
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
        "[Kie.ai Seedance 1.5 Pro] Всего URL найдено:",
        urlsToDownload.length,
      );

      for (const url of urlsToDownload) {
        if (!downloadedUrls.has(url)) {
          console.log("[Kie.ai Seedance 1.5 Pro] Скачивание файла:", url);
          const savedFile = await saveFileFromUrl(url);
          files.push(savedFile);
          downloadedUrls.add(url);
        } else {
          console.log(
            "[Kie.ai Seedance 1.5 Pro] ⏭️  URL уже скачан, пропускаем:",
            url,
          );
        }
      }

      if (files.length === 0) {
        console.error(
          "[Kie.ai Seedance 1.5 Pro] ❌ Не найдено ни одного URL для скачивания. Полная структура:",
          JSON.stringify(result, null, 2),
        );
        throw new Error(
          `Не удалось получить результат задачи Kie.ai Seedance 1.5 Pro: taskId=${taskId}`,
        );
      }

      console.log(
        `[Kie.ai Seedance 1.5 Pro] Файлы сохранены: ${files.length} файлов`,
      );

      return files;
    },
  };
}
