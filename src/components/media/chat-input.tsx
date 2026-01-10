// Компонент ввода промпта с прикреплением файлов
import {
    useState,
    useRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    forwardRef,
} from 'react';
import { Send, Paperclip, X, Loader2, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    loadMediaSettings,
    saveMediaSettings,
    type MediaSettings,
} from '@/lib/media-settings';
import { loadLockButtonState, saveLockButtonState } from '@/lib/saved-prompts';
import { ModelSelector } from './model-selector';
import {
    useGenerateMediaMutation,
    useGenerateMediaTestMutation,
    type MediaModel,
} from '@/redux/media-api';
import { useTestMode } from '@/hooks/use-test-mode';
import { useChatInputFiles } from './chat-input/use-chat-input-files';
import { useChatInputSubmit } from './chat-input/use-chat-input-submit';
import { ModelSettingsPanel } from './chat-input/model-settings';
import { getModelSettingsConfig } from './chat-input/model-settings-config';

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
        const [format, setFormat] = useState<
            | '1:1'
            | '4:3'
            | '3:4'
            | '9:16'
            | '16:9'
            | '2:3'
            | '3:2'
            | '21:9'
            | undefined
        >(undefined);
        const [quality, setQuality] = useState<'1k' | '2k' | '4k' | undefined>(
            undefined
        );
        const [duration, setDuration] = useState<5 | 10 | undefined>(undefined);
        const [sound, setSound] = useState<boolean | undefined>(undefined);
        const [negativePrompt, setNegativePrompt] = useState<string>('');
        const [seed, setSeed] = useState<string | number | undefined>(
            undefined
        );
        const [cfgScale, setCfgScale] = useState<number | undefined>(undefined);
        const [isLockEnabled, setIsLockEnabled] = useState(false);
        const [needsScrollbar, setNeedsScrollbar] = useState(false);
        const [attachingFile, setAttachingFile] = useState(false);

        const { isTestMode } = useTestMode();
        const fileInputRef = useRef<HTMLInputElement>(null);
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        const [generateMedia] = useGenerateMediaMutation();
        const [generateMediaTest] = useGenerateMediaTestMutation();

        // Поле не блокируется на время выполнения запроса для поддержки параллельных запросов
        const isDisabled = disabled ?? false;
        const isNanoBanana = currentModel === 'NANO_BANANA';
        const isNanoBananaPro = currentModel === 'NANO_BANANA_PRO';
        const isNanoBananaProKieai =
            (currentModel as string) === 'NANO_BANANA_PRO_KIEAI';
        const isVeo =
            currentModel === 'VEO_3_1_FAST' || currentModel === 'VEO_3_1';
        const isKling = (currentModel as string) === 'KLING_2_6';
        const isKling25 = (currentModel as string) === 'KLING_2_5_TURBO_PRO';
        const isImagen4 = (currentModel as string) === 'IMAGEN4_KIEAI';
        const isSeedream4_5 = (currentModel as string) === 'SEEDREAM_4_5';
        const isSeedream4_5_Edit =
            (currentModel as string) === 'SEEDREAM_4_5_EDIT';

        // Хуки для работы с файлами и отправкой
        const {
            attachedFiles,
            setAttachedFiles,
            isDragging,
            handleFileSelect: handleFileSelectHook,
            addFileFromUrl,
            removeFile,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            handlePaste,
            cleanup,
            clearFiles,
            getFileAsBase64,
        } = useChatInputFiles();

        function loadingEffectForAttachFile() {
            setAttachingFile(true);
            setTimeout(() => {
                setAttachingFile(false);
            }, 1500);
        }

        const { handleSubmit, isSubmitting, submitInProgressRef } =
            useChatInputSubmit({
                chatId,
                currentModel,
                generateMedia,
                generateMediaTest,
                isTestMode,
                onRequestCreated,
                onPendingMessage,
                onSendError,
                getFileAsBase64,
            });

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
            addFileFromUrl,
        }));

        // Загружаем настройки из localStorage при монтировании компонента
        useEffect(() => {
            const settings = loadMediaSettings();
            const config = getModelSettingsConfig(currentModel);

            // Загружаем format (универсальный для всех моделей)
            if (settings.format) {
                setFormat(settings.format);
            } else if (isVeo && settings.videoFormat) {
                // Для Veo используем videoFormat из старых настроек
                setFormat(settings.videoFormat);
            } else if ((isKling || isKling25) && settings.klingAspectRatio) {
                // Для Kling используем klingAspectRatio из старых настроек
                setFormat(settings.klingAspectRatio);
            } else if (config.format?.defaultValue) {
                setFormat(config.format.defaultValue);
            }

            // Загружаем quality
            if (settings.quality) {
                setQuality(settings.quality);
            } else if (config.quality?.defaultValue) {
                setQuality(config.quality.defaultValue);
            }

            // Загружаем duration (только для Kling)
            if (settings.klingDuration) {
                setDuration(settings.klingDuration);
            } else if (config.duration?.defaultValue) {
                setDuration(config.duration.defaultValue);
            }

            // Загружаем sound (только для Kling)
            if (settings.klingSound !== undefined) {
                setSound(settings.klingSound);
            } else if (config.sound?.defaultValue !== undefined) {
                setSound(config.sound.defaultValue);
            }

            // Загружаем состояние кнопки замочка
            const lockState = loadLockButtonState();
            setIsLockEnabled(lockState);
        }, [currentModel]);

        // Сохраняем настройки при изменении (используем ref для предотвращения сохранения при первой загрузке)
        const isInitialMount = useRef(true);
        useEffect(() => {
            // Пропускаем сохранение при первой загрузке
            if (isInitialMount.current) {
                isInitialMount.current = false;
                return;
            }

            // Сохраняем настройки в зависимости от модели
            if (isVeo) {
                // Для Veo сохраняем в videoFormat
                saveMediaSettings({
                    videoFormat:
                        format && format !== '1:1'
                            ? (format as '16:9' | '9:16')
                            : undefined,
                } as MediaSettings);
            } else if (isKling || isKling25) {
                // Для Kling сохраняем в klingAspectRatio, klingDuration, klingSound (только для Kling 2.6)
                saveMediaSettings({
                    klingAspectRatio:
                        format && format !== '1:1'
                            ? (format as '16:9' | '9:16')
                            : undefined,
                    klingDuration: duration,
                    klingSound: isKling ? sound : undefined,
                });
            } else {
                // Для остальных моделей сохраняем в format и quality
                saveMediaSettings({
                    format: format as MediaSettings['format'],
                    quality,
                });
            }
        }, [format, quality, duration, sound, isVeo, isKling, isKling25]);

        // Очистка URL.createObjectURL при размонтировании компонента для предотвращения утечек памяти
        useEffect(() => {
            return () => {
                cleanup();
            };
        }, [cleanup]);

        // Обработка выбора файлов из input
        const handleFileSelect = useCallback(
            (event: React.ChangeEvent<HTMLInputElement>) => {
                handleFileSelectHook(event);
                // Сбрасываем input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            [handleFileSelectHook]
        );

        // Обработчик отправки запроса
        const onSubmit = useCallback(
            (event?: React.MouseEvent | React.KeyboardEvent) => {
                // Проверяем только внешнюю блокировку
                if (isDisabled) {
                    console.warn(
                        '[ChatInput] ⚠️ Попытка повторной отправки (компонент заблокирован), игнорируем'
                    );
                    return;
                }

                // Определяем videoFormat и klingAspectRatio для отправки (нужны разные параметры API)
                // Для Veo и Kling формат '1:1' не поддерживается, поэтому фильтруем его
                const videoFormat =
                    isVeo && format && format !== '1:1'
                        ? (format as '16:9' | '9:16')
                        : undefined;
                const klingAspectRatio =
                    (isKling || isKling25) && format && format !== '1:1'
                        ? (format as '16:9' | '9:16')
                        : undefined;

                handleSubmit(event, {
                    prompt,
                    attachedFiles,
                    format: format as
                        | '1:1'
                        | '4:3'
                        | '3:4'
                        | '9:16'
                        | '16:9'
                        | '2:3'
                        | '3:2'
                        | '21:9'
                        | undefined,
                    quality,
                    videoFormat,
                    klingAspectRatio,
                    klingDuration: duration,
                    klingSound: sound,
                    negativePrompt,
                    seed,
                    cfgScale,
                    isNanoBanana,
                    isNanoBananaPro,
                    isNanoBananaProKieai,
                    isVeo,
                    isKling,
                    isKling25,
                    isImagen4,
                    isSeedream4_5,
                    isSeedream4_5_Edit,
                    isLockEnabled,
                    onClearForm: () => {
                        setPrompt('');
                        if (isImagen4) {
                            setNegativePrompt('');
                            setSeed(undefined);
                        }
                        if (isKling25) {
                            setNegativePrompt('');
                            setCfgScale(undefined);
                        }
                        clearFiles();
                    },
                });
            },
            [
                isDisabled,
                handleSubmit,
                prompt,
                attachedFiles,
                format,
                quality,
                duration,
                sound,
                negativePrompt,
                seed,
                cfgScale,
                isNanoBanana,
                isNanoBananaPro,
                isNanoBananaProKieai,
                isVeo,
                isKling,
                isKling25,
                isImagen4,
                isSeedream4_5,
                isSeedream4_5_Edit,
                isLockEnabled,
                clearFiles,
            ]
        );

        // Обработка Enter для отправки
        const handleKeyDown = useCallback(
            (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    // Предотвращаем отправку только если идет подготовка запроса или компонент заблокирован
                    if (submitInProgressRef.current || isDisabled) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                    onSubmit(event);
                }
            },
            [submitInProgressRef, isDisabled, onSubmit]
        );

        // Переключение состояния кнопки замочка
        function toggleLock() {
            const newState = !isLockEnabled;
            setIsLockEnabled(newState);
            saveLockButtonState(newState);
        }

        return (
            <div className='border-t border-slate-700 bg-slate-800/50 p-4'>
                {/* Прикрепленные файлы */}
                {attachedFiles.length > 0 ? (
                    <div className='mb-3 flex flex-wrap gap-2 items-center'>
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
                        {attachingFile && (
                            <Loader2 className='h-4 w-4 ml-2 animate-spin' />
                        )}
                    </div>
                ) : (
                    attachingFile && (
                        <Loader2 className='h-4 w-4 mb-4 mx-4 animate-spin' />
                    )
                )}

                {/* Подсказка для Kling 2.5 Turbo Pro */}
                {isKling25 && (
                    <p className='mb-2 text-xs text-slate-400'>
                        Для image-to-video: первое изображение — начальный кадр,
                        второе — финальный кадр (tail)
                    </p>
                )}

                {/* Подсказка для Seedream 4.5 Edit */}
                {isSeedream4_5_Edit && (
                    <p className='mb-2 text-xs text-slate-400'>
                        Seedream 4.5 Edit поддерживает до 14 изображений для
                        редактирования
                    </p>
                )}

                {/* Верхняя панель с выбором модели и настроек */}
                <div className='mb-2 flex flex-wrap items-center gap-3'>
                    <ModelSelector
                        value={currentModel}
                        onChange={(model) => {
                            // обнуляем seed при смене модели
                            setSeed(undefined);
                            onModelChange(model);
                        }}
                        disabled={isDisabled}
                    />

                    <ModelSettingsPanel
                        model={currentModel}
                        format={
                            format as
                                | '1:1'
                                | '4:3'
                                | '3:4'
                                | '9:16'
                                | '16:9'
                                | '2:3'
                                | '3:2'
                                | '21:9'
                                | undefined
                        }
                        quality={quality}
                        duration={duration}
                        sound={sound}
                        onFormatChange={(value) =>
                            setFormat(value as typeof format)
                        }
                        onQualityChange={setQuality}
                        onDurationChange={setDuration}
                        onSoundChange={setSound}
                        disabled={isDisabled}
                    />
                </div>

                {/* Поля для Imagen4: negativePrompt и seed */}
                {isImagen4 && (
                    <div className='flex gap-2 mb-2'>
                        <Input
                            type='text'
                            placeholder='Негативный промпт (опционально)'
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            disabled={isDisabled}
                            className='border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-cyan-500'
                        />
                        <Input
                            type='text'
                            placeholder='Seed (опционально)'
                            value={seed === undefined ? '' : String(seed)}
                            onChange={(e) => {
                                const value = e.target.value.trim();
                                if (value === '') {
                                    setSeed(undefined);
                                } else if (!isNaN(Number(value))) {
                                    setSeed(Number(value));
                                } else {
                                    setSeed(value);
                                }
                            }}
                            disabled={isDisabled}
                            className='border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-cyan-500'
                        />
                    </div>
                )}

                {/* Поля для Kling 2.5 Turbo Pro: negativePrompt и cfgScale */}
                {isKling25 && (
                    <div className='flex gap-2 mb-2'>
                        <Input
                            type='text'
                            placeholder='Негативный промпт (опционально)'
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            disabled={isDisabled}
                            className='border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-cyan-500'
                        />
                        <Input
                            type='number'
                            placeholder='CFG Scale (опционально, 1-20)'
                            value={
                                cfgScale === undefined ? '' : String(cfgScale)
                            }
                            onChange={(e) => {
                                const value = e.target.value.trim();
                                if (value === '') {
                                    setCfgScale(undefined);
                                } else {
                                    const numValue = Number(value);
                                    if (
                                        !isNaN(numValue) &&
                                        numValue >= 1 &&
                                        numValue <= 20
                                    ) {
                                        setCfgScale(numValue);
                                    }
                                }
                            }}
                            disabled={isDisabled}
                            className='border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-cyan-500 w-40'
                            min={1}
                            max={20}
                        />
                    </div>
                )}

                {/* Поле ввода с кнопками внутри */}
                <div
                    className={cn(
                        'relative rounded-lg transition-all',
                        isDragging &&
                            'border-2 border-cyan-500 bg-slate-700/90 p-1'
                    )}
                    onDragOver={(e) => handleDragOver(e, isDisabled)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, isDisabled)}
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
                        onPaste={(e) => {
                            loadingEffectForAttachFile();
                            handlePaste(e, isDisabled);
                        }}
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
                            onSubmit(e);
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
