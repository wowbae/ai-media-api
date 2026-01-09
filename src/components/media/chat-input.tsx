// Компонент ввода промпта с прикреплением файлов
import {
    useState,
    useRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    forwardRef,
} from 'react';
import {
    Send,
    Paperclip,
    X,
    Image as ImageIcon,
    Loader2,
    Lock,
    Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    loadMediaSettings,
    saveMediaSettings,
    type MediaSettings,
} from '@/lib/media-settings';
import {
    loadLockButtonState,
    saveLockButtonState,
    savePrompt,
} from '@/lib/saved-prompts';
import { ModelSelector } from './model-selector';
import {
    useGenerateMediaMutation,
    useGenerateMediaTestMutation,
    type MediaModel,
} from '@/redux/media-api';
import { useTestMode } from '@/hooks/use-test-mode';

// Props для компонента ввода чата
export interface ChatInputProps {
    chatId: number;
    currentModel: MediaModel;
    onModelChange: (model: MediaModel) => void;
    onRequestCreated?: (requestId: number) => void;
    /** Колбэк для отображения pending-сообщения */
    onPendingMessage?: (prompt: string) => void;
    onSendError?: (errorMessage: string) => void;
    disabled?: boolean;
}

export interface ChatInputRef {
    setPrompt: (prompt: string) => void;
    addFileFromUrl: (url: string, filename: string) => Promise<void>;
}

interface AttachedFile {
    id: string;
    file: File;
    preview: string;
    base64: string;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
    function ChatInput(
        {
            chatId,
            currentModel,
            onModelChange,
            onRequestCreated,
            onPendingMessage,
            onSendError,
            disabled,
        },
        ref
    ) {
        const [prompt, setPrompt] = useState('');
        const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
        const [format, setFormat] = useState<
            '1:1' | '9:16' | '16:9' | undefined
        >(undefined);
        const [quality, setQuality] = useState<'1k' | '2k' | '4k' | undefined>(
            undefined
        );
        const [videoFormat, setVideoFormat] = useState<
            '16:9' | '9:16' | undefined
        >(undefined);
        const [klingAspectRatio, setKlingAspectRatio] = useState<
            '16:9' | '9:16' | undefined
        >(undefined);
        const [klingDuration, setKlingDuration] = useState<5 | 10 | undefined>(
            undefined
        );
        const [klingSound, setKlingSound] = useState<boolean | undefined>(
            undefined
        );
        const [outputFormat, setOutputFormat] = useState<
            'png' | 'jpg' | undefined
        >(undefined);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [isLockEnabled, setIsLockEnabled] = useState(false);
        const [needsScrollbar, setNeedsScrollbar] = useState(false);
        const [isDragging, setIsDragging] = useState(false);
        const { isTestMode } = useTestMode();
        const fileInputRef = useRef<HTMLInputElement>(null);
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const submitInProgressRef = useRef(false);

        const [generateMedia, { isLoading: isGenerating }] =
            useGenerateMediaMutation();
        const [generateMediaTest, { isLoading: isGeneratingTest }] =
            useGenerateMediaTestMutation();

        // Поле не блокируется на время выполнения запроса для поддержки параллельных запросов
        const isDisabled = disabled;
        const isNanoBanana = currentModel === 'NANO_BANANA';
        const isNanoBananaPro = currentModel === 'NANO_BANANA_PRO';
        const isNanoBananaProKieai =
            (currentModel as string) === 'NANO_BANANA_PRO_KIEAI';
        const isVeo =
            currentModel === 'VEO_3_1_FAST' || currentModel === 'VEO_3_1';
        const isKling = (currentModel as string) === 'KLING_2_6';

        // Функция для обновления высоты textarea
        const adjustTextareaHeight = useCallback(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            // Сбрасываем высоту для корректного расчета scrollHeight
            textarea.style.height = 'auto';

            // Получаем реальную высоту контента
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = window.innerHeight * 0.2; // 20% от высоты экрана

            // Устанавливаем высоту на основе содержимого, но не больше maxHeight
            const newHeight = Math.min(scrollHeight, maxHeight);
            textarea.style.height = `${newHeight}px`;

            // Проверяем, нужен ли скроллбар
            // Скроллбар нужен только если scrollHeight действительно больше установленной высоты
            // Используем небольшую погрешность (1px) для избежания проблем с округлением
            const needsScroll = scrollHeight > newHeight + 1;
            setNeedsScrollbar(needsScroll);
        }, []);

        // Обработчик изменения размера textarea
        const handleTextareaChange = useCallback(
            (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setPrompt(e.target.value);
                // Используем requestAnimationFrame для обновления после рендера
                requestAnimationFrame(() => {
                    adjustTextareaHeight();
                });
            },
            [adjustTextareaHeight]
        );

        // Обновление высоты при изменении prompt извне
        useEffect(() => {
            requestAnimationFrame(() => {
                adjustTextareaHeight();
            });
        }, [prompt, adjustTextareaHeight]);

        // Обновление высоты при изменении размера окна
        useEffect(() => {
            const handleResize = () => {
                adjustTextareaHeight();
            };

            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }, [adjustTextareaHeight]);

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

        // Экспортируем методы для работы с промптом и файлами извне
        useImperativeHandle(ref, () => ({
            setPrompt: (newPrompt: string) => {
                setPrompt(newPrompt);
                // Фокусируемся на textarea после установки промпта
                setTimeout(() => {
                    const textarea = document.querySelector(
                        'textarea[placeholder*="Опишите"]'
                    ) as HTMLTextAreaElement;
                    if (textarea) {
                        textarea.focus();
                        // Устанавливаем курсор в конец текста
                        textarea.setSelectionRange(
                            newPrompt.length,
                            newPrompt.length
                        );
                    }
                }, 0);
            },
            addFileFromUrl: async (url: string, filename: string) => {
                try {
                    // Загружаем файл по URL
                    const file = await urlToFile(url, filename);

                    // Проверяем тип файла (только изображения)
                    // if (!file.type.startsWith('image/')) {
                    //     alert('Можно прикреплять только изображения');
                    //     return;
                    // }

                    // Проверяем размер (макс 10MB)
                    if (file.size > 10 * 1024 * 1024) {
                        alert('Размер файла не должен превышать 10MB');
                        return;
                    }

                    // Конвертируем в base64
                    const base64 = await fileToBase64(file);
                    const preview = URL.createObjectURL(file);

                    // Добавляем в список прикрепленных файлов
                    const newFile: AttachedFile = {
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        file,
                        preview,
                        base64,
                    };

                    setAttachedFiles((prev) => [...prev, newFile]);
                } catch (error) {
                    console.error(
                        '[ChatInput] Ошибка прикрепления файла:',
                        error
                    );
                    alert('Не удалось прикрепить файл');
                }
            },
        }));

        // Загружаем настройки из localStorage при монтировании компонента
        useEffect(() => {
            const settings = loadMediaSettings();
            const isNanoBananaProModel = currentModel === 'NANO_BANANA_PRO';

            if (settings.format) {
                setFormat(settings.format);
            } else if (isNanoBananaProModel) {
                // Значение по умолчанию для NANO_BANANA_PRO
                setFormat('16:9');
            }
            if (settings.quality) {
                setQuality(settings.quality);
            } else if (isNanoBananaProModel) {
                // Значение по умолчанию для NANO_BANANA_PRO
                setQuality('2k');
            }
            const videoFormatValue = (
                settings as { videoFormat?: '16:9' | '9:16' }
            ).videoFormat;
            if (videoFormatValue) {
                setVideoFormat(videoFormatValue);
            }

            // Загружаем настройки Kling 2.6
            if (settings.klingAspectRatio) {
                setKlingAspectRatio(settings.klingAspectRatio);
            } else if ((currentModel as string) === 'KLING_2_6') {
                // Значение по умолчанию для Kling 2.6
                setKlingAspectRatio('16:9');
            }
            if (settings.klingDuration) {
                setKlingDuration(settings.klingDuration);
            } else if ((currentModel as string) === 'KLING_2_6') {
                // Значение по умолчанию для Kling 2.6
                setKlingDuration(5);
            }
            if (settings.klingSound !== undefined) {
                setKlingSound(settings.klingSound);
            } else if ((currentModel as string) === 'KLING_2_6') {
                // Значение по умолчанию для Kling 2.6
                setKlingSound(true);
            }

            // Загружаем состояние кнопки замочка
            const lockState = loadLockButtonState();
            setIsLockEnabled(lockState);
        }, [currentModel]);

        // Конвертация файла в base64
        const fileToBase64 = useCallback((file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
            });
        }, []);

        // Обработка файлов (общая функция для переиспользования)
        const processFiles = useCallback(
            async (files: File[]): Promise<AttachedFile[]> => {
                const newFiles: AttachedFile[] = [];

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

                    try {
                        const base64 = await fileToBase64(file);
                        const preview = URL.createObjectURL(file);

                        newFiles.push({
                            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            file,
                            preview,
                            base64,
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

                return newFiles;
            },
            [fileToBase64]
        );

        // Обработка выбора файлов из input
        async function handleFileSelect(
            event: React.ChangeEvent<HTMLInputElement>
        ) {
            const files = event.target.files;
            if (!files) return;

            const newFiles = await processFiles(Array.from(files));
            setAttachedFiles((prev) => [...prev, ...newFiles]);

            // Сбрасываем input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }

        // Удаление прикрепленного файла
        function removeFile(fileId: string) {
            setAttachedFiles((prev) => {
                const file = prev.find((f) => f.id === fileId);
                if (file) {
                    URL.revokeObjectURL(file.preview);
                }
                return prev.filter((f) => f.id !== fileId);
            });
        }

        // Обработчики drag-and-drop
        const handleDragOver = useCallback(
            (event: React.DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                event.stopPropagation();
                if (!isDisabled) {
                    setIsDragging(true);
                }
            },
            [isDisabled]
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
            async (event: React.DragEvent<HTMLDivElement>) => {
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
            [isDisabled, processFiles]
        );

        // Обработчик paste из буфера обмена
        const handlePaste = useCallback(
            async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
            [isDisabled, processFiles]
        );

        // Отправка запроса
        async function handleSubmit(
            event?: React.MouseEvent | React.KeyboardEvent
        ) {
            // Предотвращаем дефолтное поведение если это событие
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            // Атомарная проверка и установка флага для защиты от race condition
            // Проверяем ВСЕ возможные состояния блокировки ПЕРЕД установкой флага
            if (submitInProgressRef.current) {
                console.warn(
                    '[ChatInput] ⚠️ Попытка повторной отправки (флаг установлен), игнорируем'
                );
                return;
            }

            // Проверяем только внешнюю блокировку
            if (isDisabled) {
                console.warn(
                    '[ChatInput] ⚠️ Попытка повторной отправки (компонент заблокирован), игнорируем'
                );
                return;
            }

            // Проверяем наличие данных для отправки
            if (!prompt.trim() && attachedFiles.length === 0) {
                return;
            }

            // Устанавливаем флаг атомарно (до всех асинхронных операций)
            submitInProgressRef.current = true;
            setIsSubmitting(true);

            // Формируем финальный промпт с добавлением формата и качества для NANO_BANANA
            // ВАЖНО: делаем это ДО pending-сообщения чтобы prompt совпадал
            // Для NANO_BANANA_PRO параметры передаются через API, не в промпт
            let finalPrompt = prompt.trim();

            if (isNanoBanana && !isNanoBananaPro) {
                const promptParts: string[] = [];

                if (format) {
                    promptParts.push(format);
                }

                if (quality) {
                    promptParts.push(quality);
                }

                if (promptParts.length > 0) {
                    finalPrompt = `${finalPrompt} ${promptParts.join(' ')}`;
                }
            }

            // Сразу добавляем pending-сообщение для мгновенного отображения
            // Используем финальный prompt чтобы сравнение работало корректно
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
                            format,
                            quality,
                            videoFormat: isVeo ? videoFormat : undefined,
                            inputFilesCount: attachedFiles.length,
                            timestamp: new Date().toISOString(),
                        }
                    );
                    result = await generateMedia({
                        chatId,
                        prompt: finalPrompt,
                        model: currentModel,
                        inputFiles: attachedFiles.map((f) => f.base64),
                        ...((isNanoBanana ||
                            isNanoBananaPro ||
                            isNanoBananaProKieai) &&
                            format && { format }),
                        ...((isNanoBanana ||
                            isNanoBananaPro ||
                            isNanoBananaProKieai) &&
                            quality && { quality }),
                        ...(isNanoBananaProKieai &&
                            outputFormat && { outputFormat }),
                        ...(isVeo && videoFormat && { ar: videoFormat }),
                        ...(isKling &&
                            klingAspectRatio && {
                                format: klingAspectRatio,
                            }),
                        ...(isKling &&
                            klingDuration && { duration: klingDuration }),
                        ...(isKling &&
                            klingSound !== undefined && { sound: klingSound }),
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
                if (isLockEnabled) {
                    // Сохраняем оригинальный промпт (без добавленных параметров формата и качества)
                    savePrompt(
                        prompt.trim(),
                        attachedFiles.map((f) => f.base64),
                        chatId,
                        currentModel
                    );
                    // Не очищаем форму, если режим сохранения активен
                } else {
                    // Очищаем форму только если режим сохранения не активен
                    setPrompt('');
                    attachedFiles.forEach((f) =>
                        URL.revokeObjectURL(f.preview)
                    );
                    setAttachedFiles([]);
                }

                // Сбрасываем флаги сразу после успешной отправки запроса
                // Это позволяет отправлять параллельные запросы
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
        }

        // Обработка Enter для отправки
        function handleKeyDown(
            event: React.KeyboardEvent<HTMLTextAreaElement>
        ) {
            if (event.key === 'Enter' && !event.shiftKey) {
                // Предотвращаем отправку только если идет подготовка запроса или компонент заблокирован
                if (submitInProgressRef.current || isDisabled) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                handleSubmit(event);
            }
        }

        // Переключение состояния кнопки замочка
        function toggleLock() {
            const newState = !isLockEnabled;
            setIsLockEnabled(newState);
            saveLockButtonState(newState);
        }

        return (
            <div className='border-t border-slate-700 bg-slate-800/50 p-4'>
                {/* Прикрепленные файлы */}
                {attachedFiles.length > 0 && (
                    <div className='mb-3 flex flex-wrap gap-2'>
                        {attachedFiles.map((file) => {
                            const isVideo = file.file.type.startsWith('video/');
                            return (
                                <div
                                    key={file.id}
                                    className='group relative h-16 w-16 overflow-hidden rounded-lg border border-slate-600'
                                >
                                    {isVideo ? (
                                        <video
                                            src={file.preview}
                                            className='h-full w-full object-cover'
                                            muted
                                        />
                                    ) : (
                                        <img
                                            src={file.preview}
                                            alt='Attachment'
                                            className='h-full w-full object-cover'
                                        />
                                    )}
                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className='absolute right-0.5 top-0.5 rounded-full bg-slate-900/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100'
                                    >
                                        <X className='h-3 w-3 text-white' />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Верхняя панель с выбором модели и настроек */}
                <div className='mb-3 flex flex-wrap items-center gap-3'>
                    <ModelSelector
                        value={currentModel}
                        onChange={onModelChange}
                        disabled={isDisabled}
                    />

                    {/* Настройки для NANO_BANANA */}
                    {isNanoBanana && (
                        <>
                            <Select
                                value={format || 'default'}
                                onValueChange={(value) => {
                                    const newFormat =
                                        value === 'default'
                                            ? undefined
                                            : (value as '9:16' | '16:9');
                                    setFormat(newFormat);
                                    saveMediaSettings({
                                        format: newFormat,
                                        quality,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[120px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Формат'>
                                        {format || 'Формат'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='default'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        По умолчанию
                                    </SelectItem>
                                    <SelectItem
                                        value='16:9'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        16:9 (Горизонтальный)
                                    </SelectItem>
                                    <SelectItem
                                        value='9:16'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        9:16 (Вертикальный)
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={quality || 'default'}
                                onValueChange={(value) => {
                                    const newQuality =
                                        value === 'default'
                                            ? undefined
                                            : (value as '1k' | '2k' | '4k');
                                    setQuality(newQuality);
                                    saveMediaSettings({
                                        format,
                                        quality: newQuality,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[100px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Качество'>
                                        {quality || 'Качество'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='default'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        По умолчанию
                                    </SelectItem>
                                    <SelectItem
                                        value='1k'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        1K
                                    </SelectItem>
                                    <SelectItem
                                        value='2k'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        2K
                                    </SelectItem>
                                    <SelectItem
                                        value='4k'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        4K
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    {/* Настройки для NANO_BANANA_PRO (Google Native Format) */}
                    {isNanoBananaPro && (
                        <>
                            <Select
                                value={format || '16:9'}
                                onValueChange={(value) => {
                                    const newFormat = value as '16:9' | '9:16';
                                    setFormat(newFormat);
                                    saveMediaSettings({
                                        format: newFormat,
                                        quality,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[120px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Формат'>
                                        {format || '16:9'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='16:9'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        16:9 (Горизонтальный)
                                    </SelectItem>
                                    <SelectItem
                                        value='9:16'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        9:16 (Вертикальный)
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={quality || '2k'}
                                onValueChange={(value) => {
                                    const newQuality = value as '2k' | '4k';
                                    setQuality(newQuality);
                                    saveMediaSettings({
                                        format,
                                        quality: newQuality,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[100px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Качество'>
                                        {quality ? quality.toUpperCase() : '2K'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='2k'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        2K
                                    </SelectItem>
                                    <SelectItem
                                        value='4k'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        4K
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    {/* Настройки для Veo */}
                    {isVeo && (
                        <Select
                            value={videoFormat || 'default'}
                            onValueChange={(value) => {
                                const newVideoFormat =
                                    value === 'default'
                                        ? undefined
                                        : (value as '16:9' | '9:16');
                                setVideoFormat(newVideoFormat);
                                saveMediaSettings({
                                    format,
                                    quality,
                                    videoFormat: newVideoFormat,
                                } as MediaSettings);
                            }}
                            disabled={isDisabled}
                        >
                            <SelectTrigger className='w-[120px] border-slate-600 bg-slate-700 text-white'>
                                <SelectValue placeholder='Формат'>
                                    {videoFormat || 'Формат'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className='border-slate-700 bg-slate-800'>
                                <SelectItem
                                    value='default'
                                    className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                >
                                    По умолчанию
                                </SelectItem>
                                <SelectItem
                                    value='16:9'
                                    className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                >
                                    16:9 (Горизонтальный)
                                </SelectItem>
                                <SelectItem
                                    value='9:16'
                                    className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                >
                                    9:16 (Вертикальный)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    {/* Настройки для NANO_BANANA_PRO_KIEAI */}
                    {isNanoBananaProKieai && (
                        <>
                            <Select
                                value={format || '1:1'}
                                onValueChange={(value) => {
                                    const newFormat = value as
                                        | '1:1'
                                        | '9:16'
                                        | '16:9';
                                    setFormat(newFormat);
                                    saveMediaSettings({
                                        format: newFormat,
                                        quality,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[140px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Формат'>
                                        {format || '1:1'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='1:1'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        1:1 (Квадрат)
                                    </SelectItem>
                                    <SelectItem
                                        value='16:9'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        16:9 (Горизонтальный)
                                    </SelectItem>
                                    <SelectItem
                                        value='9:16'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        9:16 (Вертикальный)
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={quality || '4k'}
                                onValueChange={(value) => {
                                    const newQuality = value as
                                        | '1k'
                                        | '2k'
                                        | '4k';
                                    setQuality(newQuality);
                                    saveMediaSettings({
                                        format,
                                        quality: newQuality,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[100px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Качество'>
                                        {quality?.toUpperCase() || '4K'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='1k'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        1K
                                    </SelectItem>
                                    <SelectItem
                                        value='2k'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        2K
                                    </SelectItem>
                                    <SelectItem
                                        value='4k'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        4K
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={outputFormat || 'png'}
                                onValueChange={(value) => {
                                    const newFormat = value as 'png' | 'jpg';
                                    setOutputFormat(newFormat);
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[100px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Формат'>
                                        {outputFormat?.toUpperCase() || 'PNG'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='png'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        PNG
                                    </SelectItem>
                                    <SelectItem
                                        value='jpg'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        JPG
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    {/* Настройки для Kling 2.6 */}
                    {isKling && (
                        <>
                            <Select
                                value={klingAspectRatio || '16:9'}
                                onValueChange={(value) => {
                                    const newAspectRatio = value as
                                        | '16:9'
                                        | '9:16';
                                    setKlingAspectRatio(newAspectRatio);
                                    saveMediaSettings({
                                        klingAspectRatio: newAspectRatio,
                                        klingDuration,
                                        klingSound,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[120px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Формат'>
                                        {klingAspectRatio || '16:9'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='16:9'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        16:9 (Горизонтальный)
                                    </SelectItem>
                                    <SelectItem
                                        value='9:16'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        9:16 (Вертикальный)
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={klingDuration?.toString() || '5'}
                                onValueChange={(value) => {
                                    const newDuration = parseInt(value) as
                                        | 5
                                        | 10;
                                    setKlingDuration(newDuration);
                                    saveMediaSettings({
                                        klingAspectRatio,
                                        klingDuration: newDuration,
                                        klingSound,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[100px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Длительность'>
                                        {klingDuration || 5} сек
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='5'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        5 сек
                                    </SelectItem>
                                    <SelectItem
                                        value='10'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        10 сек
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={
                                    klingSound === undefined
                                        ? 'true'
                                        : klingSound.toString()
                                }
                                onValueChange={(value) => {
                                    const newSound = value === 'true';
                                    setKlingSound(newSound);
                                    saveMediaSettings({
                                        klingAspectRatio,
                                        klingDuration,
                                        klingSound: newSound,
                                    });
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className='w-[100px] border-slate-600 bg-slate-700 text-white'>
                                    <SelectValue placeholder='Звук'>
                                        {klingSound === undefined || klingSound
                                            ? 'Да'
                                            : 'Нет'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='border-slate-700 bg-slate-800'>
                                    <SelectItem
                                        value='true'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        Да
                                    </SelectItem>
                                    <SelectItem
                                        value='false'
                                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                                    >
                                        Нет
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    )}
                </div>

                {/* Поле ввода с кнопками внутри */}
                <div
                    className={cn(
                        'relative rounded-lg transition-all',
                        isDragging &&
                            'border-2 border-cyan-500 bg-slate-700/90 p-1'
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*,video/*'
                        multiple
                        onChange={handleFileSelect}
                        className='hidden'
                    />
                    <Textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder='Опишите, что хотите сгенерировать...'
                        className={cn(
                            'min-h-[76px] max-h-[20vh] resize-none border-slate-600 bg-slate-700 pb-10 pl-4 pr-12 text-white placeholder:text-slate-400',
                            'focus-visible:ring-cyan-500',
                            needsScrollbar &&
                                'overflow-y-auto custom-scrollbar',
                            !needsScrollbar && 'overflow-y-hidden',
                            isDragging && 'border-cyan-400'
                        )}
                        style={{ height: 'auto' }}
                        disabled={isDisabled}
                    />

                    {/* Кнопки слева внутри поля ввода */}
                    <div className='absolute bottom-1.5 left-1.5 flex items-center gap-0'>
                        <Button
                            type='button'
                            size='icon-sm'
                            variant='ghost'
                            className={cn(
                                'h-8 w-8 hover:bg-slate-600',
                                attachedFiles.length > 0
                                    ? 'text-cyan-400 hover:text-cyan-300'
                                    : 'text-slate-400 hover:text-cyan-400'
                            )}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isDisabled}
                        >
                            <Paperclip className='h-4 w-4' />
                        </Button>

                        {/* Кнопка замочка для сохранения промптов */}
                        <Button
                            type='button'
                            size='icon-sm'
                            variant='ghost'
                            className={cn(
                                'h-8 w-8 hover:bg-slate-600',
                                isLockEnabled
                                    ? 'text-cyan-400 hover:text-cyan-300'
                                    : 'text-slate-400 hover:text-slate-300'
                            )}
                            onClick={toggleLock}
                            disabled={isDisabled}
                            title={
                                isLockEnabled
                                    ? 'Сохранение промптов включено'
                                    : 'Сохранение промптов выключено'
                            }
                        >
                            {isLockEnabled ? (
                                <Lock className='h-4 w-4' />
                            ) : (
                                <Unlock className='h-4 w-4' />
                            )}
                        </Button>
                    </div>

                    {/* Кнопка отправки справа внутри поля ввода */}
                    <Button
                        type='button'
                        size='icon-sm'
                        className='absolute bottom-1.5 right-1.5 bg-cyan-600 hover:bg-cyan-700 hover:text-cyan-400'
                        onClick={(e) => {
                            // Дополнительная проверка перед вызовом
                            if (submitInProgressRef.current || isDisabled) {
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                            handleSubmit(e);
                        }}
                        disabled={
                            isDisabled ||
                            (!prompt.trim() && attachedFiles.length === 0)
                        }
                    >
                        {isSubmitting ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            <Send className='h-4 w-4' />
                        )}
                    </Button>
                </div>

                {/* Подсказка */}
                <p className='mt-2 text-xs text-slate-500'>
                    Enter — отправить, Shift+Enter — новая строка. Можно
                    перетаскивать файлы или вставлять из буфера обмена
                    (Ctrl+V/Cmd+V)
                </p>
            </div>
        );
    }
);
