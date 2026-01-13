// Боковая панель со списком чатов
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import {
    Plus,
    MessageSquare,
    Trash2,
    MoreVertical,
    Pencil,
    FlaskConical,
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
import { loadTestMode, saveTestMode } from '@/lib/test-mode';

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
    const [isTestMode, setIsTestMode] = useState(false);

    // Загружаем состояние тестового режима при монтировании
    useEffect(() => {
        setIsTestMode(loadTestMode());
    }, []);

    function toggleTestMode() {
        const newState = !isTestMode;
        setIsTestMode(newState);
        saveTestMode(newState);
    }

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

            // Если удалили текущий чат, переходим на главную страницу медиа
            if (chatId === currentChatId) {
                navigate({ to: '/media' });
            }
        } catch (error) {
            console.error('Ошибка удаления чата:', error);

            // Пытаемся извлечь детальную ошибку из ответа сервера
            const serverError = error && typeof error === 'object' && 'data' in error &&
                               error.data && typeof error.data === 'object' && 'error' in error.data
                               ? String(error.data.error)
                               : 'Не удалось удалить чат. Попробуйте обновить страницу.';

            alert(serverError);
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
        <div className='flex h-full w-64 flex-col border-r border-border bg-background'>
            {/* Header */}
            <div className={PANEL_HEADER_CLASSES}>
                <h2 className={PANEL_HEADER_TITLE_CLASSES}>AI Media</h2>
                <div className='flex gap-1'>
                    <Button
                        size='icon'
                        variant='ghost'
                        className={cn(
                            'h-8 w-8',
                            isTestMode
                                ? 'text-primary hover:text-primary/80'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        onClick={toggleTestMode}
                        title={
                            isTestMode
                                ? 'Тестовый режим включен (выключить)'
                                : 'Тестовый режим выключен (включить)'
                        }
                    >
                        <FlaskConical className='h-5 w-5' />
                    </Button>
                    <Button
                        size='icon'
                        variant='ghost'
                        className='h-8 w-8 text-muted-foreground hover:text-primary'
                        onClick={() => setIsNewChatDialogOpen(true)}
                    >
                        <Plus className='h-5 w-5' />
                    </Button>
                </div>
            </div>

            {/* Chat list */}
            <ScrollArea className='flex-1'>
                <div className='p-2 w-64 truncate'>
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
                        <div className='py-8 text-center text-sm text-muted-foreground'>
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
                <DialogContent className='border-border bg-card'>
                    <DialogHeader>
                        <DialogTitle className='text-foreground'>
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
                        className='border-border bg-secondary text-foreground'
                    />
                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => setIsNewChatDialogOpen(false)}
                            className='text-muted-foreground'
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleCreateChat}
                            disabled={isCreating || !newChatName.trim()}
                            className='bg-primary hover:bg-primary/90 text-primary-foreground'
                        >
                            Создать
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit chat dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className='border-border bg-card'>
                    <DialogHeader>
                        <DialogTitle className='text-foreground'>
                            Редактировать чат
                        </DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder='Название чата'
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditChat()}
                        className='border-border bg-secondary text-foreground'
                    />
                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => setIsEditDialogOpen(false)}
                            className='text-muted-foreground'
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleEditChat}
                            disabled={!newChatName.trim()}
                            className='bg-primary hover:bg-primary/90 text-primary-foreground'
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
                'group flex items-center gap-2 rounded-xl py-2 px-3 transition-colors',
                isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
        >
            <Link
                to='/media/$chatId'
                params={{ chatId: chat.id.toString() }}
                className='flex min-w-0 flex-1 items-center gap-2'
            >
                <MessageSquare className='h-4 w-4 shrink-0' />
                <span className='min-w-0 truncate text-sm'>{chat.name}</span>
            </Link>

            {chat._count && chat._count.files > 0 && (
                <span
                    className={cn(
                        'shrink-0 text-xs',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                >
                    {chat._count.files}
                </span>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size='icon'
                        variant='ghost'
                        className='h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100'
                    >
                        <MoreVertical className='h-4 w-4' />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align='end'
                    className='border-border bg-card'
                >
                    <DropdownMenuItem
                        onClick={onEdit}
                        className='text-foreground focus:bg-secondary focus:text-foreground'
                    >
                        <Pencil className='mr-2 h-4 w-4' />
                        Переименовать
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={onDelete}
                        className='text-foreground focus:bg-destructive/10 focus:text-destructive'
                    >
                        <Trash2 className='mr-2 h-4 w-4' />
                        Удалить
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
