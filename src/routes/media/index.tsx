// Главная страница медиа-генератора
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ChatSidebar } from '@/components/media';
import { useGetChatsQuery, useCreateChatMutation } from '@/redux/media-api';
import { Sparkles, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/media/')({
    component: MediaIndexPage,
});

function MediaIndexPage() {
    const navigate = useNavigate();
    const { data: chats, isLoading: isChatsLoading } = useGetChatsQuery();
    const [createChat, { isLoading: isCreating }] = useCreateChatMutation();

    // Если есть чаты, перенаправляем на последний
    useEffect(() => {
        if (chats && chats.length > 0) {
            navigate({
                to: '/media/$chatId',
                params: { chatId: chats[0].id.toString() },
            });
        }
    }, [chats, navigate]);

    async function handleCreateFirstChat() {
        try {
            const newChat = await createChat({ name: 'Новый чат' }).unwrap();
            navigate({
                to: '/media/$chatId',
                params: { chatId: newChat.id.toString() },
            });
        } catch (error) {
            console.error('Ошибка создания чата:', error);
        }
    }

    return (
        <div className='flex h-screen bg-background'>
            {/* Сайдбар */}
            <ChatSidebar />

            {/* Основной контент */}
            <div className='flex flex-1 flex-col items-center justify-center'>
                {isChatsLoading ? (
                    <div className='flex flex-col items-center gap-4'>
                        <Loader2 className='h-8 w-8 animate-spin text-cyan-400' />
                        <p className='text-slate-400'>Загрузка...</p>
                    </div>
                ) : (
                    <div className='max-w-md text-center'>
                        <div className='mb-6 flex justify-center'>
                            <div className='rounded-full bg-linear-to-br from-cyan-500 to-purple-600 p-6'>
                                <Sparkles className='h-12 w-12 text-white' />
                            </div>
                        </div>

                        <h1 className='mb-3 text-3xl font-bold text-white'>
                            AI Media Generator
                        </h1>

                        <p className='mb-6 text-slate-400'>
                            Генерируйте изображения, видео и аудио с помощью
                            нейросетей. Выберите модель и опишите, что хотите
                            создать.
                        </p>

                        <div className='mb-8 flex flex-wrap justify-center gap-3'>
                            <ModelCard
                                emoji='🍌'
                                name='Nano Banana Pro'
                                description='Gemini 3 Pro'
                            />
                            <ModelCard
                                emoji='🎨'
                                name='Midjourney'
                                description='Скоро'
                                disabled
                            />
                        </div>

                        <button
                            onClick={handleCreateFirstChat}
                            disabled={isCreating}
                            className='inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50'
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className='h-5 w-5 animate-spin' />
                                    Создание...
                                </>
                            ) : (
                                <>
                                    <Sparkles className='h-5 w-5' />
                                    Начать генерацию
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

interface ModelCardProps {
    emoji: string;
    name: string;
    description: string;
    disabled?: boolean;
}

function ModelCard({ emoji, name, description, disabled }: ModelCardProps) {
    return (
        <div
            className={`rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-left ${
                disabled ? 'opacity-50' : ''
            }`}
        >
            <div className='flex items-center gap-2'>
                <span className='text-xl'>{emoji}</span>
                <div>
                    <p className='font-medium text-white'>{name}</p>
                    <p className='text-xs text-slate-400'>{description}</p>
                </div>
            </div>
        </div>
    );
}
