// Боковая панель со списком чатов
import { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import {
    Plus,
    MessageSquare,
    Trash2,
    MoreVertical,
    Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_HEADER_CLASSES, PANEL_HEADER_TITLE_CLASSES } from '@/lib/panel-styles';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    useGetChatsQuery,
    useCreateChatMutation,
    useDeleteChatMutation,
    useUpdateChatMutation,
    type MediaChat,
} from '@/redux/media-api';

export function ChatSidebar() {
    const params = useParams({ strict: false });
    const navigate = useNavigate();
    const currentChatId = params.chatId
        ? parseInt(params.chatId as string)
        : null;

    const { data: chats, isLoading: isChatsLoading } = useGetChatsQuery();
    const [createChat, { isLoading: isCreating }] = useCreateChatMutation();
    const [deleteChat] = useDeleteChatMutation();
    const [updateChat] = useUpdateChatMutation();

    const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingChat, setEditingChat] = useState<MediaChat | null>(null);
    const [newChatName, setNewChatName] = useState('');

    async function handleCreateChat() {
        if (!newChatName.trim()) return;

        try {
            const newChat = await createChat({ name: newChatName.trim() }).unwrap();
            setNewChatName('');
            setIsNewChatDialogOpen(false);

            // Перенаправляем на страницу нового чата
            navigate({
                to: '/media/$chatId',
                params: { chatId: newChat.id.toString() },
            });
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            alert('Ошибка создания чата. Проверьте консоль для деталей.');
        }
    }

    async function handleDeleteChat(chatId: number) {
        if (!confirm('Удалить чат и все его содержимое?')) return;

        try {
            await deleteChat(chatId).unwrap();
        } catch (error) {
            console.error('Ошибка удаления чата:', error);
        }
    }

    async function handleEditChat() {
        if (!editingChat || !newChatName.trim()) return;

        try {
            await updateChat({
                id: editingChat.id,
                name: newChatName.trim(),
            }).unwrap();
            setEditingChat(null);
            setNewChatName('');
            setIsEditDialogOpen(false);
        } catch (error) {
            console.error('Ошибка обновления чата:', error);
        }
    }

    function openEditDialog(chat: MediaChat) {
        setEditingChat(chat);
        setNewChatName(chat.name);
        setIsEditDialogOpen(true);
    }

    return (
        <div className='flex h-full w-64 flex-col border-r border-slate-700 bg-slate-900/50'>
            {/* Header */}
            <div className={PANEL_HEADER_CLASSES}>
                <h2 className={PANEL_HEADER_TITLE_CLASSES}>AI Media</h2>
                <Button
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8 text-slate-400 hover:text-cyan-400'
                    onClick={() => setIsNewChatDialogOpen(true)}
                >
                    <Plus className='h-5 w-5' />
                </Button>
            </div>

            {/* Chat list */}
            <ScrollArea className='flex-1'>
                <div className='p-2'>
                    {isChatsLoading ? (
                        // Skeleton loader
                        Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className='mb-2 flex items-center gap-2 p-2'
                            >
                                <Skeleton className='h-4 w-4 rounded' />
                                <Skeleton className='h-4 flex-1' />
                            </div>
                        ))
                    ) : chats && chats.length > 0 ? (
                        chats.map((chat) => (
                            <ChatItem
                                key={chat.id}
                                chat={chat}
                                isActive={chat.id === currentChatId}
                                onDelete={() => handleDeleteChat(chat.id)}
                                onEdit={() => openEditDialog(chat)}
                            />
                        ))
                    ) : (
                        <div className='py-8 text-center text-sm text-slate-500'>
                            <MessageSquare className='mx-auto mb-2 h-8 w-8 opacity-50' />
                            <p>Нет чатов</p>
                            <p className='text-xs'>Создайте новый чат</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* New chat dialog */}
            <Dialog
                open={isNewChatDialogOpen}
                onOpenChange={setIsNewChatDialogOpen}
            >
                <DialogContent className='border-slate-700 bg-slate-800'>
                    <DialogHeader>
                        <DialogTitle className='text-white'>
                            Новый чат
                        </DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder='Название чата'
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === 'Enter' && handleCreateChat()
                        }
                        className='border-slate-600 bg-slate-700 text-white'
                    />
                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => setIsNewChatDialogOpen(false)}
                            className='text-slate-400'
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleCreateChat}
                            disabled={isCreating || !newChatName.trim()}
                            className='bg-cyan-600 hover:bg-cyan-700'
                        >
                            Создать
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit chat dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className='border-slate-700 bg-slate-800'>
                    <DialogHeader>
                        <DialogTitle className='text-white'>
                            Редактировать чат
                        </DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder='Название чата'
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditChat()}
                        className='border-slate-600 bg-slate-700 text-white'
                    />
                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => setIsEditDialogOpen(false)}
                            className='text-slate-400'
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleEditChat}
                            disabled={!newChatName.trim()}
                            className='bg-cyan-600 hover:bg-cyan-700'
                        >
                            Сохранить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface ChatItemProps {
    chat: MediaChat;
    isActive: boolean;
    onDelete: () => void;
    onEdit: () => void;
}

function ChatItem({ chat, isActive, onDelete, onEdit }: ChatItemProps) {
    return (
        <div
            className={cn(
                'group flex items-center gap-2 rounded-lg p-2 transition-colors',
                isActive
                    ? 'bg-cyan-600/20 text-cyan-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            )}
        >
            <Link
                to='/media/$chatId'
                params={{ chatId: chat.id.toString() }}
                className='flex flex-1 items-center gap-2 truncate'
            >
                <MessageSquare className='h-4 w-4 shrink-0' />
                <span className='truncate text-sm'>{chat.name}</span>
                {chat._count && (
                    <span className='ml-auto text-xs text-slate-500'>
                        {chat._count.requests}
                    </span>
                )}
            </Link>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size='icon'
                        variant='ghost'
                        className='h-6 w-6 opacity-0 group-hover:opacity-100'
                    >
                        <MoreVertical className='h-4 w-4' />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align='end'
                    className='border-slate-700 bg-slate-800'
                >
                    <DropdownMenuItem
                        onClick={onEdit}
                        className='text-slate-300 focus:bg-slate-700 focus:text-white'
                    >
                        <Pencil className='mr-2 h-4 w-4' />
                        Переименовать
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={onDelete}
                        className='text-red-400 focus:bg-red-900/50 focus:text-red-300'
                    >
                        <Trash2 className='mr-2 h-4 w-4' />
                        Удалить
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
