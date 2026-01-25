// Wavespeed провайдер для работы с моделями через Wavespeed AI REST API
// Документация: https://wavespeed.ai/docs/rest-api
import { Client } from "wavespeed";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import { WAVESPEED_STATUS_MAP } from "./interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import type { WavespeedConfig, WavespeedSubmitResponse, WavespeedResultResponse } from "./interfaces";

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";

export function createWavespeedProvider(
  config: WavespeedConfig,
): MediaProvider {
  const { apiKey } = config;

  // Используем SDK только для загрузки файлов (client.upload())
  const client = new Client(apiKey);

  // Кеш для хранения результатов задач
  // Ключ: taskId, значение: массив SavedFileInfo
  const taskResultsCache = new Map<string, SavedFileInfo[]>();

  // Маппинг aspect ratio для Wavespeed
  function mapAspectRatio(
    aspectRatio?: "1:1" | "4:3" | "3:4" | "9:16" | "16:9" | "2:3" | "3:2" | "21:9",
  ): string | undefined {
    if (!aspectRatio) return undefined;
    // Wavespeed может использовать формат "16:9" или "16/9"
    return aspectRatio;
  }

  // Маппинг длительности (от 3 до 10 секунд)
  function mapDuration(duration?: number): number {
    // Преобразуем в число, если пришло как строка
    const numDuration = typeof duration === 'string' ? parseInt(duration, 10) : duration;
    
    if (numDuration && !isNaN(numDuration) && numDuration >= 3 && numDuration <= 10) {
      return numDuration;
    }
    
    // Логируем, если значение невалидно
    if (duration !== undefined) {
      console.warn(
        `[Wavespeed] Невалидная длительность: ${duration} (тип: ${typeof duration}), используем значение по умолчанию: 5`,
      );
    }
    
    return 5; // По умолчанию 5 секунд
  }

  return {
    name: "wavespeed",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      console.log("[Wavespeed] Создание задачи:", {
        prompt: params.prompt.substring(0, 100),
        hasInputFiles: !!(params.inputFiles && params.inputFiles.length > 0),
        duration: params.duration,
      });

      // Модель требует reference images для reference-to-video режима
      if (!params.inputFiles || params.inputFiles.length === 0) {
        throw new Error(
          "Wavespeed Kling Video O1 требует reference images для работы",
        );
      }

      // Ограничение: до 10 reference images
      const referenceImages = params.inputFiles.slice(0, 10);

      // Подготавливаем изображения: загружаем через SDK wavespeed.upload()
      // SDK требует путь к файлу, поэтому сохраняем во временные файлы
      const imageUrls: string[] = [];
      const tempFiles: string[] = []; // Для очистки временных файлов

      try {
        for (let i = 0; i < referenceImages.length; i++) {
          const image = referenceImages[i];
          let tempFilePath: string;
          let imageUrl: string;

          if (image.startsWith("data:")) {
            // Base64 изображение - сохраняем во временный файл
            const [header, base64Data] = image.split(",");
            const mimeMatch = header.match(/data:([^;]+)/);
            const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
            const extension = mimeType.split("/")[1] || "png";
            const buffer = Buffer.from(base64Data, "base64");

            // Сохраняем во временный файл
            tempFilePath = join(
              tmpdir(),
              `wavespeed-${Date.now()}-${i}.${extension}`,
            );
            await writeFile(tempFilePath, buffer);

            console.log("[Wavespeed] Загрузка изображения через SDK upload...");
            // SDK upload() принимает путь к файлу
            imageUrl = await client.upload(tempFilePath);
            imageUrls.push(imageUrl);
            tempFiles.push(tempFilePath);
          } else if (image.startsWith("http")) {
            // URL изображение - скачиваем с retry логикой
            console.log("[Wavespeed] Скачивание изображения с URL...");
            
            // Функция для скачивания с retry
            const downloadImageWithRetry = async (
              url: string,
              maxRetries = 3,
              retryDelay = 1000,
            ): Promise<Buffer> => {
              let lastError: Error | null = null;
              
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
                  
                  const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (compatible; WavespeedSDK/1.0)',
                    },
                  });
                  
                  clearTimeout(timeoutId);
                  
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                  }
                  
                  const arrayBuffer = await response.arrayBuffer();
                  return Buffer.from(arrayBuffer);
                } catch (error) {
                  lastError = error instanceof Error ? error : new Error(String(error));
                  
                  if (attempt < maxRetries) {
                    const delay = retryDelay * attempt; // Экспоненциальная задержка
                    console.warn(
                      `[Wavespeed] Попытка ${attempt}/${maxRetries} не удалась, повтор через ${delay}ms:`,
                      lastError.message,
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                  }
                }
              }
              
              throw new Error(
                `Не удалось скачать изображение после ${maxRetries} попыток: ${lastError?.message || "Unknown error"}`,
              );
            };
            
            const buffer = await downloadImageWithRetry(image);
            const contentType = "image/jpeg"; // По умолчанию, т.к. imgbb обычно возвращает jpeg
            const extension = "jpg";

            // Сохраняем во временный файл
            tempFilePath = join(
              tmpdir(),
              `wavespeed-${Date.now()}-${i}.${extension}`,
            );
            await writeFile(tempFilePath, buffer);

            imageUrl = await client.upload(tempFilePath);
            imageUrls.push(imageUrl);
            tempFiles.push(tempFilePath);
          } else {
            console.warn(
              "[Wavespeed] Неизвестный формат изображения, пропускаем:",
              image.substring(0, 50),
            );
          }
        }

        // Очищаем временные файлы после загрузки
        for (const tempFile of tempFiles) {
          try {
            await unlink(tempFile);
          } catch (error) {
            console.warn("[Wavespeed] Не удалось удалить временный файл:", tempFile);
          }
        }
      } catch (error) {
        // Очищаем временные файлы в случае ошибки
        for (const tempFile of tempFiles) {
          try {
            await unlink(tempFile);
          } catch {
            // Игнорируем ошибки удаления
          }
        }
        console.error("[Wavespeed] Ошибка при загрузке изображений:", error);
        throw new Error(
          `Не удалось загрузить изображения через Wavespeed SDK: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (imageUrls.length === 0) {
        throw new Error(
          "Не удалось подготовить reference images для Wavespeed",
        );
      }

      // Формируем параметры запроса
      console.log("[Wavespeed] Полученный duration из params:", {
        duration: params.duration,
        type: typeof params.duration,
      });
      
      const duration = mapDuration(params.duration);
      const aspectRatio = mapAspectRatio(params.aspectRatio);
      
      console.log("[Wavespeed] Маппированная duration:", duration);

      const requestParams: Record<string, unknown> = {
        prompt: params.prompt,
        images: imageUrls,
        duration: duration,
      };

      // ВАЖНО: Модель kwaivgi/kling-video-o1-std/reference-to-video НЕ поддерживает параметр aspect_ratio
      // Согласно документации API (https://wavespeed.ai/models/kwaivgi/kling-video-o1-std/reference-to-video),
      // поддерживаемые параметры: prompt, video (optional), images, keep_original_sound, duration
      // Модель определяет aspect ratio автоматически на основе reference images
      if (aspectRatio) {
        console.warn(
          `[Wavespeed] Параметр aspect_ratio (${aspectRatio}) передан, но модель не поддерживает его. ` +
          `Модель определит aspect ratio автоматически на основе reference images.`
        );
      }

      // Логируем полные параметры запроса для отладки
      console.log("[Wavespeed] Параметры запроса к REST API:", JSON.stringify(requestParams, null, 2));

      try {
        // Используем REST API напрямую вместо SDK
        const modelId = "kwaivgi/kling-video-o1-std/reference-to-video";
        const submitUrl = `${WAVESPEED_API_BASE}/${modelId}`;

        console.log("[Wavespeed] Создание задачи через REST API:", {
          url: submitUrl,
          modelId,
          promptLength: params.prompt.length,
          imagesCount: imageUrls.length,
          duration,
          aspectRatioRequested: aspectRatio, // Только для информации, не передается в API
        });

        // POST запрос для создания задачи
        const submitResponse = await fetch(submitUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestParams),
        });

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          console.error("[Wavespeed] Ошибка создания задачи:", {
            status: submitResponse.status,
            statusText: submitResponse.statusText,
            error: errorText,
          });

          if (submitResponse.status === 401) {
            throw new Error("Ошибка авторизации Wavespeed API. Проверьте WAVESPEED_AI_API_KEY.");
          }
          if (submitResponse.status === 402 || submitResponse.status === 403) {
            throw new Error("Недостаточно средств на балансе Wavespeed");
          }

          throw new Error(
            `Wavespeed API вернул ошибку ${submitResponse.status}: ${errorText}`
          );
        }

        const submitData = await submitResponse.json() as WavespeedSubmitResponse;
        
        console.log("[Wavespeed] Ответ от REST API (создание задачи):", JSON.stringify(submitData, null, 2));

        // Проверяем структуру ответа
        if (!submitData.data || !submitData.data.id) {
          console.error("[Wavespeed] КРИТИЧЕСКАЯ ОШИБКА: REST API не вернул id в ответе!");
          console.error("[Wavespeed] Полный ответ:", JSON.stringify(submitData, null, 2));
          throw new Error(
            `Wavespeed REST API не вернул task id. Структура ответа: ${JSON.stringify(submitData)}`
          );
        }

        const taskId = submitData.data.id;
        const status = submitData.data.status || "created";

        console.log("[Wavespeed] Задача создана:", {
          taskId,
          status,
          taskIdFormat: taskId.match(/^[0-9a-f]{32}$/i) ? "hex-32" : "other",
        });

        return {
          taskId,
          status: WAVESPEED_STATUS_MAP[status] || "pending",
        };
      } catch (error) {
        console.error("[Wavespeed] Ошибка при создании задачи:", error);
        if (error instanceof Error) {
          // Обработка типичных ошибок
          if (error.message.includes("401") || error.message.includes("unauthorized")) {
            throw new Error("Ошибка авторизации Wavespeed API. Проверьте WAVESPEED_AI_API_KEY.");
          }
          if (error.message.includes("402") || error.message.includes("403") || error.message.includes("insufficient")) {
            throw new Error("Недостаточно средств на балансе Wavespeed");
          }
        }
        throw error;
      }
    },

    async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
      console.log("[Wavespeed] Проверка статуса задачи:", { taskId });

      // Проверяем формат taskId - должен быть hex-32 или другой валидный формат от API
      // Старые локально сгенерированные taskId (например, "wavespeed-1769350920857-@vesbme") не работают
      if (taskId.startsWith("wavespeed-") && taskId.includes("-")) {
        console.error(
          `[Wavespeed] ОБНАРУЖЕН СТАРЫЙ ФОРМАТ taskId: ${taskId}. ` +
          `Этот taskId был сгенерирован локально и не существует в Wavespeed API. ` +
          `Задача не может быть проверена. Возможно, нужно пересоздать задачу.`
        );
        throw new Error(
          `Некорректный формат taskId: ${taskId}. ` +
          `Этот taskId был сгенерирован локально и не существует в Wavespeed API. ` +
          `Правильный формат taskId должен быть получен от API (например: "088b5273b8f84fe0b0a313dcde55475d").`
        );
      }

      try {
        // GET запрос для проверки статуса
        // Согласно документации: GET https://api.wavespeed.ai/api/v3/predictions/{task-id}
        const resultUrl = `${WAVESPEED_API_BASE}/predictions/${taskId}`;
        
        console.log("[Wavespeed] Запрос статуса:", { url: resultUrl, taskId });

        const response = await fetch(resultUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Wavespeed] Ошибка проверки статуса:", {
            status: response.status,
            statusText: response.statusText,
            url: resultUrl,
            taskId,
            error: errorText,
          });
          
          // Если 404 - это означает, что задача не найдена (возможно, старый формат taskId)
          if (response.status === 404) {
            throw new Error(
              `Задача с ID "${taskId}" не найдена в Wavespeed API (404). ` +
              `Возможно, используется некорректный формат taskId или задача была удалена. ` +
              `Правильный формат taskId должен быть получен от API при создании задачи.`
            );
          }
          
          throw new Error(
            `Wavespeed API вернул ошибку ${response.status}: ${errorText}`
          );
        }

        const resultData = await response.json() as WavespeedResultResponse;
        
        console.log("[Wavespeed] Статус задачи:", {
          taskId,
          status: resultData.data?.status,
        });

        if (!resultData.data) {
          throw new Error("Wavespeed API не вернул data в ответе");
        }

        const apiStatus = resultData.data.status || "processing";
        const mappedStatus = WAVESPEED_STATUS_MAP[apiStatus] || "processing";

        // Если задача завершена, сохраняем результаты в кеш
        if (apiStatus === "completed" && resultData.data.outputs && resultData.data.outputs.length > 0) {
          const files: SavedFileInfo[] = [];
          for (const outputUrl of resultData.data.outputs) {
            if (outputUrl && typeof outputUrl === "string") {
              console.log("[Wavespeed] Скачивание видео:", outputUrl);
              const savedFile = await saveFileFromUrl(outputUrl);
              files.push(savedFile);
            }
          }

          if (files.length > 0) {
            taskResultsCache.set(taskId, files);
            console.log("[Wavespeed] Результаты сохранены в кеш:", {
              taskId,
              filesCount: files.length,
            });
          }
        }

        // Если задача провалилась
        if (apiStatus === "failed") {
          const errorMessage = resultData.data.error || "Неизвестная ошибка";
          throw new Error(`Wavespeed задача провалилась: ${errorMessage}`);
        }

        return {
          status: mappedStatus,
        };
      } catch (error) {
        console.error("[Wavespeed] Ошибка при проверке статуса:", error);
        throw error;
      }
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      console.log("[Wavespeed] Получение результата задачи:", { taskId });

      // Проверяем формат taskId
      if (taskId.startsWith("wavespeed-") && taskId.includes("-")) {
        console.error(
          `[Wavespeed] ОБНАРУЖЕН СТАРЫЙ ФОРМАТ taskId: ${taskId}. ` +
          `Этот taskId был сгенерирован локально и не существует в Wavespeed API.`
        );
        throw new Error(
          `Некорректный формат taskId: ${taskId}. ` +
          `Этот taskId был сгенерирован локально и не существует в Wavespeed API. ` +
          `Правильный формат taskId должен быть получен от API.`
        );
      }

      // Проверяем кеш результатов
      const cachedResult = taskResultsCache.get(taskId);
      if (cachedResult) {
        console.log("[Wavespeed] Результат найден в кеше:", {
          taskId,
          filesCount: cachedResult.length,
        });
        // Удаляем из кеша после получения
        taskResultsCache.delete(taskId);
        return cachedResult;
      }

      // Если результата нет в кеше, проверяем через API
      try {
        const resultUrl = `${WAVESPEED_API_BASE}/predictions/${taskId}`;
        
        console.log("[Wavespeed] Запрос результата:", { url: resultUrl, taskId });

        const response = await fetch(resultUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Wavespeed] Ошибка получения результата:", {
            status: response.status,
            statusText: response.statusText,
            url: resultUrl,
            taskId,
            error: errorText,
          });
          
          if (response.status === 404) {
            throw new Error(
              `Задача с ID "${taskId}" не найдена в Wavespeed API (404). ` +
              `Возможно, используется некорректный формат taskId или задача была удалена.`
            );
          }
          
          throw new Error(`Wavespeed API вернул ошибку ${response.status}: ${errorText}`);
        }

        const resultData = await response.json() as WavespeedResultResponse;

        if (!resultData.data) {
          throw new Error("Wavespeed API не вернул data в ответе");
        }

        // Если задача еще не завершена
        if (resultData.data.status !== "completed") {
          throw new Error(
            `Задача еще не завершена. Текущий статус: ${resultData.data.status}`
          );
        }

        // Если задача завершена, но outputs нет
        if (!resultData.data.outputs || resultData.data.outputs.length === 0) {
          throw new Error("Wavespeed вернул пустой результат (нет выходных файлов)");
        }

        // Скачиваем и сохраняем файлы
        const files: SavedFileInfo[] = [];
        for (const outputUrl of resultData.data.outputs) {
          if (outputUrl && typeof outputUrl === "string") {
            console.log("[Wavespeed] Скачивание видео:", outputUrl);
            const savedFile = await saveFileFromUrl(outputUrl);
            files.push(savedFile);
          }
        }

        if (files.length === 0) {
          throw new Error("Не удалось скачать результаты");
        }

        return files;
      } catch (error) {
        console.error("[Wavespeed] Ошибка при получении результата:", error);
        throw error;
      }
    },
  };
}
