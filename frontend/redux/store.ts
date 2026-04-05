import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/base';
import authReducer, { logout, setCredentials } from './auth-slice';
import { setupListeners } from '@reduxjs/toolkit/query';
import { closeSSE, initSSE, reconnectSSE } from '@/lib/sse-manager';

// Импортируем эндпоинты для регистрации в API
import './api/media.endpoints';
import './api/models.endpoints';
import './api/auth.endpoints';

const sseMiddleware =
    () => (next: (action: unknown) => unknown) => (action: unknown) => {
        if (action && typeof action === 'object' && 'type' in action) {
            const a = action as { type: string };
            if (a.type === logout.type) closeSSE();
            if (a.type === setCredentials.type) reconnectSSE(store);
        }
        return next(action);
    };

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(sseMiddleware, baseApi.middleware),
});

// Настройка listeners для RTK Query (опционально)
setupListeners(store.dispatch);

// SSE инициализируется при загрузке store (только на клиенте)
if (typeof window !== 'undefined') {
    initSSE(store);
}

// Типы для TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
