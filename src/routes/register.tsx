import React, { useState } from 'react';
import { useRegisterMutation } from '../redux/api/auth.endpoints';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/auth-slice';
import { useNavigate, Link, createFileRoute } from '@tanstack/react-router';
import { Loader2, UserPlus } from 'lucide-react';

export const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [register, { isLoading, error }] = useRegisterMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (password !== confirmPassword) {
            setPasswordError('Пароли не совпадают');
            return;
        }

        try {
            const { token, user } = await register({ email, password }).unwrap();
            dispatch(setCredentials({ token, user }));
            navigate({ to: '/media' });
        } catch (err) {
            console.error('Registration failed', err);
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
                            className="h-24 w-24 rounded-lg"
                        />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                        Регистрация
                    </h2>
                    <p className="text-slate-400">
                        Создайте новый аккаунт для начала работы
                    </p>
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
                    <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                            Подтвердите пароль
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {passwordError && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center">
                            {passwordError}
                        </div>
                    )}
                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center">
                            Ошибка регистрации. Попробуйте еще раз.
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
                                Регистрация...
                            </>
                        ) : (
                            <>
                                <UserPlus className="h-5 w-5" />
                                Зарегистрироваться
                            </>
                        )}
                    </button>
                    <div className="text-center text-sm mt-6">
                        <span className="text-slate-400">Уже есть аккаунт? </span>
                        <Link
                            to="/login"
                            className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                        >
                            Войти
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const Route = createFileRoute('/register')({
    component: Register,
});
