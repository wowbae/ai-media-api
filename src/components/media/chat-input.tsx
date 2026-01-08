// Компонент ввода промпта с прикреплением файлов
import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Loader2, Lock, Unlock } from 'lucide-react';
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
import { loadMediaSettings, saveMediaSettings } from '@/lib/media-settings';
import {
    loadLockButtonState,
    saveLockButtonState,
    savePrompt,
} from '@/lib/saved-prompts';
import { ModelSelector } from './model-selector';
import { useGenerateMediaMutation, type MediaModel } from '@/redux/media-api';

interface ChatInputProps {
    chatId: number;
    currentModel: MediaModel;
    onModelChange: (model: MediaModel) => void;
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

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput(
    {
        chatId,
        currentModel,
        onModelChange,
        disabled,
    },
    ref
) {
    const [prompt, setPrompt] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [format, setFormat] = useState<'9:16' | '16:9' | undefined>(undefined);
    const [quality, setQuality] = useState<'1k' | '2k' | '4k' | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLockEnabled, setIsLockEnabled] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const submitInProgressRef = useRef(false);

    const [generateMedia, { isLoading: isGenerating }] = useGenerateMediaMutation();

    const isDisabled = disabled || isGenerating || isSubmitting;
    const isNanoBanana = currentModel === 'NANO_BANANA';

    // Загрузка файла по URL и конвертация в File объект
    const urlToFile = useCallback(async (url: string, filename: string): Promise<File> => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Ошибка загрузки файла');
        }
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type });
    }, []);

    // Экспортируем методы для работы с промптом и файлами извне
    useImperativeHandle(ref, () => ({
        setPrompt: (newPrompt: string) => {
            setPrompt(newPrompt);
            // Фокусируемся на textarea после установки промпта
            setTimeout(() => {
                const textarea = document.querySelector('textarea[placeholder*="Опишите"]') as HTMLTextAreaElement;
                if (textarea) {
                    textarea.focus();
                    // Устанавливаем курсор в конец текста
                    textarea.setSelectionRange(newPrompt.length, newPrompt.length);
                }
            }, 0);
        },
        addFileFromUrl: async (url: string, filename: string) => {
            try {
                // Загружаем файл по URL
                const file = await urlToFile(url, filename);

                // Проверяем тип файла (только изображения)
                if (!file.type.startsWith('image/')) {
                    alert('Можно прикреплять только изображения');
                    return;
                }

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
                console.error('[ChatInput] Ошибка прикрепления файла:', error);
                alert('Не удалось прикрепить файл');
            }
        },
    }));

    // Загружаем настройки из localStorage при монтировании компонента
    useEffect(() => {
        const settings = loadMediaSettings();
        if (settings.format) {
            setFormat(settings.format);
        }
        if (settings.quality) {
            setQuality(settings.quality);
        }

        // Загружаем состояние кнопки замочка
        const lockState = loadLockButtonState();
        setIsLockEnabled(lockState);
    }, []);

    // Конвертация файла в base64
    const fileToBase64 = useCallback((file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
    }, []);

    // Обработка выбора файлов
    async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files) return;

        const newFiles: AttachedFile[] = [];

        for (const file of Array.from(files)) {
            // Проверяем тип файла
            if (!file.type.startsWith('image/')) {
                alert('Можно прикреплять только изображения');
                continue;
            }

            // Проверяем размер (макс 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('Размер файла не должен превышать 10MB');
                continue;
            }

            const base64 = await fileToBase64(file);
            const preview = URL.createObjectURL(file);

            newFiles.push({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                preview,
                base64,
            });
        }

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

    // Отправка запроса
    async function handleSubmit(event?: React.MouseEvent | React.KeyboardEvent) {
        // Предотвращаем дефолтное поведение если это событие
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!prompt.trim() && attachedFiles.length === 0) return;
        if (isDisabled || isSubmitting) return;

        // Защита от двойного вызова через useRef (более надежно чем state)
        if (submitInProgressRef.current) {
            console.warn('[ChatInput] ⚠️ Попытка повторной отправки, игнорируем');
            return;
        }

        // Устанавливаем флаги
        submitInProgressRef.current = true;
        setIsSubmitting(true);

        try {
            // Формируем финальный промпт с добавлением формата и качества для NANO_BANANA
            let finalPrompt = prompt.trim();

            if (isNanoBanana) {
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

            console.log('[ChatInput] ✅ Отправка запроса на генерацию:', {
                chatId,
                prompt: finalPrompt.substring(0, 50),
                model: currentModel,
                format,
                quality,
                timestamp: new Date().toISOString(),
            });

            const result = await generateMedia({
                chatId,
                prompt: finalPrompt,
                model: currentModel,
                inputFiles: attachedFiles.map((f) => f.base64),
                ...(isNanoBanana && format && { format }),
                ...(isNanoBanana && quality && { quality }),
            }).unwrap();

            console.log('[ChatInput] ✅ Запрос успешно отправлен, requestId:', result.requestId);

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
                attachedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
                setAttachedFiles([]);
            }
        } catch (error) {
            console.error('[ChatInput] ❌ Ошибка генерации:', error);
        } finally {
            // Сбрасываем флаги в любом случае
            submitInProgressRef.current = false;
            setIsSubmitting(false);
        }
    }

    // Обработка Enter для отправки
    function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === 'Enter' && !event.shiftKey) {
            // Проверяем, не идет ли уже отправка
            if (submitInProgressRef.current || isSubmitting) {
                event.preventDefault();
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
        <div className="border-t border-slate-700 bg-slate-800/50 p-4">
            {/* Прикрепленные файлы */}
            {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {attachedFiles.map((file) => (
                        <div
                            key={file.id}
                            className="group relative h-16 w-16 overflow-hidden rounded-lg border border-slate-600"
                        >
                            <img
                                src={file.preview}
                                alt="Attachment"
                                className="h-full w-full object-cover"
                            />
                            <button
                                onClick={() => removeFile(file.id)}
                                className="absolute right-0.5 top-0.5 rounded-full bg-slate-900/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                <X className="h-3 w-3 text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Верхняя панель с выбором модели и настроек */}
            <div className="mb-3 flex flex-wrap items-center gap-3">
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
                                const newFormat = value === 'default' ? undefined : (value as '9:16' | '16:9');
                                setFormat(newFormat);
                                saveMediaSettings({ format: newFormat, quality });
                            }}
                            disabled={isDisabled}
                        >
                            <SelectTrigger className="w-[120px] border-slate-600 bg-slate-700 text-white">
                                <SelectValue placeholder="Формат">
                                    {format || 'Формат'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="border-slate-700 bg-slate-800">
                                <SelectItem
                                    value="default"
                                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                                >
                                    По умолчанию
                                </SelectItem>
                                <SelectItem
                                    value="16:9"
                                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                                >
                                    16:9 (Горизонтальный)
                                </SelectItem>
                                <SelectItem
                                    value="9:16"
                                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                                >
                                    9:16 (Вертикальный)
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={quality || 'default'}
                            onValueChange={(value) => {
                                const newQuality = value === 'default' ? undefined : (value as '1k' | '2k' | '4k');
                                setQuality(newQuality);
                                saveMediaSettings({ format, quality: newQuality });
                            }}
                            disabled={isDisabled}
                        >
                            <SelectTrigger className="w-[100px] border-slate-600 bg-slate-700 text-white">
                                <SelectValue placeholder="Качество">
                                    {quality || 'Качество'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="border-slate-700 bg-slate-800">
                                <SelectItem
                                    value="default"
                                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                                >
                                    По умолчанию
                                </SelectItem>
                                <SelectItem
                                    value="1k"
                                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                                >
                                    1K
                                </SelectItem>
                                <SelectItem
                                    value="2k"
                                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                                >
                                    2K
                                </SelectItem>
                                <SelectItem
                                    value="4k"
                                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                                >
                                    4K
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                )}
            </div>

            {/* Поле ввода */}
            <div className="flex gap-2">
                {/* Вертикальная колонка с кнопками */}
                <div className="flex min-h-[60px] flex-col justify-start gap-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-slate-400 hover:text-cyan-400"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isDisabled}
                    >
                        <Paperclip className="h-5 w-5" />
                    </Button>

                    {/* Кнопка замочка для сохранения промптов */}
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(
                            'shrink-0',
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
                            <Lock className="h-5 w-5" />
                        ) : (
                            <Unlock className="h-5 w-5" />
                        )}
                    </Button>
                </div>

                {/* Textarea */}
                <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Опишите, что хотите сгенерировать..."
                    className={cn(
                        'min-h-[60px] resize-none border-slate-600 bg-slate-700 text-white placeholder:text-slate-400',
                        'focus-visible:ring-cyan-500'
                    )}
                    disabled={isDisabled}
                />

                {/* Кнопка отправки */}
                <Button
                    type="button"
                    size="icon"
                    className="shrink-0 bg-cyan-600 hover:bg-cyan-700"
                    onClick={(e) => {
                        // Дополнительная проверка перед вызовом
                        if (submitInProgressRef.current || isSubmitting) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                        handleSubmit(e);
                    }}
                    disabled={isDisabled || (!prompt.trim() && attachedFiles.length === 0)}
                >
                    {isGenerating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Send className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Подсказка */}
            <p className="mt-2 text-xs text-slate-500">
                Enter — отправить, Shift+Enter — новая строка
            </p>
        </div>
    );
});

