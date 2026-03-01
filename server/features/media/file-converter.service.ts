// Сервис для конвертации файлов: base64 → URL (imgbb)
// Используется для обработки входных файлов перед генерацией
import { isImgbbConfigured, uploadMultipleToImgbb } from "./imgbb.service";

export interface FileConversionResult {
  /** Обработанные файлы (URL для изображений, base64 для видео) */
  processedFiles: string[];
  /** Количество сконвертированных файлов */
  convertedCount: number;
}

/**
 * Конвертировать base64 файлы в URL
 * Изображения загружаются на imgbb, видео остаются как base64
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

  // Загружаем изображения на imgbb
  if (imageFiles.length > 0 && isImgbbConfigured()) {
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

  // Видео остаются как base64 (imgbb их не поддерживает)
  if (videoFiles.length > 0) {
    console.log(
      `[FileConverter] ℹ️ Видео файлы (${videoFiles.length}) остаются как base64 (imgbb их не поддерживает)`
    );
  }

  return { processedFiles, convertedCount };
}
