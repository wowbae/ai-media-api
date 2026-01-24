// Компонент для восстановления пользователя из токена при загрузке приложения
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from '@tanstack/react-router';
import { useGetMeQuery } from '@/redux/api/auth.endpoints';
import { setCredentials, logout } from '@/redux/auth-slice';
import { handleSessionTimeout } from '@/redux/api/utils';

export function AuthInitializer() {
    const dispatch = useDispatch();
    const location = useLocation();
    const hasCheckedRef = useRef(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Определяем, является ли текущая страница публичной (не требует авторизации)
    const isPublicRoute = location.pathname === '/login' || location.pathname === '/register';

    // Загружаем пользователя только если есть токен
    const { data: user, isSuccess, error } = useGetMeQuery(undefined, {
        skip: !token, // Пропускаем запрос если нет токена
    });

    // Проверка токена при загрузке страницы (выполняется один раз)
    useEffect(() => {
        // Выполняем проверку только один раз
        if (hasCheckedRef.current) return;
        hasCheckedRef.current = true;

        // Если нет токена и мы не на публичной странице - перенаправляем на логин сразу
        if (!token && !isPublicRoute) {
            handleSessionTimeout();
            return;
        }
    }, [token, isPublicRoute]);

    // Обработка ошибок авторизации
    useEffect(() => {
        if (error && 'status' in error && error.status === 401) {
            // Очищаем состояние Redux
            dispatch(logout());
            // Перенаправляем на страницу логина только если не на публичной странице
            if (!isPublicRoute) {
                handleSessionTimeout();
            }
        }
    }, [error, dispatch, isPublicRoute]);

    useEffect(() => {
        if (isSuccess && user && token) {
            // Восстанавливаем пользователя в Redux store
            dispatch(setCredentials({ user, token }));
        }
    }, [isSuccess, user, token, dispatch]);

    return null; // Компонент ничего не рендерит
}
