// Компонент для восстановления пользователя из токена при загрузке приложения
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGetMeQuery } from '@/redux/api/auth.endpoints';
import { setCredentials } from '@/redux/auth-slice';

export function AuthInitializer() {
    const dispatch = useDispatch();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // Загружаем пользователя только если есть токен
    const { data: user, isSuccess } = useGetMeQuery(undefined, {
        skip: !token, // Пропускаем запрос если нет токена
    });

    useEffect(() => {
        if (isSuccess && user && token) {
            // Восстанавливаем пользователя в Redux store
            dispatch(setCredentials({ user, token }));
        }
    }, [isSuccess, user, token, dispatch]);

    return null; // Компонент ничего не рендерит
}
