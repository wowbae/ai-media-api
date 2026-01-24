// Компонент для восстановления пользователя из токена при загрузке приложения
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGetMeQuery } from '@/redux/api/auth.endpoints';
import { setCredentials } from '@/redux/auth-slice';

export function AuthInitializer() {
    const dispatch = useDispatch();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // Загружаем пользователя только если есть токен
    const { data: user, isSuccess, error } = useGetMeQuery(undefined, {
        skip: !token, // Пропускаем запрос если нет токена
    });

    // Обработка ошибок авторизации
    useEffect(() => {
        if (error && 'status' in error && error.status === 401) {
            // Очищаем невалидный токен
            localStorage.removeItem('token');
            alert('Ошибка авторизации: сессия истекла. Пожалуйста, войдите заново.');
        }
    }, [error]);

    useEffect(() => {
        if (isSuccess && user && token) {
            // Восстанавливаем пользователя в Redux store
            dispatch(setCredentials({ user, token }));
        }
    }, [isSuccess, user, token, dispatch]);

    return null; // Компонент ничего не рендерит
}
