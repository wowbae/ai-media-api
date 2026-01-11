// Хук для логики отправки запроса в chat-input
import { useState, useRef, useCallback } from 'react';
import type { MediaModel } from '@/redux/api/base';
import type {
    useGenerateMediaMutation,
    useGenerateMediaTestMutation,
} from '@/redux/media-api';
import { useUploadToImgbbMutation } from '@/redux/media-api';
import type { AttachedFile } from './use-chat-input-files';
import { savePrompt } from '@/lib/saved-prompts';
import type { ModelConfig } from '@/lib/model-config';

interface UseChatInputSubmitParams {
    chatId: number;
    currentModel: MediaModel;
    generateMedia: ReturnType<typeof useGenerateMediaMutation>[0];
    generateMediaTest: ReturnType<typeof useGenerateMediaTestMutation>[0];
    isTestMode: boolean;
    onRequestCreated?: (requestId: number) => void;
    onPendingMessage?: (prompt: string) => void;
    onSendError?: (errorMessage: string) => void;
    getFileAsBase64: (file: File) => Promise<string>;
}

interface SubmitParams {
    prompt: string;
    attachedFiles: AttachedFile[];
    format: '1:1' | '4:3' | '3:4' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9' | undefined;
    quality: '1k' | '2k' | '4k' | undefined;
    videoFormat: '16:9' | '9:16' | undefined;
    veoGenerationType: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO' | undefined;
    klingAspectRatio: '16:9' | '9:16' | undefined;
    klingDuration: 5 | 10 | undefined;
    klingSound: boolean | undefined;
    negativePrompt: string;
    seed: string | number | undefined;
    cfgScale: number | undefined;
    modelType: ModelConfig;
    voice: string;
    stability: number;
    similarityBoost: number;
    speed: number;
    languageCode: string;
    isLockEnabled: boolean;
    onClearForm: () => void;
}

export function useChatInputSubmit({
    chatId,
    currentModel,
    generateMedia,
    generateMediaTest,
    isTestMode,
    onRequestCreated,
    onPendingMessage,
    onSendError,
    getFileAsBase64,
}: UseChatInputSubmitParams) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitInProgressRef = useRef(false);
    const [uploadToImgbb] = useUploadToImgbbMutation();

    const handleSubmit = useCallback(
        async (
            event: React.MouseEvent | React.KeyboardEvent | undefined,
            params: SubmitParams
        ) => {
            // Предотвращаем дефолтное поведение если это событие
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            // Атомарная проверка и установка флага для защиты от race condition
            if (submitInProgressRef.current) {
                console.warn(
                    '[ChatInput] ⚠️ Попытка повторной отправки (флаг установлен), игнорируем'
                );
                return;
            }

            // Проверяем наличие данных для отправки
            if (!params.prompt.trim() && params.attachedFiles.length === 0) {
                return;
            }

            // Валидация для Seedream 4.5 Edit: максимум 14 файлов
            if (params.modelType.isSeedream4_5_Edit && params.attachedFiles.length > (params.modelType.maxInputFiles || 0)) {
                submitInProgressRef.current = false;
                setIsSubmitting(false);
                if (onSendError) {
                    onSendError(
                        `Seedream 4.5 Edit поддерживает максимум 14 файлов. Выбрано: ${params.attachedFiles.length}`
                    );
                }
                return;
            }

            // Устанавливаем флаг атомарно (до всех асинхронных операций)
            submitInProgressRef.current = true;
            setIsSubmitting(true);

            // Формируем финальный промпт с добавлением формата и качества для NANO_BANANA
            // ВАЖНО: делаем это ДО pending-сообщения чтобы prompt совпадал
            let finalPrompt = params.prompt.trim();

            if (params.modelType.isNanoBanana && !params.modelType.isNanoBananaPro) {
                const promptParts: string[] = [];

                if (params.format) {
                    promptParts.push(params.format);
                }

                if (params.quality) {
                    promptParts.push(params.quality);
                }

                if (promptParts.length > 0) {
                    finalPrompt = `${finalPrompt} ${promptParts.join(' ')}`;
                }
            }

            // Сразу добавляем pending-сообщение для мгновенного отображения
            if (onPendingMessage) {
                onPendingMessage(finalPrompt);
            }

            try {
                let result: {
                    requestId: number;
                    status: string;
                    message: string;
                };

                if (isTestMode) {
                    // Тестовый режим: используем последний файл из чата
                    console.log(
                        '[ChatInput] 🧪 ТЕСТОВЫЙ РЕЖИМ: отправка запроса БЕЗ вызова нейронки',
                        {
                            chatId,
                            prompt: finalPrompt.substring(0, 50),
                            note: 'Используется последний файл из чата, запрос в API нейронки НЕ отправляется',
                            timestamp: new Date().toISOString(),
                        }
                    );
                    try {
                        result = await generateMediaTest({
                            chatId,
                            prompt: finalPrompt,
                            ...(params.seed !== undefined &&
                                params.seed !== null &&
                                params.seed !== '' && { seed: params.seed }),
                        }).unwrap();
                    } catch (error: unknown) {
                        // Обрабатываем ошибку "нет файлов" в тестовом режиме
                        if (
                            error &&
                            typeof error === 'object' &&
                            'data' in error &&
                            error.data &&
                            typeof error.data === 'object' &&
                            'error' in error.data &&
                            typeof error.data.error === 'string' &&
                            error.data.error.includes('нет файлов')
                        ) {
                            alert(
                                'В чате нет файлов для тестового режима. Сначала создайте хотя бы один файл.'
                            );
                            submitInProgressRef.current = false;
                            setIsSubmitting(false);
                            return;
                        }
                        throw error;
                    }
                    console.log(
                        '[ChatInput] 🧪 ТЕСТОВЫЙ РЕЖИМ: заглушка создана, файл скопирован БЕЗ вызова нейронки, requestId:',
                        result.requestId
                    );
                } else {
                    // Обычный режим: отправляем реальный запрос
                    console.log(
                        '[ChatInput] ✅ Обычный режим: отправка запроса на генерацию в нейронку:',
                        {
                            chatId,
                            prompt: finalPrompt.substring(0, 50),
                            model: currentModel,
                            format: params.format,
                            quality: params.quality,
                            videoFormat: params.modelType.isVeo
                                ? params.videoFormat
                                : undefined,
                            veoGenerationType: params.modelType.isVeo
                                ? params.veoGenerationType
                                : undefined,
                            inputFilesCount: params.attachedFiles.length,
                            timestamp: new Date().toISOString(),
                        }
                    );

                    // Формируем inputFiles: используем imgbbUrl для изображений, если есть, иначе загружаем на imgbb
                    const imageFiles = params.attachedFiles.filter((f) =>
                        f.file.type.startsWith('image/')
                    );
                    const inputFilesUrls: string[] = [];
                    let tailImageUrl: string | undefined;

                    // Для Kling 2.5 Turbo Pro: первое изображение - image_url, второе - tail_image_url
                    if (params.modelType.isKling25 && imageFiles.length > 0) {
                        // Загружаем первое изображение для image_url
                        const firstImage = imageFiles[0];
                        if (firstImage.imgbbUrl) {
                            inputFilesUrls.push(firstImage.imgbbUrl);
                        } else {
                            const base64 = await getFileAsBase64(firstImage.file);
                            const result = await uploadToImgbb({
                                files: [base64],
                            }).unwrap();
                            if (result.urls[0]) {
                                inputFilesUrls.push(result.urls[0]);
                            } else {
                                throw new Error(
                                    `Не удалось загрузить файл ${firstImage.file.name} на imgbb`
                                );
                            }
                        }

                        // Если есть второе изображение - используем его как tail_image_url
                        if (imageFiles.length >= 2) {
                            const secondImage = imageFiles[1];
                            if (secondImage.imgbbUrl) {
                                tailImageUrl = secondImage.imgbbUrl;
                            } else {
                                const base64 = await getFileAsBase64(secondImage.file);
                                const result = await uploadToImgbb({
                                    files: [base64],
                                }).unwrap();
                                if (result.urls[0]) {
                                    tailImageUrl = result.urls[0];
                                } else {
                                    throw new Error(
                                        `Не удалось загрузить tail изображение ${secondImage.file.name} на imgbb`
                                    );
                                }
                            }
                        }
                    } else {
                        // Для остальных моделей обрабатываем все изображения как обычно
                        for (const file of imageFiles) {
                            if (file.imgbbUrl) {
                                // Используем уже загруженный URL на imgbb
                                inputFilesUrls.push(file.imgbbUrl);
                            } else {
                                // Fallback: загружаем на imgbb и получаем URL
                                console.log(
                                    '[ChatInput] ⚠️ imgbbUrl отсутствует, загружаем на imgbb...',
                                    file.file.name
                                );
                                const base64 = await getFileAsBase64(file.file);
                                const result = await uploadToImgbb({
                                    files: [base64],
                                }).unwrap();
                                if (result.urls[0]) {
                                    inputFilesUrls.push(result.urls[0]);
                                } else {
                                    throw new Error(
                                        `Не удалось загрузить файл ${file.file.name} на imgbb`
                                    );
                                }
                            }
                        }
                    }

                    result = await generateMedia({
                        chatId,
                        prompt: finalPrompt,
                        model: currentModel,
                        inputFiles:
                            inputFilesUrls.length > 0
                                ? inputFilesUrls
                                : undefined,
                        ...((params.modelType.supportsFormat &&
                            params.format) && { format: params.format }),
                        ...((params.modelType.supportsQuality &&
                            params.quality) && { quality: params.quality }),
                        ...(params.modelType.isVeo &&
                            params.videoFormat && { ar: params.videoFormat }),
                        ...(params.modelType.supportsVeoGenerationType &&
                            params.veoGenerationType && {
                                generationType: params.veoGenerationType,
                            }),
                        ...(params.modelType.isKling &&
                            params.klingAspectRatio && {
                                format: params.klingAspectRatio,
                            }),
                        ...(params.modelType.supportsDuration &&
                            params.klingDuration && {
                                duration: params.klingDuration,
                            }),
                        ...(params.modelType.supportsSound &&
                            params.klingSound !== undefined && {
                                sound: params.klingSound,
                            }),
                        ...(params.modelType.supportsNegativePrompt &&
                            params.negativePrompt &&
                            params.negativePrompt.trim() && {
                                negativePrompt: params.negativePrompt.trim(),
                            }),
                        ...(params.modelType.supportsSeed &&
                            params.seed !== undefined &&
                            params.seed !== null &&
                            params.seed !== '' && { seed: params.seed }),
                        ...(params.modelType.isKling25 &&
                            params.klingAspectRatio && {
                                format: params.klingAspectRatio,
                            }),
                        ...(params.modelType.isKling25 &&
                            params.klingDuration && {
                                duration: params.klingDuration,
                            }),
                        ...(params.modelType.isKling25 &&
                            params.negativePrompt &&
                            params.negativePrompt.trim() && {
                                negativePrompt: params.negativePrompt.trim(),
                            }),
                        ...(params.modelType.supportsCfgScale &&
                            params.cfgScale !== undefined &&
                            params.cfgScale !== null && {
                                cfgScale: params.cfgScale,
                            }),
                        ...(params.modelType.supportsTailImageUrl &&
                            tailImageUrl && {
                                tailImageUrl,
                            }),
                        ...(params.modelType.supportsElevenLabsParams && {
                            voice: params.voice,
                            stability: params.stability,
                            similarityBoost: params.similarityBoost,
                            speed: params.speed,
                            ...(params.languageCode && { languageCode: params.languageCode }),
                        }),
                    }).unwrap();
                    console.log(
                        '[ChatInput] ✅ Обычный режим: запрос в нейронку отправлен, requestId:',
                        result.requestId
                    );
                }

                // Уведомляем родителя о создании запроса для запуска polling
                if (onRequestCreated && result.requestId) {
                    onRequestCreated(result.requestId);
                }

                // Сохраняем промпт и изображения, если кнопка замочка активна
                if (params.isLockEnabled) {
                    // Сохраняем оригинальный промпт (без добавленных параметров формата и качества)
                    const savedFilesData: string[] = [];
                    for (const file of params.attachedFiles) {
                        if (file.imgbbUrl) {
                            // Для изображений - используем imgbbUrl
                            savedFilesData.push(file.imgbbUrl);
                        } else if (file.file.type.startsWith('video/')) {
                            // Для видео - используем preview blob URL
                            savedFilesData.push(file.preview);
                        } else {
                            // Для изображений без imgbbUrl - загружаем на imgbb
                            const base64 = await getFileAsBase64(file.file);
                            const result = await uploadToImgbb({
                                files: [base64],
                            }).unwrap();
                            if (result.urls[0]) {
                                savedFilesData.push(result.urls[0]);
                            }
                        }
                    }
                    savePrompt(
                        params.prompt.trim(),
                        savedFilesData,
                        chatId,
                        currentModel
                    );
                    // Не очищаем форму, если режим сохранения активен
                } else {
                    // Очищаем форму только если режим сохранения не активен
                    params.onClearForm();
                }

                // Сбрасываем флаги сразу после успешной отправки запроса
                submitInProgressRef.current = false;
                setIsSubmitting(false);
            } catch (error) {
                console.error('[ChatInput] ❌ Ошибка генерации:', error);
                const errorMessage =
                    error &&
                    typeof error === 'object' &&
                    'data' in error &&
                    error.data &&
                    typeof error.data === 'object' &&
                    'error' in error.data &&
                    typeof error.data.error === 'string'
                        ? error.data.error
                        : 'Не удалось отправить запрос. Попробуйте еще раз.';

                // Уведомляем родителя об ошибке для обновления pending-сообщения
                if (onSendError) {
                    onSendError(errorMessage);
                }

                alert(`Ошибка генерации: ${errorMessage}`);

                // Сбрасываем флаги при ошибке тоже, чтобы можно было повторить запрос
                submitInProgressRef.current = false;
                setIsSubmitting(false);
            }
        },
        [
            chatId,
            currentModel,
            generateMedia,
            generateMediaTest,
            isTestMode,
            onRequestCreated,
            onPendingMessage,
            onSendError,
            getFileAsBase64,
            uploadToImgbb,
        ]
    );

    return {
        handleSubmit,
        isSubmitting,
        submitInProgressRef,
    };
}
