// Компонент для восстановления пользователя из токена при загрузке приложения
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "@tanstack/react-router";
import { useGetMeQuery } from "@/redux/api/auth.endpoints";
import { setCredentials, logout } from "@/redux/auth-slice";
import { handleSessionTimeout } from "@/redux/api/utils";
import { config } from "@/lib/config";

export function AuthInitializer() {
    const dispatch = useDispatch();
    const location = useLocation();
    const hasCheckedRef = useRef(false);
    const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const isAuthBypassed = config.disableAuth;

    // SSE инициализируется в store.ts (глобальный singleton, не зависит от React)

    // Определяем, является ли текущая страница публичной (не требует авторизации)
    const isPublicRoute =
        location.pathname === "/login" ||
        location.pathname === "/register" ||
        location.pathname.startsWith("/ai-model");

    // Загружаем пользователя только если есть токен
    const {
        data: user,
        isSuccess,
        error,
    } = useGetMeQuery(undefined, {
        skip: isAuthBypassed || !token, // В bypass режиме /me не нужен
    });

    useEffect(() => {
        if (!isAuthBypassed) return;

        dispatch(
            setCredentials({
                token: token || "dev-bypass-token",
                user: {
                    id: 1,
                    email: "dev@local",
                    role: "ADMIN",
                    balance: 0,
                },
            }),
        );
    }, [dispatch, isAuthBypassed, token]);

    // Проверка токена при загрузке страницы (выполняется один раз)
    useEffect(() => {
        // Выполняем проверку только один раз
        if (hasCheckedRef.current) return;
        hasCheckedRef.current = true;

        // Если нет токена и мы не на публичной странице - перенаправляем на логин сразу
        if (isAuthBypassed) {
            return;
        }

        if (!token && !isPublicRoute) {
            handleSessionTimeout();
            return;
        }
    }, [token, isPublicRoute, isAuthBypassed]);

    // Обработка ошибок авторизации
    useEffect(() => {
        if (isAuthBypassed) {
            return;
        }

        if (error && "status" in error && error.status === 401) {
            // Очищаем состояние Redux
            dispatch(logout());
            // Перенаправляем на страницу логина только если не на публичной странице
            if (!isPublicRoute) {
                handleSessionTimeout();
            }
        }
    }, [error, dispatch, isPublicRoute, isAuthBypassed]);

    useEffect(() => {
        if (isSuccess && user && token) {
            // Восстанавливаем пользователя в Redux store
            dispatch(setCredentials({ user, token }));
        }
    }, [isSuccess, user, token, dispatch]);

    return null; // Компонент ничего не рендерит
}
