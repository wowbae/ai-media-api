// Хук для работы с файлами в chat-input
import { useState, useRef, useCallback } from 'react';
import { useUploadToImgbbMutation } from '@/redux/media-api';

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

export function useChatInputFiles() {
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadToImgbb] = useUploadToImgbbMutation();
    // Ref для отслеживания всех созданных preview URLs для очистки при размонтировании
    const previewUrlsRef = useRef<Set<string>>(new Set());

    // Обработка файлов (общая функция для переиспользования)
    const processFiles = useCallback(
        async (files: File[]): Promise<AttachedFile[]> => {
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

                // Проверяем размер (макс 10MB)
                if (file.size > 10 * 1024 * 1024) {
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

            return newFiles;
        },
        [uploadToImgbb]
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

    // Обработка выбора файлов из input
    const handleFileSelect = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files) return;

            const newFiles = await processFiles(Array.from(files));
            setAttachedFiles((prev) => [...prev, ...newFiles]);

            // Сбрасываем input
            if (event.target) {
                event.target.value = '';
            }
        },
        [processFiles]
    );

    // Добавление файла из URL
    const addFileFromUrl = useCallback(
        async (url: string, filename: string) => {
            try {
                // Загружаем файл по URL и обрабатываем через processFiles
                // (который автоматически загрузит изображения на imgbb)
                const file = await urlToFile(url, filename);
                const processedFiles = await processFiles([file]);
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

            const newFiles = await processFiles(files);
            if (newFiles.length > 0) {
                setAttachedFiles((prev) => [...prev, ...newFiles]);
            }
        },
        [processFiles]
    );

    // Обработчик paste из буфера обмена
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

            const newFiles = await processFiles(files);
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
