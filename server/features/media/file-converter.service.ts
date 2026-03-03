// Сервис конвертации файлов: base64 → URL (postimages.org и др.)
import { uploadMultipleToImgbb } from "./imgbb.service";
import { saveBase64File } from "./file.service";
import { getMediaPublicBaseUrl } from "./config";

export interface VideoConversionResult {
  processedVideoFiles: string[];
  convertedCount: number;
}

export interface FileConversionResult {
  /** Обработанные файлы (URL для изображений, base64 для видео) */
  processedFiles: string[];
  /** Количество сконвертированных файлов */
  convertedCount: number;
}

/**
 * Конвертировать base64 файлы в URL
 * Изображения загружаются на хостинг, видео остаются как base64
 */
export async function convertBase64FilesToUrls(
  inputFiles?: string[]
): Promise<FileConversionResult> {
  if (!inputFiles || inputFiles.length === 0) {
    return { processedFiles: [], convertedCount: 0 };
  }

  // Находим base64 файлы
  const base64Files = inputFiles.filter(
    (file) =>
      file.startsWith('data:image') ||
      file.startsWith('data:video')
  );

  if (base64Files.length === 0) {
    return { processedFiles: inputFiles, convertedCount: 0 };
  }

  // Разделяем на изображения и видео
  const imageFiles = base64Files.filter((file) =>
    file.startsWith('data:image')
  );
  const videoFiles = base64Files.filter((file) =>
    file.startsWith('data:video')
  );

  let processedFiles = [...inputFiles];
  let convertedCount = 0;

  if (imageFiles.length > 0) {
    try {
      const urls = await uploadMultipleToImgbb(imageFiles);
      
      // Заменяем base64 на URL
      let urlIndex = 0;
      let successCount = 0;
      processedFiles = inputFiles.map((file) => {
        if (file.startsWith('data:image')) {
          const url = urls[urlIndex++];
          if (url && url.trim() !== '') {
            successCount++;
            convertedCount++;
            return url;
          }
          return file; // Fallback на base64 если загрузка не удалась
        }
        return file;
      });

      console.log(
        `[FileConverter] ✅ Конвертировано ${successCount} из ${imageFiles.length} base64 изображений в URL`
      );
    } catch (error) {
      console.error(
        '[FileConverter] ❌ Ошибка конвертации base64 в URL (используем исходные файлы):',
        error
      );
      // Продолжаем с исходными файлами (base64)
    }
  }

  // Видео остаются как base64
  if (videoFiles.length > 0) {
    console.log(
      `[FileConverter] ℹ️ Видео файлы (${videoFiles.length}) остаются как base64 (imgbb их не поддерживает)`
    );
  }

  return { processedFiles, convertedCount };
}

/**
 * Конвертировать base64 видео в публичные URL (сохраняем на сервер)
 */
export async function convertVideoFilesToUrls(
  inputVideoFiles?: string[]
): Promise<VideoConversionResult> {
  if (!inputVideoFiles || inputVideoFiles.length === 0) {
    return { processedVideoFiles: [], convertedCount: 0 };
  }

  const baseUrl = getMediaPublicBaseUrl();
  const processed: string[] = [];
  let convertedCount = 0;

  for (const item of inputVideoFiles) {
    if (item.startsWith("http://") || item.startsWith("https://")) {
      processed.push(item);
      continue;
    }
    // Путь (относительный) — преобразуем в полный URL
    if (!item.startsWith("data:")) {
      const cleanPath = item.replace(/^\/+/, "");
      processed.push(`${baseUrl}/media-files/${cleanPath}`);
      continue;
    }
    // base64 — сохраняем на сервер
    if (item.startsWith("data:video/")) {
      try {
        const mimeMatch = item.match(/^data:(video\/[^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "video/mp4";
        const base64Clean = item.replace(/^data:.*?;base64,/, "");
        const saved = await saveBase64File(base64Clean, mimeType);
        if (saved.path) {
          processed.push(`${baseUrl}/media-files/${saved.path}`);
          convertedCount++;
        } else {
          processed.push(item);
        }
      } catch (err) {
        console.error("[FileConverter] Ошибка сохранения видео:", err);
        processed.push(item);
      }
    } else {
      processed.push(item);
    }
  }

  return { processedVideoFiles: processed, convertedCount };
}
