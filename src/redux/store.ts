import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/base';
import authReducer from './auth-slice';
import { setupListeners } from '@reduxjs/toolkit/query';

// Импортируем эндпоинты для регистрации в API
import './api/media.endpoints';
import './api/models.endpoints';
import './api/auth.endpoints';

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
});

// Настройка listeners для RTK Query (опционально)
setupListeners(store.dispatch);

// Типы для TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
