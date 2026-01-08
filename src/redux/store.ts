import { configureStore } from '@reduxjs/toolkit';
import { dataAPI } from './api.ts';
import { baseApi } from './api/base';
import authReducer from './auth-slice';
import { setupListeners } from '@reduxjs/toolkit/query';

// Импортируем эндпоинты для регистрации в API
import './api/media.endpoints';
import './api/models.endpoints';

export const store = configureStore({
    reducer: {
        [dataAPI.reducerPath]: dataAPI.reducer,
        [baseApi.reducerPath]: baseApi.reducer,
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(dataAPI.middleware)
            .concat(baseApi.middleware),
});

// Настройка listeners для RTK Query (опционально)
setupListeners(store.dispatch);

// Типы для TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
