// Wavespeed провайдер для работы с моделями через Wavespeed AI API
// Документация: https://wavespeed.ai/docs
import wavespeed from "wavespeed";
import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import { WAVESPEED_STATUS_MAP } from "./interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import { uploadToImgbb, isImgbbConfigured } from "../../imgbb.service";
import type { WavespeedConfig } from "./interfaces";

export function createWavespeedProvider(
  config: WavespeedConfig,
): MediaProvider {
  const { apiKey } = config;

  // Устанавливаем API ключ для SDK
  // SDK wavespeed использует переменную окружения WAVESPEED_API_KEY
  if (typeof process !== "undefined") {
    process.env.WAVESPEED_API_KEY = apiKey;
  }

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
    if (duration && duration >= 3 && duration <= 10) {
      return duration;
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

      // Подготавливаем изображения: конвертируем base64 в URL если нужно
      const imageUrls: string[] = [];
      for (const image of referenceImages) {
        if (image.startsWith("data:")) {
          // Base64 изображение - загружаем на imgbb
          if (!isImgbbConfigured()) {
            throw new Error(
              "IMGBB_API_KEY не настроен. Для reference-to-video нужен imgbb для загрузки изображений.",
            );
          }
          console.log("[Wavespeed] Загрузка изображения на imgbb...");
          const url = await uploadToImgbb(image);
          imageUrls.push(url);
        } else if (image.startsWith("http")) {
          // Уже URL - используем как есть
          imageUrls.push(image);
        } else {
          console.warn(
            "[Wavespeed] Неизвестный формат изображения, пропускаем:",
            image.substring(0, 50),
          );
        }
      }

      if (imageUrls.length === 0) {
        throw new Error(
          "Не удалось подготовить reference images для Wavespeed",
        );
      }

      // Формируем параметры запроса
      const duration = mapDuration(params.duration);
      const aspectRatio = mapAspectRatio(params.aspectRatio);

      const requestParams: Record<string, unknown> = {
        prompt: params.prompt,
        images: imageUrls,
        duration: duration,
      };

      if (aspectRatio) {
        requestParams.aspect_ratio = aspectRatio;
      }

      try {
        // Вызываем SDK wavespeed
        // SDK автоматически обрабатывает async режим с polling
        const modelId = "kwaivgi/kling-video-o1-std/reference-to-video";

        console.log("[Wavespeed] Вызов модели:", {
          modelId,
          promptLength: params.prompt.length,
          imagesCount: imageUrls.length,
          duration,
          aspectRatio,
        });

        // Используем SDK с опциями для async режима
        const response = await wavespeed.run(modelId, requestParams, {
          timeout: 36000.0, // 10 часов максимум
          pollInterval: 1.0, // Проверка каждую секунду
          enableSyncMode: false, // Async режим с polling
        });

        console.log("[Wavespeed] Ответ от SDK:", {
          hasOutputs: !!response.outputs,
          outputsCount: response.outputs?.length || 0,
          taskId: response.taskId,
        });

        // SDK возвращает результат напрямую в async режиме
        // Если есть outputs - задача завершена
        if (response.outputs && response.outputs.length > 0) {
          // Задача уже завершена, сохраняем файлы
          const files: SavedFileInfo[] = [];
          for (const outputUrl of response.outputs) {
            if (outputUrl && typeof outputUrl === "string") {
              console.log("[Wavespeed] Скачивание видео:", outputUrl);
              const savedFile = await saveFileFromUrl(outputUrl);
              files.push(savedFile);
            }
          }

          if (files.length === 0) {
            throw new Error(
              "Wavespeed вернул пустой результат (нет выходных файлов)",
            );
          }

          // Создаем taskId и сохраняем результат в кеш
          const taskId = `wavespeed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          taskResultsCache.set(taskId, files);

          console.log("[Wavespeed] Задача завершена, результат сохранен в кеш:", {
            taskId,
            filesCount: files.length,
          });

          return {
            taskId,
            status: "processing", // Вернем processing, но результат уже готов
          };
        }

        // Если есть taskId - задача в процессе
        if (response.taskId) {
          return {
            taskId: response.taskId,
            status: "pending",
          };
        }

        throw new Error(
          "Wavespeed не вернул ни outputs, ни taskId. Неизвестный формат ответа.",
        );
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

      // SDK wavespeed не предоставляет отдельный метод для проверки статуса
      // В async режиме SDK сам делает polling и возвращает результат
      // Поэтому здесь мы можем только вернуть статус "processing"
      // Реальный статус будет получен через getTaskResult

      return {
        status: "processing",
      };
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      console.log("[Wavespeed] Получение результата задачи:", { taskId });

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

      // Если результата нет в кеше, значит задача еще не завершена
      // SDK wavespeed в async режиме уже должен был вернуть результат в generate()
      throw new Error(
        `Результат задачи ${taskId} не найден. Возможно, задача еще не завершена или результат был удален из кеша.`,
      );
    },
  };
}
