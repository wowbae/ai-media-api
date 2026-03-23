import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatSidebar } from "@/components/media";
import { useGetChatsQuery, useCreateChatMutation } from "@/redux/media-api";
import { Sparkles, Loader2 } from "lucide-react";
import { APP_MODES } from "@/lib/app-mode";

export const Route = createFileRoute("/ai-model/")({
    component: AiModelIndexPage,
});

function AiModelIndexPage() {
    const navigate = useNavigate();
    const { data: chats, isLoading: isChatsLoading } = useGetChatsQuery({
        appMode: APP_MODES.AI_MODEL,
    });
    const [createChat, { isLoading: isCreating }] = useCreateChatMutation();

    useEffect(() => {
        if (chats && chats.length > 0) {
            navigate({
                to: "/ai-model/$chatId",
                params: { chatId: chats[0].id.toString() },
            });
        }
    }, [chats, navigate]);

    async function handleCreateFirstChat() {
        try {
            const newChat = await createChat({
                name: "AI Model Chat",
                model: "NANO_BANANA_2_KIEAI",
                appMode: APP_MODES.AI_MODEL,
            }).unwrap();
            navigate({
                to: "/ai-model/$chatId",
                params: { chatId: newChat.id.toString() },
            });
        } catch (error) {
            console.error("Ошибка создания чата:", error);
        }
    }

    return (
        <div className='flex h-screen bg-background'>
            <ChatSidebar appMode={APP_MODES.AI_MODEL} routeBase='/ai-model' />
            <div className='flex flex-1 flex-col items-center justify-center'>
                {isChatsLoading ? (
                    <div className='flex flex-col items-center gap-4'>
                        <Loader2 className='h-8 w-8 animate-spin text-emerald-400' />
                        <p className='text-slate-400'>Загрузка...</p>
                    </div>
                ) : (
                    <div className='max-w-md text-center'>
                        <div className='mb-6 flex justify-center'>
                            <div className='rounded-full bg-emerald-600 p-6'>
                                <Sparkles className='h-12 w-12 text-white' />
                            </div>
                        </div>

                        <h1 className='mb-3 text-3xl font-bold text-white'>
                            AI Model Mode
                        </h1>
                        <p className='mb-6 text-slate-400'>
                            Приватный режим генерации с отдельной библиотекой и
                            улучшением промптов.
                        </p>
                        <button
                            onClick={handleCreateFirstChat}
                            disabled={isCreating}
                            className='inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50'
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className='h-5 w-5 animate-spin' />
                                    Создание...
                                </>
                            ) : (
                                <>
                                    <Sparkles className='h-5 w-5' />
                                    Открыть AI Model
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
