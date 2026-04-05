// LaoZhang провайдер для работы с моделями через LaoZhang API
// Используется для Nano Banana Pro (изображения), Sora 2 и Veo 3.1 (видео)
// Все модели работают по async-схеме с использованием временного хранилища
import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import { PROVIDER_STATUS_MAP } from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveBase64File, saveFileFromUrl } from "../../file.service";
import { MEDIA_MODELS } from "../../config";
import type { MediaModelConfig } from "../../config";
import { createTask, completeTask, failTask, getTaskStatus, getTaskResult, updateTaskStatus } from "../task-storage.utils";
import type {
  LaoZhangConfig,
  LaoZhangMessage,
  LaoZhangContent,
  LaoZhangImageResponse,
  LaoZhangVideoCreateResponse,
  AspectRatio,
  Quality,
  LaoZhangGoogleNativeRequest,
  LaoZhangGoogleNativeResponse,
  GoogleNativePart,
} from "./interfaces";
import { getLaoZhangModelMapping } from "./payload-mapping";
import { validateLaoZhangPayload } from "./preflight-validation";

// Создание сообщения в формате LaoZhang (OpenAI-совместимый)
function createLaoZhangMessage(
  prompt: string,
  inputImages?: string[],
): LaoZhangMessage[] {
  const content: LaoZhangContent[] = [{ type: "text", text: prompt }];

  if (inputImages && inputImages.length > 0) {
    for (const imageUrl of inputImages) {
      content.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
    }
  }

  return [{ role: "user", content }];
}

// Создание запроса в формате Google Native Format для Nano Banana Pro
function createGoogleNativeRequest(
  prompt: string,
  inputImages?: string[],
  aspectRatio?: "16:9" | "9:16",
  quality?: "2K" | "4K",
): LaoZhangGoogleNativeRequest {
  const parts: GoogleNativePart[] = [{ text: prompt }];

  // Добавляем изображения для multi-image reference
  if (inputImages && inputImages.length > 0) {
    for (const imageData of inputImages) {
      let base64Data: string;
      let mimeType = "image/jpeg";

      // Если это data URL, извлекаем base64 и mime type
      if (imageData.startsWith("data:")) {
        const [header, data] = imageData.split(",");
        base64Data = data;
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      } else if (imageData.startsWith("http")) {
        // Для URL-изображений нужно будет загрузить и конвертировать
        // Пока пропускаем, но можно добавить загрузку
        console.warn(
          "[LaoZhang] URL изображения для multi-image reference не поддерживаются напрямую",
        );
        continue;
      } else {
        // Уже base64 без префикса
        base64Data = imageData;
      }

      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }
  }

  const request: LaoZhangGoogleNativeRequest = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {},
    },
  };

  // Добавляем aspect ratio если указан
  if (aspectRatio) {
    request.generationConfig!.imageConfig!.aspectRatio = aspectRatio;
  }

  // Добавляем image size если указано качество (2K или 4K с большой буквы)
  if (quality) {
    request.generationConfig!.imageConfig!.imageSize = quality.toUpperCase() as
      | "2K"
      | "4K";
  }

  return request;
}

// Парсинг ответа от Google Native Format API
async function parseGoogleNativeResponse(
  data: LaoZhangGoogleNativeResponse,
): Promise<SavedFileInfo[]> {
  const files: SavedFileInfo[] = [];

  try {
    console.log("[LaoZhang] Парсинг Google Native Format ответа");

    const candidates = data.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];

      for (const part of parts) {
        // Изображение в inlineData
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          const base64 = part.inlineData.data;
          const savedFile = await saveBase64File(base64, mimeType, {
          deferImgbb: true,
        });
          files.push(savedFile);
        }
      }
    }

    console.log(
      `[LaoZhang] ✅ Найдено ${files.length} изображений в Google Native Format`,
    );
  } catch (error) {
    console.error(
      "[LaoZhang] ❌ Ошибка парсинга Google Native Format ответа:",
      error,
    );
  }

  return files;
}

// Парсинг ответа от Nano Banana Pro (OpenAI-совместимый формат)
async function parseImageResponse(
  data: LaoZhangImageResponse,
): Promise<SavedFileInfo[]> {
  const files: SavedFileInfo[] = [];

  try {
    console.log("[LaoZhang] Парсинг ответа изображения");

    const choices = data.choices || [];

    for (const choice of choices) {
      const message = choice.message;
      const images = message?.images;

      // Изображения в message.images массиве
      if (Array.isArray(images) && images.length > 0) {
        console.log(`[LaoZhang] ✅ Найдено ${images.length} изображений`);
        for (const image of images) {
          const imageUrl = image?.image_url?.url;

          if (imageUrl) {
            if (imageUrl.startsWith("data:image")) {
              const [header, base64] = imageUrl.split(",");
              const mimeMatch = header.match(/data:([^;]+)/);
              const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
              const savedFile = await saveBase64File(base64, mimeType, {
          deferImgbb: true,
        });
              files.push(savedFile);
            } else if (imageUrl.startsWith("http")) {
              const savedFile = await saveFileFromUrl(imageUrl);
              files.push(savedFile);
            }
          }
        }
        continue;
      }

      // Fallback: изображение в content как URL или base64
      const content = message?.content;
      if (typeof content === "string") {
        if (content.startsWith("data:image")) {
          const [header, base64] = content.split(",");
          const mimeMatch = header.match(/data:([^;]+)/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
          const savedFile = await saveBase64File(base64, mimeType, {
          deferImgbb: true,
        });
          files.push(savedFile);
        } else if (content.startsWith("http")) {
          const savedFile = await saveFileFromUrl(content);
          files.push(savedFile);
        }
      }
    }
  } catch (error) {
    console.error("[LaoZhang] ❌ Ошибка парсинга изображения:", error);
  }

  return files;
}

// Вспомогательная функция для расчёта разрешения
function calculateResolution(
  aspectRatio?: AspectRatio,
  quality?: Quality,
): string | null {
  if (!quality) return null;

  let width: number;
  let height: number;

  if (aspectRatio === "9:16") {
    if (quality === "1K") {
      width = 1024;
      height = 1820;
    } else if (quality === "2K") {
      width = 2048;
      height = 3640;
    } else {
      width = 4096;
      height = 7280;
    }
  } else if (aspectRatio === "16:9") {
    if (quality === "1K") {
      width = 1820;
      height = 1024;
    } else if (quality === "2K") {
      width = 3640;
      height = 2048;
    } else {
      width = 7280;
      height = 4096;
    }
  } else {
    // 1:1 по умолчанию
    if (quality === "1K") {
      width = 1024;
      height = 1024;
    } else if (quality === "2K") {
      width = 2048;
      height = 2048;
    } else {
      width = 4096;
      height = 4096;
    }
  }

  return `${width}x${height}`;
}

// Функция для парсинга ошибок LaoZhang API
function parseLaoZhangError(
  errorText: string,
  modelConfig?: MediaModelConfig,
  statusCode?: number,
): string {
  try {
    const errorData = JSON.parse(errorText);

    if (errorData.error?.message) {
      const apiMessage = errorData.error.message;

      // Ошибка отсутствия доступных каналов (может быть из-за баланса, настроек группы, недоступности модели)
      if (apiMessage.includes("无可用渠道") || apiMessage.includes("无可用")) {
        const modelInfo = modelConfig
          ? `Модель ${modelConfig.name} (${modelConfig.id})`
          : "Модель";

        return (
          `❌ ${modelInfo} недоступна.\n\n` +
          `Возможные причины:\n` +
          `• Недостаточно баланса на аккаунте LaoZhang\n` +
          `• Модель не доступна в группе "default"\n` +
          `• Не настроены каналы с требуемыми режимами оплаты\n` +
          `• Модель временно недоступна\n\n` +
          `💡 Рекомендации:\n` +
          `• Проверьте баланс в личном кабинете LaoZhang: https://console.laozhang.ai\n` +
          `• Попробуйте другую модель (например, Veo 3.1)\n` +
          `• Проверьте настройки группы и каналов в консоли`
        );
      }

      // Ошибки, связанные с балансом
      if (
        apiMessage.includes("余额") ||
        apiMessage.includes("余额不足") ||
        apiMessage.includes("insufficient") ||
        apiMessage.includes("balance")
      ) {
        return (
          `❌ Недостаточно средств на балансе аккаунта LaoZhang.\n\n` +
          `💡 Пополните баланс в личном кабинете: https://console.laozhang.ai`
        );
      }

      // Ошибки режима оплаты
      if (apiMessage.includes("计费模式") || apiMessage.includes("billing")) {
        const modelInfo = modelConfig ? modelConfig.name : "модели";
        return (
          `❌ Проблема с режимом оплаты для ${modelInfo}.\n\n` +
          `Возможные причины:\n` +
          `• Не настроены каналы с требуемыми режимами оплаты\n` +
          `• Недостаточно баланса для выбранного режима\n\n` +
          `💡 Проверьте настройки биллинга в консоли LaoZhang`
        );
      }

      // Ошибки модели
      if (apiMessage.includes("模型") || apiMessage.includes("model")) {
        const modelInfo = modelConfig ? modelConfig.name : "модели";
        return `❌ Ошибка модели: ${apiMessage}\n\n${modelInfo} недоступна или не настроена.`;
      }

      // Ошибка группы
      if (apiMessage.includes("分组") || apiMessage.includes("group")) {
        return (
          `❌ Проблема с группой "default".\n\n` +
          `💡 Проверьте настройки группы в консоли LaoZhang или обратитесь в поддержку.`
        );
      }

      // Общая ошибка API с оригинальным сообщением
      return `❌ LaoZhang API error: ${apiMessage}`;
    }

    // Если структура ошибки другая
    return `❌ LaoZhang API error: ${statusCode || "unknown"} - ${errorText}`;
  } catch {
    // Если не удалось распарсить JSON
    // Проверяем по тексту на типичные ошибки
    const lowerError = errorText.toLowerCase();
    if (lowerError.includes("balance") || lowerError.includes("insufficient")) {
      return (
        `❌ Недостаточно средств на балансе аккаунта LaoZhang.\n\n` +
        `💡 Пополните баланс в личном кабинете: https://console.laozhang.ai`
      );
    }

    return `❌ LaoZhang API error: ${statusCode || "unknown"} - ${errorText}`;
  }
}

// Провайдер для изображений (синхронный) - Nano Banana Pro
export function createLaoZhangImageProvider(
  config: LaoZhangConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  return {
    name: "laozhang-image",
    isAsync: false,

    async generate(params: GenerateParams): Promise<SavedFileInfo[]> {
      const modelConfig = MEDIA_MODELS[params.model as string];
      if (!modelConfig || modelConfig.provider !== "laozhang") {
        throw new Error(`Модель ${params.model} не поддерживается LaoZhang`);
      }

      // Определяем, используем ли Google Native Format для NANO_BANANA_PRO_LAOZHANG
      const isNanoBananaPro = params.model === "NANO_BANANA_PRO_LAOZHANG";

      console.log("[LaoZhang Image] 🚀 Генерация:", {
        requestId: params.requestId,
        model: params.model,
        prompt: params.prompt.substring(0, 50),
        format: isNanoBananaPro ? "Google Native" : "OpenAI Compatible",
      });

      // Валидация промпта
      const promptLimit = modelConfig.promptLimit ?? 5000;
      if (params.prompt.length > promptLimit) {
        throw new Error(
          `Промпт превышает максимальную длину ${promptLimit} символов`,
        );
      }

      // Для NANO_BANANA_PRO_LAOZHANG используем Google Native Format
      if (isNanoBananaPro) {
        // Преобразуем quality: 2k -> 2K, 4k -> 4K
        const quality = params.quality
          ? (params.quality.toUpperCase() as "2K" | "4K")
          : undefined;

        // Преобразуем aspect ratio для Google Native Format
        const aspectRatio = params.aspectRatio as "16:9" | "9:16" | undefined;

        const requestBody = createGoogleNativeRequest(
          params.prompt,
          params.inputFiles,
          aspectRatio,
          quality,
        );
        const mapping = getLaoZhangModelMapping(params.model);
        const payloadFamily = mapping?.payloadFamily || "google_native_image";
        const preflight = validateLaoZhangPayload(
          params.model,
          payloadFamily,
          requestBody as unknown,
        );
        if (!preflight.success) {
          throw new Error(
            `[LaoZhang preflight] ${params.model} payload invalid: ${preflight.errors
              .map((e) => `${e.field}: ${e.message}`)
              .join("; ")}`,
          );
        }

        console.log("[LaoZhang Image] Отправка Google Native Format запроса:", {
          model: modelConfig.id,
          aspectRatio,
          imageSize: quality,
          hasInputImages: !!(params.inputFiles && params.inputFiles.length > 0),
        });

        const endpoint = `${baseURL}/v1beta/models/${modelConfig.id}:generateContent`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.text();
          const errorMessage = parseLaoZhangError(
            errorData,
            modelConfig,
            response.status,
          );
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as LaoZhangGoogleNativeResponse;
        const savedFiles = await parseGoogleNativeResponse(data);

        // Удаляем дубликаты
        const uniqueFiles = savedFiles.filter(
          (file, index, self) =>
            index === self.findIndex((f) => f.path === file.path),
        );

        if (uniqueFiles.length === 0) {
          throw new Error(
            "Не удалось извлечь файлы из ответа API. Проверьте структуру ответа.",
          );
        }

        console.log(
          `[LaoZhang Image] ✅ Генерация завершена: ${uniqueFiles.length} файлов`,
        );

        return uniqueFiles;
      }

      // Для других моделей используем OpenAI-совместимый формат
      const messages = createLaoZhangMessage(params.prompt, params.inputFiles);

      // Формируем тело запроса
      const requestBody: Record<string, unknown> = {
        model: modelConfig.id,
        messages,
        modalities: ["image", "text"],
      };
      {
        const mapping = getLaoZhangModelMapping(params.model);
        const payloadFamily = mapping?.payloadFamily || "openai_compatible_chat";
        const preflight = validateLaoZhangPayload(
          params.model,
          payloadFamily,
          requestBody,
        );
        if (!preflight.success) {
          throw new Error(
            `[LaoZhang preflight] ${params.model} payload invalid: ${preflight.errors
              .map((e) => `${e.field}: ${e.message}`)
              .join("; ")}`,
          );
        }
      }

      if (params.aspectRatio) {
        requestBody.aspect_ratio = params.aspectRatio;
      }

      if (params.quality) {
        const resolution = calculateResolution(
          params.aspectRatio as AspectRatio,
          params.quality.toUpperCase() as Quality,
        );
        if (resolution) {
          requestBody.resolution = resolution;
        }
      }

      console.log("[LaoZhang Image] Отправка запроса:", {
        model: modelConfig.id,
        messagesCount: messages.length,
      });

      const response = await fetch(`${baseURL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        const errorMessage = parseLaoZhangError(
          errorData,
          modelConfig,
          response.status,
        );
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as LaoZhangImageResponse;
      const savedFiles = await parseImageResponse(data);

      // Удаляем дубликаты
      const uniqueFiles = savedFiles.filter(
        (file, index, self) =>
          index === self.findIndex((f) => f.path === file.path),
      );

      if (uniqueFiles.length === 0) {
        throw new Error(
          "Не удалось извлечь файлы из ответа API. Проверьте структуру ответа.",
        );
      }

      console.log(
        `[LaoZhang Image] ✅ Генерация завершена: ${uniqueFiles.length} файлов`,
      );

      return uniqueFiles;
    },
  };
}

// Провайдер для видео (асинхронный) - Sora 2, Veo 3.1
export function createLaoZhangVideoProvider(
  config: LaoZhangConfig,
): MediaProvider {
  const { apiKey, baseURL } = config;

  // Хранилище task_id для отслеживания статуса
  const taskIdMap = new Map<string, string>();

  async function createVideoTask(
    params: GenerateParams,
  ): Promise<{ taskId: string; status: "pending" | "processing" }> {
    const modelConfig = MEDIA_MODELS[params.model as string];
    if (!modelConfig || modelConfig.provider !== "laozhang") {
      throw new Error(`Модель ${params.model} не поддерживается LaoZhang`);
    }

    const messages = createLaoZhangMessage(params.prompt, params.inputFiles);

    const requestBody: Record<string, unknown> = {
      model: modelConfig.id,
      messages,
    };

    // Добавляем aspect_ratio для видео
    // Для Veo используем ar, для других моделей aspectRatio
    if (modelConfig.id === "veo-3.1-720p-async" && params.ar) {
      requestBody.ar = params.ar;
    } else if (params.aspectRatio) {
      requestBody.aspect_ratio = params.aspectRatio;
    }

    console.log("[LaoZhang Video] Создание задачи:", {
      model: modelConfig.id,
      prompt: params.prompt.substring(0, 50),
      hasImages: !!(params.inputFiles && params.inputFiles.length > 0),
    });

    const response = await fetch(`${baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = parseLaoZhangError(
        errorText,
        modelConfig,
        response.status,
      );
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as LaoZhangVideoCreateResponse;

    // Извлекаем task_id из ответа
    let taskId = data.task_id || data.id;

    // Пытаемся извлечь task_id из content, если он там
    if (!taskId && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      const taskIdMatch = content.match(/task_id[:\s]*([a-zA-Z0-9_-]+)/i);
      if (taskIdMatch) {
        taskId = taskIdMatch[1];
      }
    }

    if (!taskId) {
      throw new Error("Не удалось получить task_id от API");
    }

    console.log("[LaoZhang Video] Задача создана:", {
      taskId,
    });

    return {
      taskId,
      status: "pending",
    };
  }

  async function checkVideoStatus(taskId: string): Promise<TaskStatusResult> {
    const response = await fetch(`${baseURL}/v1/video/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ task_id: taskId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Для checkVideoStatus modelConfig недоступен, но ошибка все равно будет информативной
      const errorMessage = parseLaoZhangError(
        errorText,
        undefined,
        response.status,
      );
      throw new Error(errorMessage);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;

    // Маппинг статусов
    let status: TaskStatusResult["status"] = "pending";
    if (data.status === "completed" || data.status === "done") {
      status = "done";
    } else if (data.status === "processing") {
      status = "processing";
    } else if (data.status === "failed") {
      status = "failed";
    }

    console.log("[LaoZhang Video] Статус задачи:", {
      taskId,
      status: data.status,
      mappedStatus: status,
      hasUrl: !!data.result?.url,
    });

    return {
      status,
      url: data.result?.url || undefined,
      error: data.error || undefined,
    };
  }

  return {
    name: "laozhang-video",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createVideoTask(params);

      return {
        taskId: result.taskId,
        status: result.status,
      };
    },

    async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
      return await checkVideoStatus(taskId);
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      const status = await checkVideoStatus(taskId);

      if (status.status !== "done" || !status.url) {
        throw new Error(`Задача не завершена: status=${status.status}`);
      }

      console.log("[LaoZhang Video] Скачивание результата:", {
        taskId,
        url: status.url,
      });

      // Скачиваем и сохраняем файл
      const savedFile = await saveFileFromUrl(status.url);

      console.log("[LaoZhang Video] Файл сохранён:", savedFile.filename);

      return [savedFile];
    },
  };
}

// Универсальный провайдер, который определяет тип модели и делегирует нужному
export function createLaoZhangProvider(config: LaoZhangConfig): MediaProvider {
  const imageProvider = createLaoZhangImageProvider(config);
  const videoProvider = createLaoZhangVideoProvider(config);

  return {
    name: "laozhang",
    isAsync: true, // Общий провайдер считается async, так как видео модели async

    async generate(
      params: GenerateParams,
    ): Promise<SavedFileInfo[] | TaskCreatedResult> {
      const modelConfig = MEDIA_MODELS[params.model as string];
      if (!modelConfig) {
        throw new Error(`Неизвестная модель: ${params.model}`);
      }

      // Для изображений - синхронный запрос
      if (modelConfig.types.includes("IMAGE")) {
        return await imageProvider.generate(params);
      }

      // Для видео - асинхронный запрос
      return await videoProvider.generate(params);
    },

    async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
      // Только для видео провайдера
      return await videoProvider.checkTaskStatus!(taskId);
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      // Только для видео провайдера
      return await videoProvider.getTaskResult!(taskId);
    },
  };
}
