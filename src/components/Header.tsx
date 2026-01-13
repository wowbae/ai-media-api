import React, { useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser, logout } from '@/redux/auth-slice';
import { TokenBalance } from './TokenBalance';
import { openTelegramBot } from '@/lib/telegram-utils';
import { Link2, LinkIcon, Settings } from 'lucide-react';

export const Header = () => {
    const [isMounted, setIsMounted] = useState(false);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectCurrentUser);
    const dispatch = useDispatch();
    const location = useLocation();

    // Убеждаемся, что компонент смонтирован на клиенте (избегаем проблем с гидратацией)
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Проверяем, находимся ли мы на странице /media
    const isOnMediaPage = location.pathname.startsWith('/media');

    function handleTelegramLink(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Telegram button clicked', { user, userId: user?.id });
        if (!user) {
            console.warn('User not found in Redux store');
            return;
        }
        if (user.id) {
            openTelegramBot(user.id);
        } else {
            console.warn('User ID not found in user object:', user);
        }
    }

    const handleLogout = () => {
        dispatch(logout());
        // Reload to clear potential cache issues or redirect
        window.location.href = '/login';
    };

    return (
        <header className='fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60'>
            <div className='flex h-14 w-full items-center justify-between px-4'>
                <div className='flex items-center gap-2'>
                    <img
                        src='/logo.png'
                        alt='Logo'
                        className='h-8 w-auto rounded-lg'
                    />
                </div>
                <nav
                    className='flex items-center gap-2'
                    suppressHydrationWarning
                >
                    {/* На сервере всегда рендерим неаутентифицированный контент для избежания проблем с гидратацией */}
                    {!isMounted ? (
                        <>
                            <Link
                                to='/login'
                                className='text-sm font-medium text-white hover:text-cyan-400 px-3'
                            >
                                Login
                            </Link>
                            <Link
                                to='/register'
                                className='text-sm font-medium text-white hover:text-cyan-400 px-3'
                            >
                                Register
                            </Link>
                        </>
                    ) : isAuthenticated ? (
                        <>
                            <TokenBalance />
                            {!isOnMediaPage && (
                                <Link
                                    to='/media'
                                    className='text-sm font-medium text-white hover:text-cyan-400 px-3'
                                >
                                    Generate
                                </Link>
                            )}
                            <button
                                onClick={handleTelegramLink}
                                className='flex items-center gap-1 text-sm font-medium text-white hover:text-cyan-400 px-3'
                                title='Привязать Telegram группу'
                            >
                                <LinkIcon className='h-4 w-4' />
                                {/* <Settings className='h-4 w-4' /> */}
                                <span className='hidden sm:inline'>
                                    Telegram
                                </span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className='text-sm font-medium text-gray-400 hover:text-white px-3'
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to='/login'
                                className='text-sm font-medium text-white hover:text-cyan-400 px-3'
                            >
                                Login
                            </Link>
                            <Link
                                to='/register'
                                className='text-sm font-medium text-white hover:text-cyan-400 px-3'
                            >
                                Register
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};
