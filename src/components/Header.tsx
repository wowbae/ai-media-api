import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, logout } from '@/redux/auth-slice';
import { TokenBalance } from './TokenBalance';

export const Header = () => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const dispatch = useDispatch();
    const location = useLocation();

    // Проверяем, находимся ли мы на странице /media
    const isOnMediaPage = location.pathname.startsWith('/media');

    const handleLogout = () => {
        dispatch(logout());
        // Reload to clear potential cache issues or redirect
        window.location.href = '/login';
    };

    return (
        <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
            <div className="flex h-14 w-full items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Logo" className="h-8 w-auto rounded-lg" />
                </div>
                <nav className="flex items-center gap-2">
                        {isAuthenticated ? (
                            <>
                                <TokenBalance />
                                {!isOnMediaPage && (
                                    <Link to="/media" className="text-sm font-medium text-white hover:text-cyan-400 px-3">
                                        Generate
                                    </Link>
                                )}
                                <button onClick={handleLogout} className="text-sm font-medium text-gray-400 hover:text-white px-3">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-white hover:text-cyan-400 px-3">
                                    Login
                                </Link>
                                <Link to="/register" className="text-sm font-medium text-white hover:text-cyan-400 px-3">
                                    Register
                                </Link>
                            </>
                        )}
                </nav>
            </div>
        </header>
    );
};
