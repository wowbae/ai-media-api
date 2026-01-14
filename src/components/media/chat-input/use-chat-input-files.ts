// Хук для работы с файлами в chat-input
import { useState, useRef, useCallback } from 'react';
import { useUploadToImgbbMutation, useUploadUserMediaMutation } from '@/redux/media-api';

export interface AttachedFile {
    id: string;
    file: File;
    preview: string;
    imgbbUrl?: string; // URL на imgbb для изображений (загружается при добавлении)
}

// Конвертация файла в base64
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
    });
}

export function useChatInputFiles(chatId?: number) {
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadToImgbb] = useUploadToImgbbMutation();
    const [uploadUserMedia] = useUploadUserMediaMutation();
    // Ref для отслеживания всех созданных preview URLs для очистки при размонтировании
    const previewUrlsRef = useRef<Set<string>>(new Set());

    // Обработка файлов (общая функция для переиспользования)
    const processFiles = useCallback(
        async (files: File[], shouldUpload: boolean = false, skipSizeCheck: boolean = false): Promise<AttachedFile[]> => {
            const newFiles: AttachedFile[] = [];
            const imageFiles: File[] = [];
            const videoFiles: File[] = [];

            // Разделяем файлы на изображения и видео
            for (const file of files) {
                // Проверяем тип файла (только изображения и видео)
                if (
                    !file.type.startsWith('image/') &&
                    !file.type.startsWith('video/')
                ) {
                    console.warn(
                        '[ChatInput] Пропущен файл недопустимого типа:',
                        file.type
                    );
                    continue;
                }

                // Проверяем размер (макс 10MB) - только для новых файлов, не для уже существующих в системе
                if (!skipSizeCheck && file.size > 10 * 1024 * 1024) {
                    alert(
                        `Размер файла "${file.name}" не должен превышать 10MB`
                    );
                    continue;
                }

                if (file.type.startsWith('image/')) {
                    imageFiles.push(file);
                } else {
                    videoFiles.push(file);
                }
            }

            // Создаем preview URL для всех файлов
            for (const file of [...imageFiles, ...videoFiles]) {
                try {
                    const preview = URL.createObjectURL(file);
                    previewUrlsRef.current.add(preview);

                    newFiles.push({
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        file,
                        preview,
                    });
                } catch (error) {
                    console.error(
                        '[ChatInput] Ошибка обработки файла:',
                        file.name,
                        error
                    );
                    alert(`Не удалось обработать файл "${file.name}"`);
                }
            }

            // Загружаем изображения на imgbb параллельно
            if (imageFiles.length > 0) {
                try {
                    // Конвертируем изображения в base64 для загрузки на imgbb
                    const base64Images = await Promise.all(
                        imageFiles.map((file) => fileToBase64(file))
                    );

                    console.log(
                        '[ChatInput] Загрузка изображений на imgbb...',
                        { count: imageFiles.length }
                    );

                    const result = await uploadToImgbb({
                        files: base64Images,
                    }).unwrap();

                    // Связываем загруженные URL с файлами
                    let imageIndex = 0;
                    for (let i = 0; i < newFiles.length; i++) {
                        if (newFiles[i].file.type.startsWith('image/')) {
                            if (result.urls[imageIndex]) {
                                newFiles[i].imgbbUrl = result.urls[imageIndex];
                                imageIndex++;
                            }
                        }
                    }

                    console.log(
                        '[ChatInput] ✅ Изображения загружены на imgbb:',
                        { uploaded: result.uploaded, total: result.total }
                    );
                } catch (error) {
                    console.error(
                        '[ChatInput] ❌ Ошибка загрузки изображений на imgbb:',
                        error
                    );
                    // Не прерываем процесс, просто не будет imgbbUrl
                    // Файлы можно будет использовать с base64 (fallback)
                }
            }

            // Загружаем файлы в БД и в ai-media (только если это новый пользовательский файл)
            if (shouldUpload && chatId && newFiles.length > 0) {
                try {
                    const uploadFiles = await Promise.all(
                        newFiles.map(async (f) => ({
                            base64: await fileToBase64(f.file),
                            mimeType: f.file.type,
                            filename: f.file.name,
                        }))
                    );

                    console.log(`[ChatInput] Загрузка ${uploadFiles.length} файлов в БД (ai-media)...`);
                    const result = await uploadUserMedia({
                        chatId,
                        files: uploadFiles,
                    }).unwrap();

                    console.log('[ChatInput] ✅ Файлы успешно сохранены в БД и ai-media');

                    // Обновляем attachedFiles с полученными URL (чтобы при отправке промпта не загружать заново)
                    if (result && result.files) {
                        setAttachedFiles(prev => {
                            const updated = [...prev];
                            // Сопоставляем по имени файла (лучшее что у нас есть)
                            result.files.forEach(serverFile => {
                                const localFileIndex = updated.findIndex(
                                    f => f.file.name === serverFile.filename && !f.imgbbUrl
                                );
                                if (localFileIndex !== -1 && serverFile.url) {
                                    updated[localFileIndex] = {
                                        ...updated[localFileIndex],
                                        imgbbUrl: serverFile.url
                                    };
                                }
                            });
                            return updated;
                        });
                    }
                } catch (error) {
                    console.error('[ChatInput] ❌ Ошибка сохранения файлов в БД:', error);
                }
            }

            return newFiles;
        },
        [uploadToImgbb, uploadUserMedia, chatId]
    );

    // Загрузка файла по URL и конвертация в File объект
    const urlToFile = useCallback(
        async (url: string, filename: string): Promise<File> => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Ошибка загрузки файла');
            }
            const blob = await response.blob();
            return new File([blob], filename, { type: blob.type });
        },
        []
    );

    // Обработка выбора файлов из input (РУЧНОЙ ВЫБОР)
    const handleFileSelect = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files) return;

            const newFiles = await processFiles(Array.from(files), true); // true = upload to DB
            setAttachedFiles((prev) => [...prev, ...newFiles]);

            // Сбрасываем input
            if (event.target) {
                event.target.value = '';
            }
        },
        [processFiles]
    );

    // Добавление файла из URL (ПРОГРАММНОЕ - НЕ СОХРАНЯЕМ В БД ТАК КАК ЭТО УЖЕ ЕСТЬ В СИСТЕМЕ)
    const addFileFromUrl = useCallback(
        async (url: string, filename: string, imgbbUrl?: string) => {
            try {
                // Если передан imgbbUrl для изображения, используем его напрямую без загрузки на imgbb
                // Проверяем, что это изображение (imgbb не поддерживает видео)
                const isImage = filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                               url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                               url.includes('i.ibb.co') || // imgbb URL
                               url.includes('i.imgbb.com'); // imgbb URL

                if (imgbbUrl && isImage) {
                    console.log('[ChatInput] ✅ Используем imgbbUrl из БД, пропускаем повторную загрузку на imgbb:', imgbbUrl);

                    // Для превью используем оригинальный URL (локальный путь или imgbb URL)
                    // Не создаем blob URL, чтобы не загружать файл
                    const preview = url;

                    // Создаем минимальный File объект для совместимости (не загружаем файл)
                    // Используем пустой blob с правильным MIME типом
                    const mimeType = filename.match(/\.png$/i) ? 'image/png' :
                                   filename.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                                   filename.match(/\.gif$/i) ? 'image/gif' :
                                   filename.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg';
                    const emptyBlob = new Blob([], { type: mimeType });
                    const file = new File([emptyBlob], filename, { type: mimeType });

                    const attachedFile: AttachedFile = {
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        file,
                        preview,
                        imgbbUrl, // Используем URL из БД напрямую, не загружаем на imgbb
                    };

                    setAttachedFiles((prev) => [...prev, attachedFile]);
                    return;
                }

                // Для остальных случаев загружаем файл по URL и обрабатываем через processFiles
                // (который автоматически загрузит изображения на imgbb, если imgbbUrl не передан)
                // skipSizeCheck = true, так как это уже существующий файл в системе, мы прикрепляем только ссылку
                const file = await urlToFile(url, filename);
                const processedFiles = await processFiles([file], false, true); // false = DON'T upload to DB again, true = skip size check
                setAttachedFiles((prev) => [...prev, ...processedFiles]);
            } catch (error) {
                console.error(
                    '[ChatInput] Ошибка прикрепления файла:',
                    error
                );
                alert('Не удалось прикрепить файл');
            }
        },
        [urlToFile, processFiles]
    );

    // Удаление прикрепленного файла
    const removeFile = useCallback((fileId: string) => {
        setAttachedFiles((prev) => {
            const file = prev.find((f) => f.id === fileId);
            if (file) {
                URL.revokeObjectURL(file.preview);
                // Удаляем URL из ref
                previewUrlsRef.current.delete(file.preview);
            }
            return prev.filter((f) => f.id !== fileId);
        });
    }, []);

    // Обработчики drag-and-drop
    const handleDragOver = useCallback(
        (event: React.DragEvent<HTMLDivElement>, isDisabled: boolean) => {
            event.preventDefault();
            event.stopPropagation();
            if (!isDisabled) {
                setIsDragging(true);
            }
        },
        []
    );

    const handleDragLeave = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            // Проверяем, что relatedTarget находится вне текущего элемента
            const currentTarget = event.currentTarget;
            const relatedTarget = event.relatedTarget as Node | null;
            if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
                setIsDragging(false);
            }
        },
        []
    );

    const handleDrop = useCallback(
        async (
            event: React.DragEvent<HTMLDivElement>,
            isDisabled: boolean
        ) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);

            if (isDisabled) return;

            const files = Array.from(event.dataTransfer.files);
            if (files.length === 0) return;

            const newFiles = await processFiles(files, true); // true = upload to DB
            if (newFiles.length > 0) {
                setAttachedFiles((prev) => [...prev, ...newFiles]);
            }
        },
        [processFiles]
    );

    // Обработчик paste из буфера обмена (РУЧНОЙ ВЫБОР)
    const handlePaste = useCallback(
        async (event: React.ClipboardEvent<HTMLTextAreaElement>, isDisabled: boolean) => {
            if (isDisabled) return;

            const items = event.clipboardData.items;
            if (!items) return;

            const files: File[] = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                // Проверяем только файлы (не текст)
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) {
                        files.push(file);
                    }
                }
            }

            if (files.length === 0) return;

            // Предотвращаем вставку текста, если есть файлы
            event.preventDefault();

            const newFiles = await processFiles(files, true); // true = upload to DB
            if (newFiles.length > 0) {
                setAttachedFiles((prev) => [...prev, ...newFiles]);
            }
        },
        [processFiles]
    );

    // Очистка всех preview URLs
    const cleanup = useCallback(() => {
        previewUrlsRef.current.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        previewUrlsRef.current.clear();
    }, []);

    // Очистка файлов
    const clearFiles = useCallback(() => {
        setAttachedFiles((prev) => {
            prev.forEach((f) => {
                URL.revokeObjectURL(f.preview);
                previewUrlsRef.current.delete(f.preview);
            });
            return [];
        });
    }, []);

    // Конвертация файла в base64 (для отправки)
    const getFileAsBase64 = useCallback(
        async (file: File): Promise<string> => {
            return fileToBase64(file);
        },
        []
    );

    return {
        attachedFiles,
        setAttachedFiles,
        isDragging,
        processFiles,
        handleFileSelect,
        addFileFromUrl,
        removeFile,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste,
        cleanup,
        clearFiles,
        getFileAsBase64,
    };
}
