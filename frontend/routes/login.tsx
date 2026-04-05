import React, { useState } from 'react';
import { useLoginMutation } from '../redux/api/auth.endpoints';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/auth-slice';
import { useNavigate, Link, createFileRoute } from '@tanstack/react-router';
import { Loader2, LogIn } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [login, { isLoading, error }] = useLoginMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { token, user } = await login({ email, password }).unwrap();
            dispatch(setCredentials({ token, user }));
            navigate({ to: '/media' });
        } catch (err) {
            console.error('Login failed', err);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="w-full max-w-md p-8">
                <div className="mb-8 text-center">
                    <div className="mb-6 flex justify-center">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-20 w-20 rounded-lg"
                        />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Вход</h2>
                    <p className="text-slate-400">Войдите в свой аккаунт</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                            Пароль
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center">
                            Неверный email или пароль. Проверьте данные и попробуйте снова.
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Вход...
                            </>
                        ) : (
                            <>
                                <LogIn className="h-5 w-5" />
                                Войти
                            </>
                        )}
                    </button>
                    <div className="text-center text-sm mt-6">
                        <span className="text-slate-400">Нет аккаунта? </span>
                        <Link
                            to="/register"
                            className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                        >
                            Зарегистрироваться
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const Route = createFileRoute('/login')({
    component: Login,
});
