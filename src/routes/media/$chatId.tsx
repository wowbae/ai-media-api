// Страница чата с медиа-генерацией
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
    ChatSidebar,
    ChatInput,
    MessageList,
    MediaGallery,
    type ChatInputRef,
    type ChatInputProps,
} from "@/components/media";
import {
    useGetChatQuery,
    useUpdateChatMutation,
    useLazyGetRequestQuery,
    useGetModelsQuery,
    useGenerateMediaMutation,
    type MediaModel,
    type MediaRequest,
} from "@/redux/media-api";
import { PANEL_HEADER_CLASSES } from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import { getModelIcon } from "@/lib/model-utils";
import { useTestMode } from "@/hooks/use-test-mode";
import { APP_MODES, type AppMode } from "@/lib/app-mode";
import { API_BASE_URL } from "@/redux/api/base";

export const Route = createFileRoute("/media/$chatId")({
    component: () => (
        <MediaChatPage appMode={APP_MODES.DEFAULT} routeBase='/media' />
    ),
});

// Интерфейс для pending-сообщения (оптимистичное отображение)
interface PendingMessage {
    id: string; // Временный ID (pending-xxx)
    requestId?: number; // Реальный ID запроса после получения от сервера
    prompt: string;
    model: MediaModel;
    createdAt: string;
    status: "PENDING" | "PROCESSING" | "FAILED";
    errorMessage?: string;
}

export function MediaChatPage({
    appMode,
    routeBase,
}: {
    appMode: AppMode;
    routeBase: "/media" | "/ai-model";
}) {
    const params = useParams({ strict: false });
    const chatId = String(params.chatId ?? "");
    const chatIdNum = parseInt(chatId);

    // Первоначальная загрузка только последних 10 сообщений для быстрого показа интерфейса
    const {
        data: chat,
        isLoading: isChatLoading,
        isFetching: isChatFetching,
        error: chatError,
        refetch,
    } = useGetChatQuery(
        { id: chatIdNum, limit: 10, appMode },
        {
            // Всегда обновлять при монтировании или изменении аргументов
            refetchOnMountOrArgChange: true,
            skip: false,
        },
    );

    // Debug logging для отслеживания загрузки чата
    useEffect(() => {
        console.log("[Chat] Состояние загрузки:", {
            chatId: chatIdNum,
            isChatLoading,
            isChatFetching,
            hasChat: !!chat,
            requestsCount: chat?.requests?.length || 0,
            error: chatError,
        });
    }, [chatIdNum, isChatLoading, isChatFetching, chat, chatError]);

    // Сброс состояния при смене чата (навигация по списку слева)
    useEffect(() => {
        setPendingMessage(null);
        isInitialLoadRef.current = true;
    }, [chatIdNum]);

    const [updateChat] = useUpdateChatMutation();
    const [generateMedia] = useGenerateMediaMutation();
    const [getRequestTrigger] = useLazyGetRequestQuery();

    const { isTestMode } = useTestMode();

    const [currentModel, setCurrentModel] = useState<MediaModel>(
        "NANO_BANANA_PRO_KIEAI",
    );
    // Локальное состояние для оптимистичного отображения pending-сообщения
    const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(
        null,
    );
    const chatInputRef = useRef<ChatInputRef>(null);
    const isInitialLoadRef = useRef(true);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const scrollToBottomRef = useRef<(() => void) | null>(null);

    // Получаем список моделей
    const { data: models } = useGetModelsQuery({ appMode });

    // Синхронизация модели с настройками чата
    // ВАЖНО: Обновляем ТОЛЬКО при первоначальной загрузке чата
    // После этого модель может быть изменена ТОЛЬКО пользователем вручную через селектор
    // Все автоматические обновления чата (SSE updates, refetch) НЕ влияют на выбранную модель
    useEffect(() => {
        if (!chat || chat.id !== chatIdNum) return;

        // При первоначальной загрузке устанавливаем модель из чата
        if (isInitialLoadRef.current) {
            setCurrentModel(chat.model);
            isInitialLoadRef.current = false;
        }
    }, [chat, chatIdNum]);

    // Обработка смены модели пользователем
    // ВАЖНО: Это единственный способ изменить модель после первоначальной загрузки
    async function handleModelChange(model: MediaModel) {
        // Если модель не изменилась, ничего не делаем
        if (model === currentModel) return;

        // Оптимистичное обновление UI
        const previousModel = currentModel;
        setCurrentModel(model);

        const activeChatForUpdate = chat;
        if (activeChatForUpdate) {
            try {
                await updateChat({
                    id: activeChatForUpdate.id,
                    model,
                }).unwrap();
                // После успешного обновления на сервере модель остается установленной пользователем
                // и НЕ будет синхронизироваться автоматически при последующих обновлениях чата
            } catch (error) {
                // Откатываем изменение модели при ошибке
                setCurrentModel(previousModel);
                const errorMessage =
                    error &&
                    typeof error === "object" &&
                    "data" in error &&
                    error.data &&
                    typeof error.data === "object" &&
                    "error" in error.data &&
                    typeof error.data.error === "string"
                        ? error.data.error
                        : "Не удалось обновить модель. Попробуйте еще раз.";
                alert(`Ошибка переключения модели: ${errorMessage}`);
                console.error("[Chat] Ошибка обновления модели:", error);
            }
        }
    }

    // Обработчик добавления pending-сообщения (вызывается из ChatInput перед отправкой)
    function handleAddPendingMessage(prompt: string) {
        const pending: PendingMessage = {
            id: `pending-${Date.now()}`,
            prompt,
            model: currentModel,
            createdAt: new Date().toISOString(),
            status: "PENDING",
        };
        setPendingMessage(pending);
        console.log("[Chat] ⏳ Добавлено pending-сообщение:", pending.id);
    }

    // Обработчик ошибки отправки (обновляет pending-сообщение на FAILED)
    function handleSendError(errorMessage: string) {
        setPendingMessage((prev) => {
            if (!prev) return null;
            console.log("[Chat] ❌ Pending-сообщение помечено как FAILED");
            return {
                ...prev,
                status: "FAILED",
                errorMessage,
            };
        });
    }

    // Обработчик создания нового запроса (вызывается из ChatInput после успешной отправки)
    function handleRequestCreated(requestId: number) {
        console.log(
            "[Chat] ✅ Новый запрос создан, SSE автоматически обновит UI:",
            { requestId },
        );

        // Сохраняем requestId в pending для точного сравнения
        setPendingMessage((prev) => {
            if (!prev) return null;
            return { ...prev, requestId };
        });

        // Обновляем кеш чата
        refetch().catch((error) => {
            console.error("[Chat] Ошибка при обновлении чата:", error);
        });

        // SSE автоматически отслеживает статус через подписку
        // При завершении задачи сервер отправит событие и RTK Query обновит кеш
    }

    // SSE автоматически обновляет кеш через invalidateTags
    // При получении события REQUEST_COMPLETED или REQUEST_FAILED
    // RTK Query автоматически обновит все подписанные компоненты
    useEffect(() => {
        if (appMode !== APP_MODES.AI_MODEL || !chatIdNum) return;
        const eventSource = new EventSource(
            `${API_BASE_URL}/sse/public?chatId=${chatIdNum}&appMode=${APP_MODES.AI_MODEL}`,
        );
        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data) as {
                    type?: string;
                    requestId?: number;
                };
                if (
                    payload.type === "REQUEST_COMPLETED" ||
                    payload.type === "REQUEST_FAILED"
                ) {
                    refetch().catch(() => {});
                }
            } catch {
                // ignore parse errors
            }
        };
        eventSource.onerror = () => {
            eventSource.close();
        };
        return () => eventSource.close();
    }, [appMode, chatIdNum, refetch]);

    // Убираем pending-сообщение если реальный запрос появился
    const activeRequests = useMemo(
        () => (chat && chat.id === chatIdNum ? chat.requests || [] : []),
        [chat, chatIdNum],
    );

    useEffect(() => {
        if (!pendingMessage?.requestId) return;

        const requestAppeared = activeRequests.some(
            (r) => r.id === pendingMessage.requestId,
        );

        if (requestAppeared) {
            console.log("[Chat] 🔄 Запрос найден, убираем pending-сообщение");
            setPendingMessage(null);
        }
    }, [activeRequests, pendingMessage]);

    // Показываем загрузку только если нет кешированных данных и идет первичная загрузка
    if (isChatLoading && !chat) {
        return (
            <div className='flex h-screen bg-background'>
                <ChatSidebar appMode={appMode} routeBase={routeBase} />
                <div className='flex flex-1 items-center justify-center'>
                    <Loader2 className='h-8 w-8 animate-spin text-primary' />
                </div>
            </div>
        );
    }

    // Показываем ошибку только если нет кешированных данных
    if (chatError && !chat) {
        return (
            <div className='flex h-screen bg-background'>
                <ChatSidebar appMode={appMode} routeBase={routeBase} />
                <div className='flex flex-1 flex-col items-center justify-center text-center'>
                    <p className='text-xl text-destructive'>
                        Ошибка загрузки чата
                    </p>
                    <p className='text-sm text-muted-foreground mt-2'>
                        Не удалось загрузить чат. Проверьте соединение с
                        сервером.
                    </p>
                </div>
            </div>
        );
    }

    // Показываем "не найден" только если нет кешированных данных и нет ошибки
    if (!chat && !isChatLoading && !chatError) {
        return (
            <div className='flex h-screen bg-background'>
                <ChatSidebar appMode={appMode} routeBase={routeBase} />
                <div className='flex flex-1 flex-col items-center justify-center text-center'>
                    <p className='text-xl text-muted-foreground'>
                        Чат не найден
                    </p>
                    <p className='text-sm text-muted-foreground'>
                        Выберите чат из списка или создайте новый
                    </p>
                </div>
            </div>
        );
    }

    // Если есть кешированные данные, показываем их даже если идет обновление
    // Это обеспечивает мгновенное отображение из кеша

    // ВАЖНО: Используем данные чата только если они соответствуют текущему chatId.
    // При смене чата RTK Query может кратковременно вернуть данные предыдущего чата.
    const activeChat = chat && chat.id === chatIdNum ? chat : null;

    if (!activeChat) {
        return (
            <div className='flex h-screen bg-background'>
                <ChatSidebar appMode={appMode} routeBase={routeBase} />
                <div className='flex flex-1 items-center justify-center'>
                    <Loader2 className='h-8 w-8 animate-spin text-primary' />
                </div>
            </div>
        );
    }

    // Сортируем запросы по дате (старые сверху)
    const sortedRequests = [...(activeChat.requests || [])].sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // SSE автоматически обновляет кеш - просто используем sortedRequests
    const requests = sortedRequests as MediaRequest[];

    // Добавляем pending-сообщение в конец списка (если есть)
    const hasPendingInList =
        pendingMessage &&
        !requests.some((r) =>
            pendingMessage.requestId
                ? r.id === pendingMessage.requestId
                : false,
        );

    // Создаем объект для pending-сообщения в формате MediaRequest
    const pendingAsRequest: MediaRequest | null =
        hasPendingInList && pendingMessage
            ? {
                  id: -1, // Временный ID
                  chatId: chatIdNum,
                  prompt: pendingMessage.prompt,
                  model: pendingMessage.model,
                  status: pendingMessage.status,
                  inputFiles: [],
                  errorMessage: pendingMessage.errorMessage || null,
                  createdAt: pendingMessage.createdAt,
                  completedAt: null,
                  seed: null,
                  files: [],
              }
            : null;

    // Финальный список запросов с pending-сообщением
    const finalRequests = pendingAsRequest
        ? [...sortedRequests, pendingAsRequest]
        : sortedRequests;

    // Обработчик редактирования промпта
    function handleEditPrompt(prompt: string) {
        chatInputRef.current?.setPrompt(prompt);
    }

    // Обработчик прикрепления файла
    async function handleAttachFile(
        fileUrl: string,
        filename: string,
        imgbbUrl?: string,
    ) {
        try {
            await chatInputRef.current?.addFileFromUrl(
                fileUrl,
                filename,
                imgbbUrl,
            );
        } catch (error) {
            console.error("[Chat] Ошибка при прикреплении файла:", error);
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Неизвестная ошибка при прикреплении файла";
            alert(`Ошибка при прикреплении файла: ${errorMessage}`);
        }
    }

    // Обработчик повторения запроса (теперь просто заполняет форму)
    async function handleRepeatRequest(
        request: MediaRequest,
        model?: MediaModel,
    ) {
        // Если указана другая модель, переключаем её
        const selectedModel = model || request.model;
        if (selectedModel && selectedModel !== currentModel) {
            handleModelChange(selectedModel);
        }

        // Заполняем форму данными из запроса
        if (chatInputRef.current) {
            await chatInputRef.current.setRequestData(request);

            // Прокручиваем к полю ввода
            const inputElement = document.getElementById("chat-input");
            if (inputElement) {
                inputElement.scrollIntoView({ behavior: "smooth" });
            }
        }
    }

    // Обработчик повторения запроса по ID (для MediaGallery)
    async function handleRepeatRequestById(requestId: number) {
        try {
            // Получаем полные данные запроса
            const request = await getRequestTrigger({
                id: requestId,
                appMode,
            }).unwrap();
            if (request) {
                await handleRepeatRequest(request);
            }
        } catch (error) {
            console.error("[Chat] Ошибка при получении данных запроса:", error);
            alert("Не удалось получить данные запроса для повторения");
        }
    }

    // Показываем индикатор обновления только если есть кешированные данные
    const showUpdatingIndicator = isChatFetching && !isChatLoading;

    return (
        <div className='flex h-[calc(100vh-3.5rem)] bg-background'>
            {/* Сайдбар */}
            <ChatSidebar appMode={appMode} routeBase={routeBase} />

            {/* Основной чат — key для сброса состояния при смене чата */}
            <div key={chatIdNum} className='relative flex flex-1 flex-col'>
                {/* Заголовок чата */}
                <ChatHeader
                    name={activeChat.name}
                    model={currentModel}
                    showUpdating={showUpdatingIndicator}
                    appMode={appMode}
                />

                {/* Список сообщений */}
                <MessageList
                    requests={finalRequests}
                    chatModel={currentModel}
                    onEditPrompt={handleEditPrompt}
                    onAttachFile={handleAttachFile}
                    onRepeatRequest={handleRepeatRequest}
                    onScrollStateChange={setShowScrollButton}
                    onScrollToBottomRef={(scrollFn) => {
                        scrollToBottomRef.current = scrollFn;
                    }}
                    appMode={appMode}
                />

                {/* Ввод */}
                <ChatInput
                    ref={chatInputRef}
                    chatId={chatIdNum}
                    currentModel={currentModel}
                    onModelChange={handleModelChange}
                    onRequestCreated={handleRequestCreated}
                    onPendingMessage={handleAddPendingMessage}
                    onSendError={handleSendError}
                    scrollToBottom={() => scrollToBottomRef.current?.()}
                    showScrollButton={showScrollButton}
                    appMode={appMode}
                />
            </div>

            {/* Панель с медиафайлами */}
            <MediaGallery
                chatId={chatIdNum}
                onAttachFile={handleAttachFile}
                onRepeatRequest={handleRepeatRequestById}
                appMode={appMode}
            />
        </div>
    );
}

interface ChatHeaderProps {
    name: string;
    model: MediaModel;
    showUpdating?: boolean;
    appMode: AppMode;
}

function ChatHeader({ name, model, showUpdating, appMode }: ChatHeaderProps) {
    const { data: models } = useGetModelsQuery({ appMode });
    const modelInfo = models?.find((m) => m.key === model);

    return (
        <div className={cn(PANEL_HEADER_CLASSES, "bg-background")}>
            <div className='flex items-center gap-3'>
                <span className='text-2xl'>{getModelIcon(model)}</span>
                <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                        <h1 className='font-semibold text-foreground'>
                            {name}
                        </h1>
                        {showUpdating && (
                            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                        )}
                    </div>
                    <p className='text-xs text-muted-foreground'>
                        {modelInfo?.name || model}
                    </p>
                </div>
            </div>
        </div>
    );
}
