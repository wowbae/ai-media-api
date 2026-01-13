// Компонент ввода промпта с прикреплением файлов
import {
    useState,
    useRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    forwardRef,
    useMemo,
} from 'react';
import {
    Send,
    Paperclip,
    X,
    Loader2,
    Lock,
    Unlock,
    ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
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
import { loadLockButtonState, saveLockButtonState } from '@/lib/saved-prompts';
import { createLoadingEffectForAttachFile } from '@/lib/media-utils';
import { ModelSelector } from './model-selector';
import {
    useGenerateMediaMutation,
    useGenerateMediaTestMutation,
    type MediaModel,
} from '@/redux/media-api';
import { useTestMode } from '@/hooks/use-test-mode';
import { useModelType } from '@/hooks/use-model-type';
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
    /** Функция прокрутки списка сообщений вниз */
    scrollToBottom?: () => void;
    /** Показывать ли кнопку прокрутки вниз */
    showScrollButton?: boolean;
}

export interface ChatInputRef {
    setPrompt: (prompt: string) => void;
    addFileFromUrl: (url: string, filename: string) => Promise<void>;
    setRequestData: (
        request: import('@/redux/media-api').MediaRequest
    ) => Promise<void>;
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
            scrollToBottom,
            showScrollButton,
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
        const [veoGenerationType, setVeoGenerationType] = useState<
            | 'TEXT_2_VIDEO'
            | 'FIRST_AND_LAST_FRAMES_2_VIDEO'
            | 'REFERENCE_2_VIDEO'
            | undefined
        >(undefined);
        const [sound, setSound] = useState<boolean | undefined>(undefined);
        const [negativePrompt, setNegativePrompt] = useState<string>('');
        const [seed, setSeed] = useState<string | number | undefined>(
            undefined
        );
        const [cfgScale, setCfgScale] = useState<number | undefined>(undefined);
        // Параметры для ElevenLabs Multilingual v2
        const [voice, setVoice] = useState<string>('Rachel');
        const [stability, setStability] = useState<number>(0.5);
        const [similarityBoost, setSimilarityBoost] = useState<number>(0.75);
        const [speed, setSpeed] = useState<number>(1);
        const [languageCode, setLanguageCode] = useState<string>('');
        const [isLockEnabled, setIsLockEnabled] = useState(false);

        // Список доступных голосов для ElevenLabs
        const elevenLabsVoices = [
            'Rachel',
            'Aria',
            'Roger',
            'Sarah',
            'Laura',
            'Charlie',
            'George',
            'Callum',
            'River',
            'Liam',
            'Charlotte',
            'Alice',
            'Matilda',
            'Will',
            'Jessica',
            'Eric',
            'Chris',
            'Brian',
            'Daniel',
            'Lily',
            'Bill',
        ];
        const [needsScrollbar, setNeedsScrollbar] = useState(false);
        const [attachingFile, setAttachingFile] = useState(false);

        const { isTestMode } = useTestMode();
        const fileInputRef = useRef<HTMLInputElement>(null);
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        const [generateMedia] = useGenerateMediaMutation();
        const [generateMediaTest] = useGenerateMediaTestMutation();

        // Поле не блокируется на время выполнения запроса для поддержки параллельных запросов
        const isDisabled = disabled ?? false;

        // Используем хук для получения всех флагов модели
        const modelType = useModelType(currentModel);

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
        } = useChatInputFiles(chatId);

        // Создаем функцию для эффекта загрузки
        const loadingEffectForAttachFile = useMemo(
            () => createLoadingEffectForAttachFile(setAttachingFile),
            []
        );

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

        const MAX_PROMPT_LENGTH = 5000;

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
                const value = e.target.value;
                setPrompt(value.slice(0, MAX_PROMPT_LENGTH));

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
            setRequestData: async (
                request: import('@/redux/media-api').MediaRequest
            ) => {
                setPrompt(request.prompt);

                const settings = request.settings || {};

                // Универсальные параметры
                if (settings.format) setFormat(settings.format as any);
                if (settings.quality) setQuality(settings.quality as any);

                // Видео параметры (Veo, Kling)
                if (settings.duration) setDuration(settings.duration as any);
                if (settings.veoGenerationType)
                    setVeoGenerationType(settings.veoGenerationType as any);
                if (settings.sound !== undefined)
                    setSound(settings.sound as boolean);

                // Imagen4 / Kling 2.5 параметры
                if (settings.negativePrompt)
                    setNegativePrompt(settings.negativePrompt as string);
                if (settings.seed || request.seed)
                    setSeed((settings.seed || request.seed) as any);
                if (settings.cfgScale) setCfgScale(settings.cfgScale as number);

                // ElevenLabs параметры
                if (settings.voice) setVoice(settings.voice as string);
                if (settings.stability !== undefined)
                    setStability(settings.stability as number);
                if (settings.similarityBoost !== undefined)
                    setSimilarityBoost(settings.similarityBoost as number);
                if (settings.speed !== undefined)
                    setSpeed(settings.speed as number);
                if (settings.languageCode)
                    setLanguageCode(settings.languageCode as string);

                // Обработка входных файлов
                clearFiles();

                if (request.inputFiles && request.inputFiles.length > 0) {
                    const { getMediaFileUrl } = await import('@/lib/constants');
                    for (const filePath of request.inputFiles) {
                        // Если это URL (начинается с http), используем как есть, иначе через getMediaFileUrl
                        const url = filePath.startsWith('http')
                            ? filePath
                            : getMediaFileUrl(filePath);
                        const filename = filePath.split('/').pop() || 'file';
                        await addFileFromUrl(url, filename);
                    }
                }

                // Фокусируемся на поле ввода и ставим курсор в конец
                setTimeout(() => {
                    const textarea = textareaRef.current;
                    if (textarea) {
                        textarea.focus();
                        textarea.setSelectionRange(
                            request.prompt.length,
                            request.prompt.length
                        );
                    }
                }, 100);
            },
        }));

        // Загружаем настройки из localStorage при монтировании компонента
        useEffect(() => {
            const settings = loadMediaSettings();
            const config = getModelSettingsConfig(currentModel);

            // Загружаем format (универсальный для всех моделей)
            if (settings.format) {
                setFormat(settings.format);
            } else if (modelType.isVeo && settings.videoFormat) {
                // Для Veo используем videoFormat из старых настроек
                setFormat(settings.videoFormat);
            } else if (
                (modelType.isKling || modelType.isKling25) &&
                settings.klingAspectRatio
            ) {
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

            // Загружаем veoGenerationType
            if (modelType.isVeo && settings.veoGenerationType) {
                setVeoGenerationType(settings.veoGenerationType);
            } else if (config.generationType?.defaultValue) {
                setVeoGenerationType(config.generationType.defaultValue);
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
            if (modelType.isVeo) {
                // Для Veo сохраняем в videoFormat
                saveMediaSettings({
                    videoFormat:
                        format && format !== '1:1'
                            ? (format as '16:9' | '9:16')
                            : undefined,
                    veoGenerationType,
                } as MediaSettings);
            } else if (modelType.isKling || modelType.isKling25) {
                // Для Kling сохраняем в klingAspectRatio, klingDuration, klingSound (только для Kling 2.6)
                saveMediaSettings({
                    klingAspectRatio:
                        format && format !== '1:1'
                            ? (format as '16:9' | '9:16')
                            : undefined,
                    klingDuration: duration,
                    klingSound: modelType.isKling ? sound : undefined,
                });
            } else {
                // Для остальных моделей сохраняем в format и quality
                saveMediaSettings({
                    format: format as MediaSettings['format'],
                    quality,
                });
            }
        }, [format, quality, duration, sound, veoGenerationType, modelType]);

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
                    modelType.isVeo && format && format !== '1:1'
                        ? (format as '16:9' | '9:16')
                        : undefined;
                const klingAspectRatio =
                    (modelType.isKling || modelType.isKling25) &&
                    format &&
                    format !== '1:1'
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
                    veoGenerationType,
                    klingAspectRatio,
                    klingDuration: duration,
                    klingSound: sound,
                    negativePrompt,
                    seed,
                    cfgScale,
                    modelType,
                    voice,
                    stability,
                    similarityBoost,
                    speed,
                    languageCode,
                    isLockEnabled,
                    onClearForm: () => {
                        setPrompt('');
                        if (modelType.isVeo || modelType.isImagen4) {
                            setSeed(undefined);
                        }
                        if (modelType.isImagen4) {
                            setNegativePrompt('');
                        }
                        if (modelType.isKling25) {
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
                modelType,
                voice,
                stability,
                similarityBoost,
                speed,
                languageCode,
                isLockEnabled,
                veoGenerationType,
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
            <div
                id='chat-input'
                className='absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-slate-950/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-cyan-900/20 p-4 z-20'
            >
                {/* Прикрепленные файлы */}
                {attachedFiles.length > 0 ? (
                    <div className='mb-3 flex flex-wrap gap-2 items-center'>
                        {attachedFiles.map((file) => {
                            const isVideo = file.file.type.startsWith('video/');
                            return (
                                <div
                                    key={file.id}
                                    className='group relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-secondary shadow-sm'
                                >
                                    {isVideo ? (
                                        <video
                                            src={file.preview}
                                            className='h-full w-full object-cover'
                                            // muted
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
                                        className='absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground'
                                    >
                                        <X className='h-3 w-3' />
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
                {modelType.isKling25 && (
                    <p className='mb-2 text-xs text-muted-foreground'>
                        Для image-to-video: первое изображение — начальный кадр,
                        второе — финальный кадр (tail)
                    </p>
                )}

                {/* Подсказка для Seedream 4.5 Edit */}
                {modelType.isSeedream4_5_Edit && (
                    <p className='mb-2 text-xs text-muted-foreground'>
                        Seedream 4.5 Edit поддерживает до 14 изображений для
                        редактирования
                    </p>
                )}

                {/* Верхняя панель с выбором модели и настроек */}
                <div className='mb-2 flex flex-wrap items-center gap-2'>
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
                        veoGenerationType={veoGenerationType}
                        onVeoGenerationTypeChange={setVeoGenerationType}
                        disabled={isDisabled}
                    />
                </div>
                {/* Поле для Veo 3.1: seed */}
                {modelType.isVeo && (
                    <div className='flex gap-2 mb-2'>
                        <div className='w-74'>
                            <NumberInput
                                placeholder='Seed (опционально, 10000-99999)'
                                value={seed}
                                onValueChange={setSeed}
                                disabled={isDisabled}
                                className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl'
                                min={10000}
                                max={99999}
                            />
                        </div>
                    </div>
                )}

                {/* Поля для Imagen4: negativePrompt и seed */}
                {modelType.isImagen4 && (
                    <div className='flex gap-2 mb-2'>
                        <Input
                            type='text'
                            placeholder='Негативный промпт (опционально)'
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            disabled={isDisabled}
                            className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl'
                        />
                        <NumberInput
                            placeholder='Seed (опционально)'
                            value={seed}
                            onValueChange={setSeed}
                            disabled={isDisabled}
                            className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-40'
                        />
                    </div>
                )}

                {/* Поля для Kling 2.5 Turbo Pro: negativePrompt и cfgScale */}
                {modelType.isKling25 && (
                    <div className='flex gap-2 mb-2'>
                        <Input
                            type='text'
                            placeholder='Негативный промпт (опционально)'
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            disabled={isDisabled}
                            className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl'
                        />
                        <NumberInput
                            placeholder='CFG Scale (опционально, 1-20)'
                            value={cfgScale}
                            onValueChange={setCfgScale}
                            disabled={isDisabled}
                            className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-40'
                            min={1}
                            max={20}
                        />
                    </div>
                )}

                {/* Поля для ElevenLabs Multilingual v2 */}
                {modelType.isElevenLabs && (
                    <div className='mb-2 space-y-2'>
                        <div className='flex flex-wrap gap-2'>
                            <div className='flex flex-col'>
                                <p className='mb-1 text-xs text-muted-foreground'>
                                    Голос
                                </p>
                                <Select
                                    value={voice}
                                    onValueChange={setVoice}
                                    disabled={isDisabled}
                                    // modal={false}
                                >
                                    <SelectTrigger className='w-40 border-border bg-secondary text-foreground focus-visible:ring-primary rounded-xl'>
                                        <SelectValue placeholder='Выберите голос' />
                                    </SelectTrigger>
                                    <SelectContent
                                        side='top'
                                        sideOffset={8}
                                        position='popper'
                                        collisionPadding={20}
                                        avoidCollisions={true}
                                        className='border-border bg-card data-[side=top]:animate-none!'
                                    >
                                        {elevenLabsVoices.map((voiceOption) => (
                                            <SelectItem
                                                key={voiceOption}
                                                value={voiceOption}
                                                className='text-foreground focus:bg-secondary focus:text-foreground'
                                            >
                                                {voiceOption}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className='flex flex-col'>
                                <p className='mb-1 text-xs text-muted-foreground'>
                                    Стабильность (0-1)
                                </p>
                                <NumberInput
                                    placeholder='0.5'
                                    value={stability}
                                    onValueChange={(value) =>
                                        setStability(value ?? 0.5)
                                    }
                                    disabled={isDisabled}
                                    className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-36'
                                    min={0}
                                    max={1}
                                    step={0.1}
                                />
                            </div>
                            <div className='flex flex-col'>
                                <p className='mb-1 text-xs text-muted-foreground'>
                                    Усиление сходства (0-1)
                                </p>
                                <NumberInput
                                    placeholder='0.75'
                                    value={similarityBoost}
                                    onValueChange={(value) =>
                                        setSimilarityBoost(value ?? 0.75)
                                    }
                                    disabled={isDisabled}
                                    className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-44'
                                    min={0}
                                    max={1}
                                    step={0.1}
                                />
                            </div>
                            <div className='flex flex-col'>
                                <p className='mb-1 text-xs text-muted-foreground'>
                                    Скорость (0.5-2)
                                </p>
                                <NumberInput
                                    placeholder='1'
                                    value={speed}
                                    onValueChange={(value) =>
                                        setSpeed(value ?? 1)
                                    }
                                    disabled={isDisabled}
                                    className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-36'
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                />
                            </div>
                            <div className='flex flex-col'>
                                <p className='mb-1 text-xs text-slate-400'>
                                    Код языка (опционально)
                                </p>
                                <Input
                                    type='text'
                                    placeholder='ru, en, es...'
                                    value={languageCode}
                                    onChange={(e) =>
                                        setLanguageCode(e.target.value)
                                    }
                                    disabled={isDisabled}
                                    className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-40'
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Поле ввода с кнопками внутри */}
                <div
                    className={cn(
                        'relative rounded-xl transition-all',
                        isDragging &&
                            'border-2 border-primary bg-secondary/80 p-1'
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
                        maxLength={MAX_PROMPT_LENGTH}
                        className={cn(
                            'min-h-[76px] max-h-[20vh] resize-none border-border bg-secondary pb-10 pl-4 pr-12 text-foreground placeholder:text-muted-foreground rounded-xl transition-all',
                            'focus-visible:ring-primary focus-visible:border-primary',
                            needsScrollbar &&
                                'overflow-y-auto custom-scrollbar',
                            !needsScrollbar && 'overflow-y-hidden',
                            isDragging && 'border-primary'
                        )}
                        style={{ height: 'auto' }}
                        disabled={isDisabled}
                    />

                    {/* Счетчик символов */}
                    <div
                        className={cn(
                            'absolute bottom-2.5 right-12 text-[10px] select-none pointer-events-none transition-colors px-1 rounded bg-background/50',
                            prompt.length >= MAX_PROMPT_LENGTH
                                ? 'text-destructive'
                                : prompt.length >= MAX_PROMPT_LENGTH * 0.9
                                  ? 'text-primary'
                                  : 'text-muted-foreground'
                        )}
                    >
                        {prompt.length}/{MAX_PROMPT_LENGTH}
                    </div>

                    {/* Кнопки слева внутри поля ввода */}
                    <div className='absolute bottom-1.5 left-1.5 flex items-center gap-0'>
                        <Button
                            type='button'
                            size='icon-sm'
                            variant='ghost'
                            className={cn(
                                'h-8 w-8 hover:bg-secondary',
                                attachedFiles.length > 0
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-primary'
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
                                'h-8 w-8 hover:bg-secondary',
                                isLockEnabled
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
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
                        className='absolute bottom-1.5 right-1.5 bg-primary hover:bg-primary/90 text-primary-foreground'
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
                <p className='mt-2 text-xs text-muted-foreground'>
                    Enter — отправить, Shift+Enter — новая строка. Можно
                    перетаскивать файлы или вставлять из буфера обмена
                    (Ctrl+V/Cmd+V)
                </p>

                {/* Кнопка прокрутки вниз */}
                {showScrollButton && scrollToBottom && (
                    <Button
                        size='icon'
                        variant='secondary'
                        className='absolute -top-14 right-1 z-30 h-10 w-10 rounded-full bg-slate-950/60 backdrop-blur-xl text-foreground shadow-2xl shadow-cyan-900/20 border border-white/10 hover:bg-slate-950/80'
                        onClick={scrollToBottom}
                    >
                        <ChevronDown className='h-6 w-6' />
                    </Button>
                )}
            </div>
        );
    }
);
