// Компонент ввода промпта с прикреплением файлов
import {
    useState,
    useRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    forwardRef,
    useMemo,
} from "react";
import {
    Send,
    Paperclip,
    X,
    Loader2,
    Lock,
    Unlock,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { loadLockButtonState, saveLockButtonState } from "@/lib/saved-prompts";
import { createLoadingEffectForAttachFile } from "@/lib/media-utils";
import { ModelSelector } from "./model-selector";
import {
    useGenerateMediaMutation,
    useGenerateMediaTestMutation,
    usePromptEnhanceMutation,
    type MediaModel,
} from "@/redux/media-api";
import { useGetModelsQuery } from "@/redux/api/models.endpoints";
import { useTestMode } from "@/hooks/use-test-mode";
import { useModelType } from "@/hooks/use-model-type";
import { useChatInputFiles } from "./chat-input/use-chat-input-files";
import {
    useChatInputSubmit,
    type SubmitParams,
} from "./chat-input/use-chat-input-submit";
import { ModelSettingsPanel } from "./chat-input/model-settings";
import {
    useModelSettings,
    type FormatValue,
    type QualityValue,
    type DurationValue,
} from "./chat-input/use-model-settings";
import type { AppMode } from "@/lib/app-mode";
import { APP_MODES } from "@/lib/app-mode";
import { LORAS, MAX_WAVESPEED_LORA_COUNT } from "@shared/constants/loras";

const LORA_SELECT_NONE = "__lora_none__";

interface LoraSlotRow {
    path: string;
    scale: number;
}

function normalizeLoraSlotsAfterClear(sliced: LoraSlotRow[]): LoraSlotRow[] {
    if (sliced.length === 0) return [{ path: "", scale: 1 }];
    const last = sliced[sliced.length - 1];
    if (last.path !== "") return [...sliced, { path: "", scale: 1 }];
    return sliced;
}

function buildLoraSlotRowsFromSaved(
    saved: Array<{ path?: unknown; scale?: unknown }>,
): LoraSlotRow[] {
    const rows: LoraSlotRow[] = saved
        .filter(
            (l) =>
                typeof l.path === "string" && String(l.path).trim().length > 0,
        )
        .slice(0, MAX_WAVESPEED_LORA_COUNT)
        .map((l) => ({
            path: String(l.path).trim(),
            scale: typeof l.scale === "number" ? l.scale : 1,
        }));
    if (rows.length === 0) return [{ path: "", scale: 1 }];
    if (rows.length < MAX_WAVESPEED_LORA_COUNT)
        return [...rows, { path: "", scale: 1 }];
    return rows;
}

// Список доступных голосов для ElevenLabs (вне компонента — не пересоздаётся при рендере)
const ELEVENLABS_VOICES = [
    "Roger",
    "Sarah",
    "Charlie",
    "George",
    "Callum",
    "River",
    "Liam",
    "Alice",
    "Matilda",
    "Will",
    "Jessica",
    "Eric",
    "Chris",
    "Brian",
    "Daniel",
    "Lily",
    "Bill",
] as const;

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
    appMode?: AppMode;
}

export interface ChatInputRef {
    setPrompt: (prompt: string) => void;
    addFileFromUrl: (
        url: string,
        filename: string,
        imgbbUrl?: string,
    ) => Promise<void>;
    setRequestData: (
        request: import("@/redux/media-api").MediaRequest,
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
            appMode = APP_MODES.DEFAULT,
        },
        ref,
    ) {
        const [prompt, setPrompt] = useState("");
        const [enhancedPrompt, setEnhancedPrompt] = useState("");
        const [triggerWord, setTriggerWord] = useState("");
        const [loraSlotRows, setLoraSlotRows] = useState<LoraSlotRow[]>([
            { path: "", scale: 1 },
        ]);
        const [isLockEnabled, setIsLockEnabled] = useState(false);

        // Используем хук для управления настройками модели
        const {
            settings,
            setKlingMotionCharacterOrientation,
            setKlingMotionVideoQuality,
            setFormat,
            setQuality,
            setDuration,
            setSound,
            setFixedLens,
            setVeoGenerationType,
            setNegativePrompt,
            setSeed,
            setCfgScale,
            setVoice,
            setStability,
            setSimilarityBoost,
            setSpeed,
            setLanguageCode,
            resetModelSpecificSettings,
        } = useModelSettings(currentModel);

        const [needsScrollbar, setNeedsScrollbar] = useState(false);
        const [attachingFile, setAttachingFile] = useState(false);

        const { isTestMode } = useTestMode();
        const fileInputRef = useRef<HTMLInputElement>(null);
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const enhancedTextareaRef = useRef<HTMLTextAreaElement>(null);
        const compactMainPromptRef = useRef(false);
        const enhancedExpandedRef = useRef(false);

        const [enhancedPromptFocused, setEnhancedPromptFocused] =
            useState(false);
        const [needsScrollbarEnhanced, setNeedsScrollbarEnhanced] =
            useState(false);

        const [generateMedia] = useGenerateMediaMutation();
        const [generateMediaTest] = useGenerateMediaTestMutation();
        const [promptEnhance, { isLoading: isEnhancingPrompt }] =
            usePromptEnhanceMutation();
        // Поле не блокируется на время выполнения запроса для поддержки параллельных запросов
        const isDisabled = disabled ?? false;

        // Используем хук для получения всех флагов модели
        const modelType = useModelType(currentModel);
        const isAiModelMode = appMode === APP_MODES.AI_MODEL;

        const isEnhancedPromptExpanded =
            enhancedPrompt.trim().length > 0 || enhancedPromptFocused;
        compactMainPromptRef.current =
            isAiModelMode && isEnhancedPromptExpanded;
        enhancedExpandedRef.current = isEnhancedPromptExpanded;

        // Деструктурируем настройки для удобства
        const {
            format,
            quality,
            duration,
            sound,
            veoGenerationType,
            negativePrompt,
            seed,
            cfgScale,
            voice,
            stability,
            similarityBoost,
            speed,
            languageCode,
            fixedLens,
        } = settings;

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
        } = useChatInputFiles(
            chatId,
            appMode,
            currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED",
        );

        // Создаем функцию для эффекта загрузки
        const loadingEffectForAttachFile = useMemo(
            () => createLoadingEffectForAttachFile(setAttachingFile),
            [],
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
                appMode,
            });

        // Получаем модели для определения promptLimit
        const { data: models } = useGetModelsQuery({ appMode });
        const currentModelConfig = useMemo(
            () => models?.find((m) => m.key === currentModel),
            [models, currentModel],
        );
        const MAX_PROMPT_LENGTH = currentModelConfig?.promptLimit ?? 5000;

        const measureTextareaOneLineCap = (el: HTMLTextAreaElement) => {
            const lineStyle = getComputedStyle(el);
            const lineHeight = parseFloat(lineStyle.lineHeight) || 22;
            const paddingTop = parseFloat(lineStyle.paddingTop) || 8;
            const paddingBottom = parseFloat(lineStyle.paddingBottom) || 8;
            return Math.ceil(lineHeight + paddingTop + paddingBottom);
        };

        // Функция для обновления высоты textarea (основной промпт)
        const adjustTextareaHeight = useCallback(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            textarea.style.height = "auto";
            const scrollHeight = textarea.scrollHeight;

            if (compactMainPromptRef.current) {
                const oneLineCap = measureTextareaOneLineCap(textarea);
                const newHeight = Math.min(scrollHeight, oneLineCap);
                textarea.style.height = `${newHeight}px`;
                setNeedsScrollbar(scrollHeight > newHeight + 1);
                return;
            }

            const maxHeight = window.innerHeight * 0.2;
            const newHeight = Math.min(scrollHeight, maxHeight);
            textarea.style.height = `${newHeight}px`;
            const needsScroll = scrollHeight > newHeight + 1;
            setNeedsScrollbar(needsScroll);
        }, []);

        const adjustEnhancedTextareaHeight = useCallback(() => {
            const el = enhancedTextareaRef.current;
            if (!el) return;

            el.style.height = "auto";
            const scrollHeight = el.scrollHeight;

            if (!enhancedExpandedRef.current) {
                const oneLineCap = measureTextareaOneLineCap(el);
                const newHeight = Math.min(scrollHeight, oneLineCap);
                el.style.height = `${newHeight}px`;
                setNeedsScrollbarEnhanced(scrollHeight > newHeight + 1);
                return;
            }

            const maxHeight = window.innerHeight * 0.2;
            const newHeight = Math.min(scrollHeight, maxHeight);
            el.style.height = `${newHeight}px`;
            setNeedsScrollbarEnhanced(scrollHeight > newHeight + 1);
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
            [adjustTextareaHeight],
        );

        // Обновление высоты при изменении prompt извне
        useEffect(() => {
            requestAnimationFrame(() => {
                adjustTextareaHeight();
            });
        }, [prompt, adjustTextareaHeight, isEnhancedPromptExpanded]);

        useEffect(() => {
            requestAnimationFrame(() => {
                adjustEnhancedTextareaHeight();
            });
        }, [
            enhancedPrompt,
            adjustEnhancedTextareaHeight,
            isEnhancedPromptExpanded,
        ]);

        // Обновление высоты при изменении размера окна
        useEffect(() => {
            const handleResize = () => {
                adjustTextareaHeight();
                adjustEnhancedTextareaHeight();
            };

            window.addEventListener("resize", handleResize);
            return () => {
                window.removeEventListener("resize", handleResize);
            };
        }, [adjustTextareaHeight, adjustEnhancedTextareaHeight]);

        // Экспортируем методы для работы с промптом и файлами извне
        useImperativeHandle(ref, () => ({
            setPrompt: (newPrompt: string) => {
                setPrompt(newPrompt);
                // Фокусируемся на textarea после установки промпта
                setTimeout(() => {
                    const textarea = textareaRef.current;
                    if (textarea) {
                        textarea.focus();
                        textarea.setSelectionRange(
                            newPrompt.length,
                            newPrompt.length,
                        );
                    }
                }, 0);
            },
            addFileFromUrl,
            setRequestData: async (
                request: import("@/redux/media-api").MediaRequest,
            ) => {
                setPrompt(request.prompt);

                const settings = request.settings || {};

                // Универсальные параметры
                if (settings.format) setFormat(settings.format as FormatValue);
                if (settings.quality)
                    setQuality(settings.quality as QualityValue);

                // Видео параметры (Veo, Kling)
                if (settings.duration)
                    setDuration(settings.duration as DurationValue);
                if (settings.veoGenerationType)
                    setVeoGenerationType(
                        settings.veoGenerationType as
                            | "TEXT_2_VIDEO"
                            | "FIRST_AND_LAST_FRAMES_2_VIDEO"
                            | "REFERENCE_2_VIDEO"
                            | "EXTEND_VIDEO",
                    );
                if (settings.sound !== undefined)
                    setSound(settings.sound as boolean);

                // Imagen4 / Kling 2.5 параметры
                if (settings.negativePrompt)
                    setNegativePrompt(settings.negativePrompt as string);
                if (settings.enhancedPrompt)
                    setEnhancedPrompt(settings.enhancedPrompt as string);
                if (settings.triggerWord)
                    setTriggerWord(settings.triggerWord as string);
                else setTriggerWord("");
                if (settings.seed || request.seed)
                    setSeed((settings.seed || request.seed) as string | number);
                if (settings.cfgScale) setCfgScale(settings.cfgScale as number);
                if (Array.isArray(settings.loras)) {
                    setLoraSlotRows(
                        buildLoraSlotRowsFromSaved(
                            settings.loras as Array<{
                                path?: unknown;
                                scale?: unknown;
                            }>,
                        ),
                    );
                } else {
                    setLoraSlotRows([{ path: "", scale: 1 }]);
                }

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
                    const { getMediaFileUrl } = await import("@/lib/constants");
                    for (const filePath of request.inputFiles) {
                        try {
                            // Если это URL (начинается с http), используем как есть, иначе через getMediaFileUrl
                            const url = filePath.startsWith("http")
                                ? filePath
                                : getMediaFileUrl(filePath);
                            const filename =
                                filePath.split("/").pop() || "file";
                            // Для imgbb URL передаём как imgbbUrl — не загружаем повторно
                            const imgbbUrl = filePath.startsWith("http")
                                ? filePath
                                : undefined;
                            await addFileFromUrl(url, filename, imgbbUrl);
                        } catch (error) {
                            console.error(
                                "[ChatInput] Ошибка при прикреплении файла из запроса:",
                                error,
                            );
                            const errorMessage =
                                error instanceof Error
                                    ? error.message
                                    : "Неизвестная ошибка при прикреплении файла";
                            alert(
                                `Ошибка при прикреплении файла "${filePath}": ${errorMessage}`,
                            );
                        }
                    }
                }

                // Фокусируемся на поле ввода и ставим курсор в конец
                setTimeout(() => {
                    const textarea = textareaRef.current;
                    if (textarea) {
                        textarea.focus();
                        textarea.setSelectionRange(
                            request.prompt.length,
                            request.prompt.length,
                        );
                    }
                }, 100);
            },
        }));

        // Загружаем состояние кнопки замочка при монтировании
        useEffect(() => {
            const lockState = loadLockButtonState();
            setIsLockEnabled(lockState);
        }, []);

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
                    fileInputRef.current.value = "";
                }
            },
            [handleFileSelectHook],
        );

        // Обработчик отправки запроса
        const onSubmit = useCallback(
            (event?: React.MouseEvent | React.KeyboardEvent) => {
                // Проверяем только внешнюю блокировку
                if (isDisabled) {
                    console.warn(
                        "[ChatInput] ⚠️ Попытка повторной отправки (компонент заблокирован), игнорируем",
                    );
                    return;
                }

                // Определяем videoFormat и klingAspectRatio для отправки (нужны разные параметры API)
                // Для Veo и Kling формат '1:1' не поддерживается, поэтому фильтруем его
                const videoFormat =
                    modelType.isVeo && format && format !== "1:1"
                        ? (format as "16:9" | "9:16")
                        : undefined;
                const klingAspectRatio =
                    (modelType.isKling || modelType.isKling25) &&
                    format &&
                    format !== "1:1"
                        ? (format as "16:9" | "9:16")
                        : undefined;

                const params: SubmitParams = {
                    prompt,
                    enhancedPrompt:
                        isAiModelMode && enhancedPrompt.trim()
                            ? enhancedPrompt.trim()
                            : undefined,
                    attachedFiles,
                    format: format as
                        | "1:1"
                        | "4:3"
                        | "3:4"
                        | "4:5"
                        | "9:16"
                        | "16:9"
                        | "2:3"
                        | "3:2"
                        | "21:9"
                        | undefined,
                    quality,
                    videoFormat,
                    veoGenerationType,
                    klingAspectRatio,
                    klingDuration:
                        modelType.supportsDuration && duration !== undefined
                            ? duration
                            : undefined,
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
                        setPrompt("");
                        setEnhancedPrompt("");
                        setTriggerWord("");
                        resetModelSpecificSettings();
                        setLoraSlotRows([{ path: "", scale: 1 }]);
                        clearFiles();
                    },
                    fixedLens: undefined,
                    klingMotionCharacterOrientation:
                        settings.klingMotionCharacterOrientation,
                    klingMotionVideoQuality: settings.klingMotionVideoQuality,
                    loras: loraSlotRows
                        .filter((row) => row.path.trim().length > 0)
                        .slice(0, MAX_WAVESPEED_LORA_COUNT)
                        .map((row) => ({
                            path: row.path.trim(),
                            scale: row.scale,
                        })),
                    triggerWord:
                        currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED"
                            ? triggerWord
                            : undefined,
                    appMode,
                };
                handleSubmit(event, {
                    ...params,
                    // fixedLens используется только для Seedance 1.5 Pro
                    fixedLens:
                        currentModel === "SEEDANCE_1_5_PRO_KIEAI"
                            ? fixedLens
                            : undefined,
                });
            },
            [
                isDisabled,
                handleSubmit,
                prompt,
                enhancedPrompt,
                appMode,
                isAiModelMode,
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
                loraSlotRows,
                clearFiles,
                triggerWord,
            ],
        );

        const isLoraEnabledWavespeedModel =
            currentModel === "Z_IMAGE_TURBO_LORA_WAVESPEED" ||
            currentModel === "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED" ||
            currentModel === "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED";

        const handleEnhancePrompt = useCallback(async () => {
            if (!isAiModelMode || !prompt.trim()) return;
            try {
                const attachments = attachedFiles
                    .map((file) => file.imgbbUrl || file.preview)
                    .filter((value): value is string => Boolean(value));
                const result = await promptEnhance({
                    appMode: APP_MODES.AI_MODEL,
                    prompt: prompt.trim(),
                    attachments,
                }).unwrap();
                setEnhancedPrompt(result.enhancedPrompt);
                setNegativePrompt(result.negativePrompt);
            } catch (error) {
                const errorMessage =
                    error &&
                    typeof error === "object" &&
                    "data" in error &&
                    error.data &&
                    typeof error.data === "object" &&
                    "error" in error.data &&
                    typeof error.data.error === "string"
                        ? error.data.error
                        : "Не удалось улучшить промпт";
                alert(errorMessage);
            }
        }, [
            isAiModelMode,
            prompt,
            attachedFiles,
            promptEnhance,
            setNegativePrompt,
        ]);

        const handleLoraSlotPathChange = useCallback(
            (index: number, path: string) => {
                setLoraSlotRows((prev) => {
                    if (path === "")
                        return normalizeLoraSlotsAfterClear(
                            prev.slice(0, index),
                        );

                    const next = [...prev];
                    next[index] = {
                        path,
                        scale: next[index]?.scale ?? 1,
                    };
                    const last = next[next.length - 1];
                    const filled = next.filter((r) => r.path).length;
                    if (last.path !== "" && filled < MAX_WAVESPEED_LORA_COUNT)
                        next.push({ path: "", scale: 1 });
                    return next;
                });
            },
            [],
        );

        const handleLoraScaleChange = useCallback(
            (index: number, scale: number | undefined) => {
                setLoraSlotRows((prev) =>
                    prev.map((row, i) =>
                        i === index && row.path
                            ? { ...row, scale: scale ?? 1 }
                            : row,
                    ),
                );
            },
            [],
        );

        useEffect(() => {
            if (!isLoraEnabledWavespeedModel)
                setLoraSlotRows([{ path: "", scale: 1 }]);
        }, [isLoraEnabledWavespeedModel]);

        // Обработка Enter для отправки
        const handleKeyDown = useCallback(
            (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    // Предотвращаем отправку только если идет подготовка запроса или компонент заблокирован
                    if (submitInProgressRef.current || isDisabled) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                    onSubmit(event);
                }
            },
            [submitInProgressRef, isDisabled, onSubmit],
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
                className={cn(
                    "absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-950/60 backdrop-blur-xl rounded-3xl border border-white/10 p-4 z-20",
                    isAiModelMode
                        ? "shadow-2xl shadow-emerald-900/30"
                        : "shadow-2xl shadow-cyan-900/20",
                )}
            >
                {/* Прикрепленные файлы */}
                {attachedFiles.length > 0 ? (
                    <div className='mb-3 flex flex-wrap gap-2 items-center'>
                        {attachedFiles.map((file) => {
                            const isVideo = file.file.type.startsWith("video/");
                            const isZipArchive =
                                file.file.type === "application/zip" ||
                                file.file.name.toLowerCase().endsWith(".zip");
                            return (
                                <div
                                    key={file.id}
                                    className='group relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-secondary shadow-sm'
                                >
                                    {isZipArchive ? (
                                        <div className='flex h-full w-full items-center justify-center px-1 text-[10px] font-medium text-slate-300 text-center leading-tight'>
                                            ZIP
                                        </div>
                                    ) : isVideo ? (
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

                {/* LoRA из каталога (до MAX_WAVESPEED_LORA_COUNT) — каскадные селекты */}
                {isLoraEnabledWavespeedModel && (
                    <div className='mb-2 space-y-2'>
                        <p className='mb-3 text-xs text-muted-foreground'>
                            LoRA (до {MAX_WAVESPEED_LORA_COUNT}): выберите из
                            списка; следующий ряд появляется после выбора
                        </p>
                        {loraSlotRows.map((row, index) => {
                            const takenElsewhere = new Set(
                                loraSlotRows
                                    .filter((_, i) => i !== index)
                                    .map((r) => r.path)
                                    .filter(Boolean),
                            );
                            const options = LORAS.filter(
                                (o) =>
                                    !takenElsewhere.has(o.value) ||
                                    o.value === row.path,
                            );
                            const selectedMeta = row.path
                                ? LORAS.find((o) => o.value === row.path)
                                : undefined;
                            return (
                                <div
                                    key={`lora-slot-${index}`}
                                    className='flex flex-col gap-0'
                                >
                                    {row.path && selectedMeta ? (
                                        <div className='space-y-0.5 pl-0.5'>
                                            {/* <p className='text-xs font-medium text-foreground'>
                                                {selectedMeta.label}
                                            </p> */}
                                            {/* {selectedMeta.description ? (
                                                <p className='text-[10px] text-muted-foreground leading-snug'>
                                                    {selectedMeta.description}
                                                </p>
                                            ) : null} */}
                                        </div>
                                    ) : null}
                                    <div className='flex flex-row items-center gap-2'>
                                        <div className='min-w-0 flex-1'>
                                            <Select
                                                value={
                                                    row.path
                                                        ? row.path
                                                        : LORA_SELECT_NONE
                                                }
                                                onValueChange={(v) =>
                                                    handleLoraSlotPathChange(
                                                        index,
                                                        v === LORA_SELECT_NONE
                                                            ? ""
                                                            : v,
                                                    )
                                                }
                                                disabled={isDisabled}
                                            >
                                                <SelectTrigger className='w-full border-border bg-secondary text-foreground rounded-xl h-9 text-xs'>
                                                    <SelectValue placeholder='Выбрать LoRA' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem
                                                        value={LORA_SELECT_NONE}
                                                        className='text-xs'
                                                    >
                                                        Не выбрано
                                                    </SelectItem>
                                                    {options.map((o) => (
                                                        <SelectItem
                                                            key={o.value}
                                                            value={o.value}
                                                            className='text-xs'
                                                        >
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {row.path ? (
                                            <NumberInput
                                                aria-label='Сила LoRA'
                                                placeholder='Сила'
                                                value={row.scale}
                                                onValueChange={(value) =>
                                                    handleLoraScaleChange(
                                                        index,
                                                        value,
                                                    )
                                                }
                                                disabled={isDisabled}
                                                className='w-24 shrink-0 border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl h-9 text-xs'
                                                min={0}
                                                max={2}
                                                step={0.1}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED" && (
                    <div className='mb-2'>
                        <Input
                            type='text'
                            placeholder='Trigger word для LoRA (например alina_style)'
                            value={triggerWord}
                            onChange={(e) => setTriggerWord(e.target.value)}
                            disabled={isDisabled}
                            className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl'
                        />
                        <p className='mt-1 text-xs text-muted-foreground'>
                            ZIP для тренировки: максимум 50MB
                        </p>
                    </div>
                )}

                {isAiModelMode && (
                    <div className='mb-2'>
                        <Textarea
                            ref={enhancedTextareaRef}
                            value={enhancedPrompt}
                            onChange={(e) => {
                                setEnhancedPrompt(
                                    e.target.value.slice(0, MAX_PROMPT_LENGTH),
                                );
                                requestAnimationFrame(() =>
                                    adjustEnhancedTextareaHeight(),
                                );
                            }}
                            onFocus={() => setEnhancedPromptFocused(true)}
                            onBlur={() => setEnhancedPromptFocused(false)}
                            disabled={isDisabled}
                            placeholder='Улучшенный промпт'
                            maxLength={MAX_PROMPT_LENGTH}
                            className={cn(
                                "w-full resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground rounded-xl transition-[min-height,max-height] focus-visible:ring-emerald-500 focus-visible:border-emerald-500/50",
                                isEnhancedPromptExpanded
                                    ? "min-h-[76px] max-h-[20vh] py-2 pl-3 pr-3"
                                    : "min-h-9 max-h-9 py-2 pl-3 pr-3 overflow-y-hidden",
                                isEnhancedPromptExpanded &&
                                    needsScrollbarEnhanced &&
                                    "overflow-y-auto custom-scrollbar",
                                isEnhancedPromptExpanded &&
                                    !needsScrollbarEnhanced &&
                                    "overflow-y-hidden",
                            )}
                            style={{ height: "auto" }}
                        />
                    </div>
                )}

                {modelType.supportsNegativePrompt &&
                    !modelType.isImagen4 &&
                    !modelType.isKling25 && (
                        <div className='mb-2'>
                            <Input
                                type='text'
                                placeholder='Негативный промпт (опционально)'
                                value={negativePrompt}
                                onChange={(e) =>
                                    setNegativePrompt(e.target.value)
                                }
                                disabled={isDisabled}
                                className='w-full border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl'
                            />
                        </div>
                    )}

                {/* Подсказка для Seedream 4.5 Edit */}
                {modelType.isSeedream4_5_Edit && (
                    <p className='mb-2 text-xs text-muted-foreground'>
                        Seedream 4.5 Edit поддерживает до 14 изображений для
                        редактирования
                    </p>
                )}

                {/* Подсказка для Seedream 5.0 Edit */}
                {modelType.isSeedream5_Edit && (
                    <p className='mb-2 text-xs text-muted-foreground'>
                        Seedream 5.0 Edit поддерживает до 14 изображений для
                        редактирования
                    </p>
                )}

                {/* Подсказка для Kling Motion Control */}
                {modelType.isKlingMotionControl && (
                    <p className='mb-2 text-xs text-muted-foreground'>
                        Требуется 1 изображение (персонаж) и 1 видео (референс
                        движения). Сначала прикрепите файлы.
                    </p>
                )}

                {/* Настройки Kling Motion Control */}
                {modelType.isKlingMotionControl && (
                    <div className='mb-2 flex flex-wrap items-center gap-2 text-xs'>
                        <Select
                            value={
                                settings.klingMotionCharacterOrientation ??
                                "image"
                            }
                            onValueChange={(v) =>
                                setKlingMotionCharacterOrientation(
                                    v as "image" | "video",
                                )
                            }
                            disabled={isDisabled}
                        >
                            <SelectTrigger className='w-[200px] border-border bg-secondary text-foreground rounded-xl'>
                                <SelectValue placeholder='Ориентация' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='image'>
                                    Как на изображении (макс 10с)
                                </SelectItem>
                                <SelectItem value='video'>
                                    Как на видео (макс 30с)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={settings.klingMotionVideoQuality ?? "720p"}
                            onValueChange={(v) =>
                                setKlingMotionVideoQuality(
                                    v as "720p" | "1080p",
                                )
                            }
                            disabled={isDisabled}
                        >
                            <SelectTrigger className='w-[100px] border-border bg-secondary text-foreground rounded-xl'>
                                <SelectValue placeholder='Разрешение' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='720p'>720p</SelectItem>
                                <SelectItem value='1080p'>1080p</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Дополнительные параметры Seedance 1.5 Pro */}
                {currentModel === "SEEDANCE_1_5_PRO_KIEAI" && (
                    <div className='mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                        <span>Камера:</span>
                        <Select
                            value={
                                fixedLens === undefined
                                    ? "false"
                                    : fixedLens
                                      ? "true"
                                      : "false"
                            }
                            onValueChange={(value) =>
                                setFixedLens(value === "true")
                            }
                            disabled={isDisabled}
                        >
                            <SelectTrigger className='w-[150px] border-border bg-secondary text-foreground rounded-xl'>
                                <SelectValue placeholder='Режим камеры' />
                            </SelectTrigger>
                            <SelectContent
                                side='top'
                                sideOffset={8}
                                position='popper'
                                collisionPadding={20}
                                avoidCollisions={true}
                                className='border-border bg-card data-[side=top]:animate-none!'
                            >
                                <SelectItem
                                    value='true'
                                    className='text-muted-foreground focus:bg-accent focus:text-accent-foreground'
                                >
                                    Фиксированный ракурс (fixed_lens)
                                </SelectItem>
                                <SelectItem
                                    value='false'
                                    className='text-muted-foreground focus:bg-accent focus:text-accent-foreground'
                                >
                                    Свободная камера
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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
                        appMode={appMode}
                    />

                    <ModelSettingsPanel
                        model={currentModel}
                        format={
                            format as
                                | "1:1"
                                | "4:3"
                                | "3:4"
                                | "4:5"
                                | "9:16"
                                | "16:9"
                                | "2:3"
                                | "3:2"
                                | "21:9"
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

                {/* Поля для Imagen4: negativePrompt (если поддерживается) и seed */}
                {modelType.isImagen4 && (
                    <div className='flex gap-2 mb-2'>
                        {modelType.supportsNegativePrompt ? (
                            <Input
                                type='text'
                                placeholder='Негативный промпт (опционально)'
                                value={negativePrompt}
                                onChange={(e) =>
                                    setNegativePrompt(e.target.value)
                                }
                                disabled={isDisabled}
                                className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl'
                            />
                        ) : null}
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
                {modelType.isKling25 &&
                    (modelType.supportsNegativePrompt ||
                        modelType.supportsCfgScale) && (
                        <div className='flex gap-2 mb-2'>
                            {modelType.supportsNegativePrompt ? (
                                <Input
                                    type='text'
                                    placeholder='Негативный промпт (опционально)'
                                    value={negativePrompt}
                                    onChange={(e) =>
                                        setNegativePrompt(e.target.value)
                                    }
                                    disabled={isDisabled}
                                    className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl'
                                />
                            ) : null}
                            {modelType.supportsCfgScale ? (
                                <NumberInput
                                    placeholder='CFG Scale (опционально, 1-20)'
                                    value={cfgScale}
                                    onValueChange={setCfgScale}
                                    disabled={isDisabled}
                                    className='border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-40'
                                    min={1}
                                    max={20}
                                />
                            ) : null}
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
                                        {ELEVENLABS_VOICES.map(
                                            (voiceOption) => (
                                                <SelectItem
                                                    key={voiceOption}
                                                    value={voiceOption}
                                                    className='text-foreground focus:bg-secondary focus:text-foreground'
                                                >
                                                    {voiceOption}
                                                </SelectItem>
                                            ),
                                        )}
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
                        "relative rounded-xl transition-all",
                        isDragging &&
                            "border-2 border-primary bg-secondary/80 p-1",
                    )}
                    onDragOver={(e) => handleDragOver(e, isDisabled)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, isDisabled)}
                >
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept={
                            currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED"
                                ? "image/*,video/*,.zip,application/zip"
                                : "image/*,video/*"
                        }
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
                            "resize-none border-border bg-secondary pl-4 pr-12 text-foreground placeholder:text-muted-foreground rounded-xl transition-all",
                            isAiModelMode && isEnhancedPromptExpanded
                                ? "min-h-11 max-h-[20vh] py-2 pb-9"
                                : "min-h-[76px] max-h-[20vh] pb-10",
                            "focus-visible:ring-primary focus-visible:border-primary",
                            needsScrollbar &&
                                "overflow-y-auto custom-scrollbar",
                            !needsScrollbar && "overflow-y-hidden",
                            isDragging && "border-primary",
                        )}
                        style={{ height: "auto" }}
                        disabled={isDisabled}
                    />

                    {/* Счетчик символов */}
                    <div
                        className={cn(
                            "absolute bottom-2.5 right-12 text-[10px] select-none pointer-events-none transition-colors px-1 rounded bg-background/50",
                            prompt.length >= MAX_PROMPT_LENGTH
                                ? "text-destructive"
                                : prompt.length >= MAX_PROMPT_LENGTH * 0.9
                                  ? "text-primary"
                                  : "text-muted-foreground",
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
                                "h-8 w-8 hover:bg-secondary",
                                attachedFiles.length > 0
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-primary",
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
                                "h-8 w-8 hover:bg-secondary",
                                isLockEnabled
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                            onClick={toggleLock}
                            disabled={isDisabled}
                            title={
                                isLockEnabled
                                    ? "Сохранение промптов включено"
                                    : "Сохранение промптов выключено"
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
                    {isAiModelMode && (
                        <Button
                            type='button'
                            size='icon-sm'
                            variant='secondary'
                            className={cn(
                                "absolute right-1.5 h-8 w-8 text-emerald-300 hover:text-emerald-200",
                                isEnhancedPromptExpanded
                                    ? "bottom-2"
                                    : "bottom-10",
                            )}
                            onClick={handleEnhancePrompt}
                            disabled={
                                isDisabled ||
                                !prompt.trim() ||
                                isEnhancingPrompt
                            }
                            title='Улучшить промпт (Comet API)'
                        >
                            {isEnhancingPrompt ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <span>✨</span>
                            )}
                        </Button>
                    )}
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
                        className={cn(
                            "absolute -top-14 right-1 z-30 h-10 w-10 rounded-full bg-slate-950/60 backdrop-blur-xl text-foreground shadow-2xl border border-white/10 hover:bg-slate-950/80",
                            isAiModelMode
                                ? "shadow-emerald-900/30"
                                : "shadow-cyan-900/20",
                        )}
                        onClick={scrollToBottom}
                    >
                        <ChevronDown className='h-6 w-6' />
                    </Button>
                )}
            </div>
        );
    },
);
