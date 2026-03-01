// Re-export: загрузка изображений через node-upload-images (postimages.org и др.)
// Анонимно, без API ключей. Сохранён старый нейминг для совместимости.
export {
  uploadToImgbb,
  uploadMultipleToImgbb,
  isImgbbConfigured,
  uploadImageFilesToImgbb,
  uploadFilesToImgbbAndUpdateDatabase,
} from './image-upload.service';
