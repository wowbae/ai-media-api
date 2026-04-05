import { createRouter, createRootRoute, createFileRoute, lazyRouteComponent, useLocation, HeadContent, Scripts, useNavigate, Link, useParams } from '@tanstack/react-router';
import { jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setupListeners } from '@reduxjs/toolkit/query';
import * as React from 'react';
import React__default, { forwardRef, useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle } from 'react';
import { Loader2, UserPlus, LogIn, LinkIcon, FlaskConical, Plus, MessageSquare, X, Paperclip, Lock, Unlock, Send, ChevronDown, Pin, ImageIcon, VideoIcon, RefreshCcw, Download, Zap, RefreshCw, Sparkles, MoreVertical, Pencil, Trash2, XIcon, Copy, AlertCircle, Maximize2, ChevronDownIcon, CheckIcon, ChevronUp, Video, Music, CheckCircle2, ChevronUpIcon, FileIcon, AudioLines } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';

const appCss = "/assets/styles-DYlBFpWt.css";
function createAuthHeaders(headers, { getState }) {
  const token = getState().auth.token;
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
}
function handleSessionTimeout() {
  localStorage.removeItem("token");
}
const config = {
  apiUrl: "http://localhost:4000/api/media"
};
const API_BASE_URL = config.apiUrl;
async function baseQueryWithErrorHandling(args, api, extraOptions, baseUrl) {
  const result = await fetchBaseQuery({
    baseUrl: baseUrl || API_BASE_URL,
    prepareHeaders: createAuthHeaders
  })(args, api, extraOptions);
  if (result.error && "status" in result.error && result.error.status === 401) {
    const url = typeof args === "string" ? args : args?.url || "";
    if (!url.includes("/auth/me")) {
      handleSessionTimeout();
    }
  }
  return result;
}
const baseApi = createApi({
  reducerPath: "mediaApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Chat", "Request", "File", "Model"],
  keepUnusedDataFor: 60,
  // 60 сек вместо 10 — снижает нагрузку при бездействии (было: постоянные запросы каждые 10 сек)
  refetchOnMountOrArgChange: 60,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({})
});
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false
};
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, {
      payload: { user, token }
    }) => {
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem("token", token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
    }
  }
});
const { setCredentials, logout } = authSlice.actions;
const authReducer = authSlice.reducer;
const selectCurrentUser = (state) => state.auth.user;
const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
let reconnectTimeoutId = null;
const RECONNECT_DELAY_MS = 5e3;
function connect(store2) {
  {
    reconnectTimeoutId = setTimeout(() => connect(), RECONNECT_DELAY_MS);
    return;
  }
}
function disconnect() {
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
}
function closeSSE() {
  disconnect();
}
function reconnectSSE(store2) {
  disconnect();
  connect();
}
function getApiState(getState, reducerPath) {
  const state = getState();
  return state[reducerPath] || null;
}
function isGetChatQuery(queryKey, queryData) {
  return queryData?.endpointName === "getChat" || queryKey.includes('"getChat"') || queryKey.startsWith("getChat(");
}
function isGetRequestQuery(queryKey, queryData) {
  return queryData?.endpointName === "getRequest" || queryKey.includes('"getRequest"') || queryKey.startsWith("getRequest(");
}
function findChatsWithFile(queries, fileId) {
  const results = [];
  for (const [queryKey, queryData] of Object.entries(queries)) {
    if (isGetChatQuery(queryKey, queryData) && queryData?.data && queryData.status === "fulfilled" && queryData.originalArgs && typeof queryData.originalArgs === "object" && "id" in queryData.originalArgs) {
      const chat = queryData.data;
      const hasFile = chat.requests.some(
        (req) => req.files.some((f) => f.id === fileId)
      );
      if (hasFile) {
        results.push({
          chat,
          args: queryData.originalArgs,
          queryKey
        });
      }
    }
  }
  return results;
}
function findRequestsWithFile(queries, fileId) {
  const results = [];
  for (const [queryKey, queryData] of Object.entries(queries)) {
    if (isGetRequestQuery(queryKey, queryData) && queryData?.data && queryData.status === "fulfilled" && typeof queryData.originalArgs === "number") {
      const request = queryData.data;
      if (request && "files" in request && Array.isArray(request.files) && request.files.some((f) => f.id === fileId)) {
        results.push({
          request,
          requestId: queryData.originalArgs,
          queryKey
        });
      }
    }
  }
  return results;
}
function updateFileInChat(draft, fileId, updater) {
  if (draft?.requests) {
    draft.requests = draft.requests.map((req) => ({
      ...req,
      files: req.files.map((f) => f.id === fileId ? updater(f) : f)
    }));
  }
}
function removeFileFromChat(draft, fileId) {
  if (draft?.requests) {
    draft.requests = draft.requests.map((req) => ({
      ...req,
      files: req.files.filter((f) => f.id !== fileId)
    }));
  }
}
function removeFileFromRequest(draft, fileId) {
  if (draft?.files) {
    draft.files = draft.files.filter((f) => f.id !== fileId);
  }
}
const mediaEndpoints = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ==================== Чаты ====================
    // Цены моделей
    getPricing: build.query({
      query: () => "/pricing",
      transformResponse: (response) => response.data,
      providesTags: [{ type: "Model", id: "PRICING" }]
    }),
    // Остаток кредитов Kie.ai (GET api.kie.ai/api/v1/chat/credit)
    getKieCredits: build.query({
      query: () => "/kie-credits",
      transformResponse: (response) => response.success ? response.credits : null,
      providesTags: [{ type: "Model", id: "KIE_CREDITS" }]
    }),
    // Баланс Wavespeed (GET https://api.wavespeed.ai/api/v3/balance)
    getWavespeedBalance: build.query({
      query: () => "/wavespeed-balance",
      transformResponse: (response) => response.success ? response.balance : null,
      providesTags: [{ type: "Model", id: "WAVESPEED_BALANCE" }]
    }),
    // Получить все чаты
    getChats: build.query({
      query: (arg) => {
        const appMode = arg && "appMode" in arg ? arg.appMode : void 0;
        return appMode ? `/chats?appMode=${appMode}` : "/chats";
      },
      transformResponse: (response) => response.data,
      providesTags: (result) => result ? [
        ...result.map(({ id }) => ({
          type: "Chat",
          id
        })),
        { type: "Chat", id: "LIST" }
      ] : [{ type: "Chat", id: "LIST" }]
    }),
    // Получить чат по ID
    getChat: build.query({
      query: ({ id, limit, includeInputFiles, appMode }) => {
        const url = `/chats/${id}`;
        const params = new URLSearchParams();
        if (limit !== void 0)
          params.append("limit", limit.toString());
        if (includeInputFiles)
          params.append("includeInputFiles", "true");
        if (appMode) params.append("appMode", appMode);
        const queryString = params.toString();
        return url + (queryString ? `?${queryString}` : "");
      },
      transformResponse: (response) => response.data,
      providesTags: (result, _error, { id }) => [
        { type: "Chat", id },
        // Добавляем File теги, чтобы при удалении файла чат обновлялся
        ...result?.requests.flatMap(
          (req) => req.files.map((file) => ({
            type: "File",
            id: file.id
          }))
        ) || []
      ]
    }),
    // Создать чат
    createChat: build.mutation({
      query: (body) => ({
        url: "/chats",
        method: "POST",
        body
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: "Chat", id: "LIST" }]
    }),
    // Обновить чат
    updateChat: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/chats/${id}`,
        method: "PATCH",
        body
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Chat", id },
        { type: "Chat", id: "LIST" }
      ]
    }),
    // Удалить чат
    deleteChat: build.mutation({
      query: (id) => ({
        url: `/chats/${id}`,
        method: "DELETE"
      }),
      invalidatesTags: (_result, _error, chatId) => [
        { type: "Chat", id: chatId },
        { type: "Chat", id: "LIST" }
      ]
    }),
    // ==================== Генерация ====================
    // Отправить запрос на генерацию
    generateMedia: build.mutation({
      query: (body) => {
        console.log("[RTK Query] generateMedia mutation \u0432\u044B\u0437\u0432\u0430\u043D:", {
          chatId: body.chatId,
          prompt: body.prompt?.substring(0, 50),
          model: body.model,
          format: body.format,
          quality: body.quality,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        return {
          url: "/generate",
          method: "POST",
          body
        };
      },
      transformResponse: (response) => {
        console.log(
          "[RTK Query] generateMedia response \u043F\u043E\u043B\u0443\u0447\u0435\u043D:",
          response.data
        );
        return response.data;
      },
      // Инвалидируем кеш чата при успехе, чтобы немедленно обновить UI
      invalidatesTags: (result, _error, { chatId }) => [
        { type: "Chat", id: chatId },
        // Обновляем конкретный чат
        { type: "Chat", id: "LIST" },
        // Обновляем список всех чатов (счетчики)
        { type: "Request", id: result?.requestId || "LIST" },
        // Обновляем конкретный запрос
        { type: "Request", id: "LIST" }
        // Обновляем список всех запросов
      ]
    }),
    // Тестовый режим генерации (использует последний файл из чата)
    generateMediaTest: build.mutation({
      query: (body) => {
        console.log(
          "[RTK Query] \u{1F9EA} generateMediaTest mutation \u0432\u044B\u0437\u0432\u0430\u043D (\u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C):",
          {
            chatId: body.chatId,
            prompt: body.prompt?.substring(0, 50),
            seed: body.seed,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        );
        return {
          url: "/generate-test",
          method: "POST",
          body: {
            chatId: body.chatId,
            prompt: body.prompt,
            ...body.seed !== void 0 && body.seed !== null && body.seed !== "" && { seed: body.seed }
          }
        };
      },
      transformResponse: (response) => {
        console.log(
          "[RTK Query] \u{1F9EA} generateMediaTest response \u043F\u043E\u043B\u0443\u0447\u0435\u043D (\u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C):",
          response.data
        );
        return response.data;
      },
      // Инвалидируем кеш чата при успехе, чтобы обновить список запросов
      invalidatesTags: (result, _error, { chatId }) => [
        { type: "Chat", id: chatId },
        { type: "Request", id: result?.requestId || "LIST" }
      ]
    }),
    // ==================== Запросы ====================
    // Получить статус запроса
    getRequest: build.query({
      query: ({ id, appMode }) => appMode ? `/requests/${id}?appMode=${appMode}` : `/requests/${id}`,
      transformResponse: (response) => {
        console.log("[RTK Query] getRequest response:", {
          id: response.data.id,
          status: response.data.status,
          filesCount: response.data.files.length,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        return response.data;
      },
      providesTags: (result, _error, args) => [
        { type: "Request", id: args.id },
        ...result?.files.map((f) => ({
          type: "File",
          id: f.id
        })) || []
      ]
    }),
    // ==================== Файлы ====================
    // Получить все файлы
    getFiles: build.query({
      query: ({ page = 1, limit = 20, chatId, appMode }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (chatId !== void 0) {
          params.append("chatId", chatId.toString());
        }
        if (appMode) params.append("appMode", appMode);
        return `/files?${params.toString()}`;
      },
      transformResponse: (response) => ({
        data: response.data,
        pagination: response.pagination
      }),
      providesTags: (result, _error, { chatId }) => result ? [
        ...result.data.map(({ id }) => ({
          type: "File",
          id
        })),
        { type: "File", id: "LIST" },
        // Добавляем тег чата для инвалидации при изменении чата
        ...chatId !== void 0 ? [{ type: "Chat", id: chatId }] : []
      ] : [
        { type: "File", id: "LIST" },
        ...chatId !== void 0 ? [{ type: "Chat", id: chatId }] : []
      ]
    }),
    // Загрузить thumbnail для видео
    uploadThumbnail: build.mutation({
      query: ({ fileId, thumbnail }) => ({
        url: `/files/${fileId}/thumbnail`,
        method: "POST",
        body: { thumbnail }
      }),
      transformResponse: (response) => response.data,
      // Оптимистичное обновление - сразу показываем превью
      async onQueryStarted({ fileId, thumbnail }, { dispatch, queryFulfilled, getState }) {
        const apiState = getApiState(getState, baseApi.reducerPath);
        if (!apiState) return;
        const queries = apiState.queries || {};
        const chatPatches = [];
        const chatsWithFile = findChatsWithFile(queries, fileId);
        for (const { args } of chatsWithFile) {
          const patchResult = dispatch(
            mediaEndpoints.util.updateQueryData(
              "getChat",
              args,
              (draft) => {
                updateFileInChat(draft, fileId, (file) => ({
                  ...file,
                  previewPath: `__pending__${thumbnail}`
                }));
              }
            )
          );
          chatPatches.push({ undo: patchResult.undo });
        }
        try {
          const { data } = await queryFulfilled;
          for (const { args } of chatsWithFile) {
            dispatch(
              mediaEndpoints.util.updateQueryData(
                "getChat",
                args,
                (draft) => {
                  updateFileInChat(draft, fileId, (file) => ({
                    ...file,
                    previewPath: data.previewPath
                  }));
                }
              )
            );
          }
        } catch {
          chatPatches.forEach((patch) => patch.undo());
        }
      }
    }),
    // Загрузить файлы на imgbb (для inputFiles)
    uploadToImgbb: build.mutation({
      query: (body) => ({
        url: "/upload-to-imgbb",
        method: "POST",
        body
      }),
      transformResponse: (response) => {
        console.log(
          "[RTK Query] uploadToImgbb response \u043F\u043E\u043B\u0443\u0447\u0435\u043D:",
          response.data
        );
        return response.data;
      }
    }),
    // Загрузить пользовательские медиа
    uploadUserMedia: build.mutation({
      query: (body) => ({
        url: "/upload-user-media",
        method: "POST",
        body
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (result, _error, { chatId }) => [
        { type: "Chat", id: chatId },
        { type: "Chat", id: "LIST" },
        { type: "Request", id: result?.requestId || "LIST" },
        { type: "Request", id: "LIST" },
        { type: "File", id: "LIST" }
      ]
    }),
    promptEnhance: build.mutation({
      query: (body) => ({
        url: "/prompt-enhance",
        method: "POST",
        body
      }),
      transformResponse: (response) => response.data
    }),
    // Библиотека LoRA файлов на сервере
    getLoraFiles: build.query({
      query: () => "/loras",
      transformResponse: (response) => response.data,
      providesTags: [{ type: "File", id: "LORA_LIBRARY" }]
    }),
    // Загрузить LoRA файл (.safetensors) в библиотеку сервера
    uploadLoraFile: build.mutation({
      query: (body) => ({
        url: "/loras/upload",
        method: "POST",
        body
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: "File", id: "LORA_LIBRARY" }]
    }),
    deleteLoraFile: build.mutation({
      query: (filename) => ({
        url: `/loras/${encodeURIComponent(filename)}`,
        method: "DELETE"
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: "File", id: "LORA_LIBRARY" }]
    }),
    // Удалить файл
    deleteFile: build.mutation({
      query: (id) => ({
        url: `/files/${id}`,
        method: "DELETE"
      }),
      async onQueryStarted(fileId, { dispatch, queryFulfilled, getState }) {
        const apiState = getApiState(getState, baseApi.reducerPath);
        if (!apiState) return;
        const queries = apiState.queries || {};
        const chatPatches = [];
        const chatsWithFile = findChatsWithFile(queries, fileId);
        const chatId = chatsWithFile[0]?.chat.id || null;
        for (const { args, chat } of chatsWithFile) {
          const patchResult = dispatch(
            mediaEndpoints.util.updateQueryData(
              "getChat",
              args,
              (draft) => {
                removeFileFromChat(draft, fileId);
              }
            )
          );
          chatPatches.push({
            undo: patchResult.undo,
            chatId: chat.id
          });
        }
        const requestsWithFile = findRequestsWithFile(queries, fileId);
        for (const { requestId } of requestsWithFile) {
          dispatch(
            mediaEndpoints.util.updateQueryData(
              "getRequest",
              { id: requestId },
              (draft) => {
                removeFileFromRequest(draft, fileId);
              }
            )
          );
        }
        let chatsPatch = null;
        if (chatId) {
          chatsPatch = dispatch(
            mediaEndpoints.util.updateQueryData(
              "getChats",
              void 0,
              (draft) => {
                if (draft) {
                  const chat = draft.find(
                    (c) => c.id === chatId
                  );
                  if (chat && chat._count && chat._count.files > 0) {
                    chat._count.files -= 1;
                  }
                }
              }
            )
          );
        }
        try {
          await queryFulfilled;
        } catch {
          chatPatches.forEach((patch) => patch.undo());
          chatsPatch?.undo();
        }
      },
      invalidatesTags: (_result, _error, fileId) => [
        { type: "File", id: fileId },
        { type: "File", id: "LIST" },
        { type: "Request", id: "LIST" }
      ]
    })
  }),
  overrideExisting: false
});
const {
  useGetChatsQuery,
  useGetChatQuery,
  useGetPricingQuery,
  useGetKieCreditsQuery,
  useGetWavespeedBalanceQuery,
  useCreateChatMutation,
  useUpdateChatMutation,
  useDeleteChatMutation,
  useGenerateMediaMutation,
  useGenerateMediaTestMutation,
  useGetRequestQuery,
  useLazyGetRequestQuery,
  useGetFilesQuery,
  useUploadThumbnailMutation,
  useDeleteFileMutation,
  useUploadToImgbbMutation,
  useUploadUserMediaMutation,
  useGetLoraFilesQuery,
  useUploadLoraFileMutation,
  useDeleteLoraFileMutation,
  usePromptEnhanceMutation
} = mediaEndpoints;
const modelsEndpoints = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Получить доступные модели
    getModels: build.query({
      query: (arg) => {
        const appMode = arg && "appMode" in arg ? arg.appMode : void 0;
        return appMode ? `/models?appMode=${appMode}` : "/models";
      },
      transformResponse: (response) => response.data,
      providesTags: [{ type: "Model", id: "LIST" }],
      // Модели обновляются редко, поэтому не нужно часто проверять обновления
      keepUnusedDataFor: 300
      // Хранить данные 5 минут
    })
  }),
  overrideExisting: false
});
const { useGetModelsQuery } = modelsEndpoints;
function transformPrismaUserToReduxUser(prismaUser) {
  return {
    id: prismaUser.id,
    email: prismaUser.email,
    role: prismaUser.role,
    balance: prismaUser.tokenBalance,
    telegramId: prismaUser.telegramId ?? void 0
  };
}
const authEndpoints = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (credentials) => ({
        url: "../auth/login",
        method: "POST",
        body: credentials
      }),
      transformResponse: (response) => ({
        token: response.token,
        user: transformPrismaUserToReduxUser(response.user)
      })
    }),
    register: build.mutation({
      query: (credentials) => ({
        url: "../auth/register",
        method: "POST",
        body: credentials
      }),
      transformResponse: (response) => ({
        token: response.token,
        user: transformPrismaUserToReduxUser(response.user)
      })
    }),
    getMe: build.query({
      query: () => "../auth/me",
      transformResponse: (response) => transformPrismaUserToReduxUser(response.user)
    })
  })
});
const { useLoginMutation, useRegisterMutation, useGetMeQuery } = authEndpoints;
const sseMiddleware = () => (next) => (action) => {
  if (action && typeof action === "object" && "type" in action) {
    const a = action;
    if (a.type === logout.type) closeSSE();
    if (a.type === setCredentials.type) reconnectSSE();
  }
  return next(action);
};
const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sseMiddleware, baseApi.middleware)
});
setupListeners(store.dispatch);
function KieCredits() {
  const user = useSelector(selectCurrentUser);
  const { data: credits, isLoading, isError, refetch, isFetching } = useGetKieCreditsQuery(void 0, {
    skip: !user,
    pollingInterval: 6e4
  });
  if (!user) return null;
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700",
      title: "\u041A\u0440\u0435\u0434\u0438\u0442\u044B Kie.ai (\u043E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438)",
      children: [
        /* @__PURE__ */ jsxDEV(Zap, { className: "w-4 h-4 text-amber-400" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/KieCredits.tsx",
          lineNumber: 22,
          columnNumber: 13
        }, this),
        isLoading ? /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-slate-400", children: "\u2014" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/KieCredits.tsx",
          lineNumber: 24,
          columnNumber: 17
        }, this) : isError ? /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-red-400", title: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438", children: "\u2014" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/KieCredits.tsx",
          lineNumber: 26,
          columnNumber: 17
        }, this) : /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-medium text-white", children: credits ?? 0 }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/KieCredits.tsx",
          lineNumber: 28,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            onClick: () => refetch(),
            disabled: isFetching,
            className: "p-0.5 rounded hover:bg-slate-600 disabled:opacity-50",
            title: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u0440\u0435\u0434\u0438\u0442\u044B",
            "aria-label": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u0440\u0435\u0434\u0438\u0442\u044B Kie.ai",
            children: /* @__PURE__ */ jsxDEV(RefreshCw, { className: `w-3.5 h-3.5 text-slate-400 ${isFetching ? "animate-spin" : ""}` }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/KieCredits.tsx",
              lineNumber: 38,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/KieCredits.tsx",
            lineNumber: 30,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/KieCredits.tsx",
      lineNumber: 18,
      columnNumber: 9
    },
    this
  );
}
function WavespeedBalance() {
  const user = useSelector(selectCurrentUser);
  const {
    data: balance,
    isLoading,
    isError,
    refetch,
    isFetching
  } = useGetWavespeedBalanceQuery(void 0, {
    skip: !user,
    pollingInterval: 6e4
  });
  if (!user) return null;
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700",
      title: "\u0411\u0430\u043B\u0430\u043D\u0441 Wavespeed (USD, \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438)",
      children: [
        /* @__PURE__ */ jsxDEV(Sparkles, { className: "w-4 h-4 text-cyan-300" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/WavespeedBalance.tsx",
          lineNumber: 28,
          columnNumber: 13
        }, this),
        isLoading ? /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-slate-400", children: "\u2014" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/WavespeedBalance.tsx",
          lineNumber: 30,
          columnNumber: 17
        }, this) : isError ? /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-red-400", title: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438", children: "\u2014" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/WavespeedBalance.tsx",
          lineNumber: 32,
          columnNumber: 17
        }, this) : /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-medium text-white", children: [
          "$",
          (balance ?? 0).toFixed(2)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/WavespeedBalance.tsx",
          lineNumber: 36,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            onClick: () => refetch(),
            disabled: isFetching,
            className: "p-0.5 rounded hover:bg-slate-600 disabled:opacity-50",
            title: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0431\u0430\u043B\u0430\u043D\u0441 Wavespeed",
            "aria-label": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0431\u0430\u043B\u0430\u043D\u0441 Wavespeed",
            children: /* @__PURE__ */ jsxDEV(
              RefreshCw,
              {
                className: `w-3.5 h-3.5 text-slate-400 ${isFetching ? "animate-spin" : ""}`
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/WavespeedBalance.tsx",
                lineNumber: 48,
                columnNumber: 17
              },
              this
            )
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/WavespeedBalance.tsx",
            lineNumber: 40,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/WavespeedBalance.tsx",
      lineNumber: 24,
      columnNumber: 9
    },
    this
  );
}
const TELEGRAM_BOT_USERNAME = "wowbae_bot";
function generateTelegramBotLink(userId) {
  const payload = `id${userId}`;
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${payload}`;
}
function openTelegramBot(userId) {
  const link = generateTelegramBotLink(userId);
  console.log("Opening Telegram bot link:", link);
  console.log("Bot username:", TELEGRAM_BOT_USERNAME);
  try {
    window.open(link, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Error opening Telegram link:", error);
    window.location.href = link;
  }
}
const API_URL = "http://localhost:4000";
const MEDIA_FILES_URL = `${API_URL}/media-files`;
function getMediaFileUrl(path) {
  return `${MEDIA_FILES_URL}/${path}`;
}
const constants = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  API_URL,
  MEDIA_FILES_URL,
  getMediaFileUrl
}, Symbol.toStringTag, { value: "Module" }));
const ATTACH_FILE_LOADING_TIMEOUT = 1500;
function createLoadingEffectForAttachFile(setAttachingFile) {
  return function loadingEffectForAttachFile() {
    setAttachingFile(true);
    setTimeout(() => {
      setAttachingFile(false);
    }, ATTACH_FILE_LOADING_TIMEOUT);
  };
}
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function getProviderDisplayName(provider) {
  const providerNames = {
    laozhang: "LaoZhang",
    kieai: "Kie.ai",
    wavespeed: "Wavespeed"
  };
  return providerNames[provider] || provider;
}
function getMimeTypeFromDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+)/);
  return match ? match[1] : "image/png";
}
function isVideoDataUrl(dataUrl) {
  const mimeType = getMimeTypeFromDataUrl(dataUrl);
  return mimeType.startsWith("video/");
}
function toDirectImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.endsWith(".html") && /\.(png|jpg|jpeg|gif|webp)\.html$/i.test(url)) {
    return url.slice(0, -5);
  }
  return url;
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function getOriginalFileUrl(file) {
  if (file.path) {
    return getMediaFileUrl(file.path);
  }
  if (file.url) {
    return file.type === "IMAGE" ? toDirectImageUrl(file.url) : file.url;
  }
  return null;
}
async function downloadFile(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0444\u0430\u0439\u043B\u0430");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u0430:", error);
    alert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B");
  }
}
const Header = ({ variant = "fixed" }) => {
  const [isMounted, setIsMounted] = useState(false);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const location = useLocation();
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const isOnMediaPage = location.pathname.startsWith("/media");
  function handleTelegramLink(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Telegram button clicked", { user, userId: user?.id });
    if (!user) {
      console.warn("User not found in Redux store");
      return;
    }
    if (user.id) {
      openTelegramBot(user.id);
    } else {
      console.warn("User ID not found in user object:", user);
    }
  }
  const handleLogout = () => {
    dispatch(logout());
    window.location.href = "/login";
  };
  return /* @__PURE__ */ jsxDEV(
    "header",
    {
      className: cn(
        variant === "fixed" && "fixed top-0 left-0 right-0",
        variant === "docked" && "relative shrink-0",
        "z-100 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur supports-backdrop-filter:bg-slate-950/60"
      ),
      children: /* @__PURE__ */ jsxDEV("div", { className: "flex h-14 w-full items-center justify-between px-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxDEV(
          "img",
          {
            src: "/logo.png",
            alt: "Logo",
            className: "h-8 w-auto rounded-lg"
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
            lineNumber: 68,
            columnNumber: 21
          },
          void 0
        ) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
          lineNumber: 67,
          columnNumber: 17
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "nav",
          {
            className: "flex items-center gap-2",
            suppressHydrationWarning: true,
            children: !isMounted ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV(
                Link,
                {
                  to: "/login",
                  className: "text-sm font-medium text-white hover:text-cyan-400 px-3",
                  children: "Login"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                  lineNumber: 81,
                  columnNumber: 29
                },
                void 0
              ),
              /* @__PURE__ */ jsxDEV(
                Link,
                {
                  to: "/register",
                  className: "text-sm font-medium text-white hover:text-cyan-400 px-3",
                  children: "Register"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                  lineNumber: 87,
                  columnNumber: 29
                },
                void 0
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
              lineNumber: 80,
              columnNumber: 25
            }, void 0) : isAuthenticated ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV(KieCredits, {}, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                lineNumber: 96,
                columnNumber: 29
              }, void 0),
              /* @__PURE__ */ jsxDEV(WavespeedBalance, {}, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                lineNumber: 97,
                columnNumber: 29
              }, void 0),
              !isOnMediaPage && /* @__PURE__ */ jsxDEV(
                Link,
                {
                  to: "/media",
                  className: "text-sm font-medium text-white hover:text-cyan-400 px-3",
                  children: "Generate"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                  lineNumber: 99,
                  columnNumber: 33
                },
                void 0
              ),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: handleTelegramLink,
                  className: "flex items-center gap-1 text-sm font-medium text-white hover:text-cyan-400 px-3",
                  title: "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C Telegram \u0433\u0440\u0443\u043F\u043F\u0443",
                  children: [
                    /* @__PURE__ */ jsxDEV(LinkIcon, { className: "h-4 w-4" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                      lineNumber: 111,
                      columnNumber: 33
                    }, void 0),
                    /* @__PURE__ */ jsxDEV("span", { className: "hidden sm:inline", children: "Telegram" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                      lineNumber: 112,
                      columnNumber: 33
                    }, void 0)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                  lineNumber: 106,
                  columnNumber: 29
                },
                void 0
              ),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: handleLogout,
                  className: "text-sm font-medium text-gray-400 hover:text-white px-3",
                  children: "Logout"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                  lineNumber: 116,
                  columnNumber: 29
                },
                void 0
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
              lineNumber: 95,
              columnNumber: 25
            }, void 0) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV(
                Link,
                {
                  to: "/login",
                  className: "text-sm font-medium text-white hover:text-cyan-400 px-3",
                  children: "Login"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                  lineNumber: 125,
                  columnNumber: 29
                },
                void 0
              ),
              /* @__PURE__ */ jsxDEV(
                Link,
                {
                  to: "/register",
                  className: "text-sm font-medium text-white hover:text-cyan-400 px-3",
                  children: "Register"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
                  lineNumber: 131,
                  columnNumber: 29
                },
                void 0
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
              lineNumber: 124,
              columnNumber: 25
            }, void 0)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
            lineNumber: 74,
            columnNumber: 17
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
        lineNumber: 66,
        columnNumber: 13
      }, void 0)
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/Header.tsx",
      lineNumber: 59,
      columnNumber: 9
    },
    void 0
  );
};
function AuthInitializer() {
  const dispatch = useDispatch();
  const location = useLocation();
  const hasCheckedRef = useRef(false);
  const token = null;
  const isPublicRoute = location.pathname === "/login" || location.pathname === "/register" || location.pathname.startsWith("/ai-model");
  const {
    data: user,
    isSuccess,
    error
  } = useGetMeQuery(void 0, {
    skip: !token
    // Пропускаем запрос если нет токена
  });
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    if (!isPublicRoute) {
      handleSessionTimeout();
      return;
    }
  }, [token, isPublicRoute]);
  useEffect(() => {
    if (error && "status" in error && error.status === 401) {
      dispatch(logout());
      if (!isPublicRoute) {
        handleSessionTimeout();
      }
    }
  }, [error, dispatch, isPublicRoute]);
  useEffect(() => {
  }, [isSuccess, user, token, dispatch]);
  return null;
}
const THEME_STORAGE_KEY = "theme";
function useTheme() {
  const [theme, setTheme] = useState(() => {
    return "dark";
  });
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme, isMounted]);
  function setDarkTheme() {
    setTheme("dark");
  }
  return {
    theme,
    setDarkTheme,
    isDarkTheme: true,
    // Всегда true, так как только dark тема
    isMounted
    // Экспортируем для компонентов, которые нуждаются в проверке монтирования
  };
}
const Route$7 = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      {
        title: "AI Media Generator"
      }
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      }
    ],
    scripts: [
      {
        children: `
                    (function() {
                        try {
                            // \u0412\u0441\u0435\u0433\u0434\u0430 \u0443\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C dark \u0442\u0435\u043C\u0443 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E
                            document.documentElement.classList.add('dark');
                            localStorage.setItem('theme', 'dark');
                        } catch (e) {}
                    })();
                `
      }
    ]
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundComponent
});
function NotFoundComponent() {
  return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsxDEV("h1", { className: "text-6xl font-bold mb-4", children: "404" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
      lineNumber: 60,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-muted-foreground mb-8", children: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
      lineNumber: 61,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(
      "a",
      {
        href: "/",
        className: "px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors",
        children: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E"
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
        lineNumber: 64,
        columnNumber: 13
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
    lineNumber: 59,
    columnNumber: 9
  }, this);
}
function RootDocument({ children }) {
  useTheme();
  const location = useLocation();
  const shouldShowHeader = !location.pathname.startsWith("/login") && !location.pathname.startsWith("/register");
  const isMediaAppShell = location.pathname.startsWith("/media") || location.pathname.startsWith("/ai-model");
  const mediaShellLocked = shouldShowHeader && isMediaAppShell;
  return /* @__PURE__ */ jsxDEV(Provider, { store, children: /* @__PURE__ */ jsxDEV(
    "html",
    {
      lang: "en",
      suppressHydrationWarning: true,
      className: cn("dark", mediaShellLocked && "app-media-shell"),
      children: [
        /* @__PURE__ */ jsxDEV("head", { children: /* @__PURE__ */ jsxDEV(HeadContent, {}, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
          lineNumber: 97,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
          lineNumber: 96,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV(
          "body",
          {
            suppressHydrationWarning: true,
            className: cn(
              mediaShellLocked && "flex min-h-0 h-dvh max-h-dvh flex-col"
            ),
            children: [
              /* @__PURE__ */ jsxDEV(AuthInitializer, {}, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
                lineNumber: 106,
                columnNumber: 21
              }, this),
              mediaShellLocked ? /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-hidden overflow-x-auto", children: [
                /* @__PURE__ */ jsxDEV(Header, { variant: "docked" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
                  lineNumber: 109,
                  columnNumber: 29
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-0 min-w-0 flex-1 flex-col", children }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
                  lineNumber: 110,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
                lineNumber: 108,
                columnNumber: 25
              }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                shouldShowHeader && /* @__PURE__ */ jsxDEV(Header, { variant: "fixed" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
                  lineNumber: 116,
                  columnNumber: 50
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: cn(shouldShowHeader && "pt-14"), children }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
                  lineNumber: 117,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
                lineNumber: 115,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV(Scripts, {}, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
                lineNumber: 133,
                columnNumber: 21
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
            lineNumber: 99,
            columnNumber: 17
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
      lineNumber: 91,
      columnNumber: 13
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/__root.tsx",
    lineNumber: 90,
    columnNumber: 9
  }, this);
}
const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [register, { isLoading, error }] = useRegisterMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (password !== confirmPassword) {
      setPasswordError("\u041F\u0430\u0440\u043E\u043B\u0438 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442");
      return;
    }
    try {
      const { token, user } = await register({ email, password }).unwrap();
      dispatch(setCredentials({ token, user }));
      navigate({ to: "/media" });
    } catch (err) {
      console.error("Registration failed", err);
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-screen items-center justify-center bg-background", children: /* @__PURE__ */ jsxDEV("div", { className: "w-full max-w-md p-8", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "mb-8 text-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-6 flex justify-center", children: /* @__PURE__ */ jsxDEV(
        "img",
        {
          src: "/logo.png",
          alt: "Logo",
          className: "h-24 w-24 rounded-lg"
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
          lineNumber: 40,
          columnNumber: 25
        },
        void 0
      ) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 39,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold text-white mb-2", children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 46,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("p", { className: "text-slate-400", children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0434\u043B\u044F \u043D\u0430\u0447\u0430\u043B\u0430 \u0440\u0430\u0431\u043E\u0442\u044B" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 49,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
      lineNumber: 38,
      columnNumber: 17
    }, void 0),
    /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "Email" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
          lineNumber: 55,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            className: "w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors",
            placeholder: "your@email.com",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
            lineNumber: 58,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 54,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
          lineNumber: 68,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            className: "w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors",
            placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
            lineNumber: 71,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 67,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
          lineNumber: 81,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "password",
            value: confirmPassword,
            onChange: (e) => setConfirmPassword(e.target.value),
            className: "w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors",
            placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
            lineNumber: 84,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 80,
        columnNumber: 21
      }, void 0),
      passwordError && /* @__PURE__ */ jsxDEV("div", { className: "rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center", children: passwordError }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 94,
        columnNumber: 25
      }, void 0),
      error && /* @__PURE__ */ jsxDEV("div", { className: "rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 99,
        columnNumber: 25
      }, void 0),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "submit",
          disabled: isLoading,
          className: "w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed",
          children: isLoading ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Loader2, { className: "h-5 w-5 animate-spin" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
              lineNumber: 110,
              columnNumber: 33
            }, void 0),
            "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F..."
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
            lineNumber: 109,
            columnNumber: 29
          }, void 0) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(UserPlus, { className: "h-5 w-5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
              lineNumber: 115,
              columnNumber: 33
            }, void 0),
            "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F"
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
            lineNumber: 114,
            columnNumber: 29
          }, void 0)
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
          lineNumber: 103,
          columnNumber: 21
        },
        void 0
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center text-sm mt-6", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-slate-400", children: "\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442? " }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
          lineNumber: 121,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          Link,
          {
            to: "/login",
            className: "text-cyan-400 hover:text-cyan-300 hover:underline transition-colors",
            children: "\u0412\u043E\u0439\u0442\u0438"
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
            lineNumber: 122,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
        lineNumber: 120,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
      lineNumber: 53,
      columnNumber: 17
    }, void 0)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
    lineNumber: 37,
    columnNumber: 13
  }, void 0) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/register.tsx",
    lineNumber: 36,
    columnNumber: 9
  }, void 0);
};
const Route$6 = createFileRoute("/register")({
  component: Register
});
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { token, user } = await login({ email, password }).unwrap();
      dispatch(setCredentials({ token, user }));
      navigate({ to: "/media" });
    } catch (err) {
      console.error("Login failed", err);
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-screen items-center justify-center bg-background", children: /* @__PURE__ */ jsxDEV("div", { className: "w-full max-w-md p-8", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "mb-8 text-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-6 flex justify-center", children: /* @__PURE__ */ jsxDEV(
        "img",
        {
          src: "/logo.png",
          alt: "Logo",
          className: "h-20 w-20 rounded-lg"
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
          lineNumber: 31,
          columnNumber: 25
        },
        void 0
      ) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
        lineNumber: 30,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold text-white mb-2", children: "\u0412\u0445\u043E\u0434" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
        lineNumber: 37,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("p", { className: "text-slate-400", children: "\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
        lineNumber: 38,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
      lineNumber: 29,
      columnNumber: 17
    }, void 0),
    /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "Email" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
          lineNumber: 42,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            className: "w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors",
            placeholder: "your@email.com",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
            lineNumber: 45,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
        lineNumber: 41,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
          lineNumber: 55,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            className: "w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors",
            placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
            lineNumber: 58,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
        lineNumber: 54,
        columnNumber: 21
      }, void 0),
      error && /* @__PURE__ */ jsxDEV("div", { className: "rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center", children: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 email \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
        lineNumber: 68,
        columnNumber: 25
      }, void 0),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "submit",
          disabled: isLoading,
          className: "w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed",
          children: isLoading ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Loader2, { className: "h-5 w-5 animate-spin" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
              lineNumber: 79,
              columnNumber: 33
            }, void 0),
            "\u0412\u0445\u043E\u0434..."
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
            lineNumber: 78,
            columnNumber: 29
          }, void 0) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(LogIn, { className: "h-5 w-5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
              lineNumber: 84,
              columnNumber: 33
            }, void 0),
            "\u0412\u043E\u0439\u0442\u0438"
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
            lineNumber: 83,
            columnNumber: 29
          }, void 0)
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
          lineNumber: 72,
          columnNumber: 21
        },
        void 0
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center text-sm mt-6", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-slate-400", children: "\u041D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430? " }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
          lineNumber: 90,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          Link,
          {
            to: "/register",
            className: "text-cyan-400 hover:text-cyan-300 hover:underline transition-colors",
            children: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F"
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
            lineNumber: 91,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
        lineNumber: 89,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
      lineNumber: 40,
      columnNumber: 17
    }, void 0)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
    lineNumber: 28,
    columnNumber: 13
  }, void 0) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/login.tsx",
    lineNumber: 27,
    columnNumber: 9
  }, void 0);
};
const Route$5 = createFileRoute("/login")({
  component: Login
});
const $$splitComponentImporter$4 = () => import('./index-oCLOxyhT.mjs');
const Route$4 = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import('./index-DDEyrQFp.mjs');
const Route$3 = createFileRoute("/media/")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import('./index-CIkedPJU.mjs');
const Route$2 = createFileRoute("/ai-model/")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const PANEL_HEADER_CLASSES = "flex items-center justify-between border-b border-border p-4 min-h-[73px]";
const PANEL_HEADER_TITLE_CLASSES = "text-lg font-semibold text-foreground";
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsxDEV(
    Comp,
    {
      "data-slot": "button",
      "data-variant": variant,
      "data-size": size,
      className: cn(buttonVariants({ variant, size, className })),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/button.tsx",
      lineNumber: 52,
      columnNumber: 5
    },
    this
  );
}
const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => {
  return /* @__PURE__ */ jsxDEV(
    ScrollAreaPrimitive.Root,
    {
      "data-slot": "scroll-area",
      className: cn("relative overflow-hidden", className),
      ...props,
      children: [
        /* @__PURE__ */ jsxDEV(
          ScrollAreaPrimitive.Viewport,
          {
            ref,
            "data-slot": "scroll-area-viewport",
            className: "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
            children
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/scroll-area.tsx",
            lineNumber: 18,
            columnNumber: 7
          },
          void 0
        ),
        /* @__PURE__ */ jsxDEV(ScrollBar, {}, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/scroll-area.tsx",
          lineNumber: 25,
          columnNumber: 7
        }, void 0),
        /* @__PURE__ */ jsxDEV(ScrollAreaPrimitive.Corner, { className: "hidden" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/scroll-area.tsx",
          lineNumber: 26,
          columnNumber: 7
        }, void 0)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/scroll-area.tsx",
      lineNumber: 13,
      columnNumber: 5
    },
    void 0
  );
});
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;
function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    ScrollAreaPrimitive.ScrollAreaScrollbar,
    {
      "data-slot": "scroll-area-scrollbar",
      orientation,
      className: cn(
        "flex touch-none select-none transition-colors",
        orientation === "vertical" && "h-full w-1.5 border-l border-l-transparent p-[1px]",
        orientation === "horizontal" && "h-1.5 w-full flex-col border-t border-t-transparent p-[1px]",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxDEV(
        ScrollAreaPrimitive.ScrollAreaThumb,
        {
          "data-slot": "scroll-area-thumb",
          className: "relative flex-1 rounded-full bg-muted-foreground/50 hover:bg-foreground/50"
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/scroll-area.tsx",
          lineNumber: 51,
          columnNumber: 7
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/scroll-area.tsx",
      lineNumber: 38,
      columnNumber: 5
    },
    this
  );
}
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      "data-slot": "skeleton",
      className: cn("bg-muted/40 animate-pulse rounded-md", className),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/skeleton.tsx",
      lineNumber: 5,
      columnNumber: 5
    },
    this
  );
}
function DropdownMenu({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(DropdownMenuPrimitive.Root, { "data-slot": "dropdown-menu", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dropdown-menu.tsx",
    lineNumber: 12,
    columnNumber: 10
  }, this);
}
function DropdownMenuTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    DropdownMenuPrimitive.Trigger,
    {
      "data-slot": "dropdown-menu-trigger",
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dropdown-menu.tsx",
      lineNumber: 27,
      columnNumber: 5
    },
    this
  );
}
function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(DropdownMenuPrimitive.Portal, { children: /* @__PURE__ */ jsxDEV(
    DropdownMenuPrimitive.Content,
    {
      "data-slot": "dropdown-menu-content",
      sideOffset,
      className: cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-[300px] min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
        className
      ),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dropdown-menu.tsx",
      lineNumber: 41,
      columnNumber: 7
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dropdown-menu.tsx",
    lineNumber: 40,
    columnNumber: 5
  }, this);
}
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    DropdownMenuPrimitive.Item,
    {
      "data-slot": "dropdown-menu-item",
      "data-inset": inset,
      "data-variant": variant,
      className: cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dropdown-menu.tsx",
      lineNumber: 72,
      columnNumber: 5
    },
    this
  );
}
function Dialog({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(DialogPrimitive.Root, { "data-slot": "dialog", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
    lineNumber: 12,
    columnNumber: 10
  }, this);
}
function DialogPortal({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(DialogPrimitive.Portal, { "data-slot": "dialog-portal", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
    lineNumber: 24,
    columnNumber: 10
  }, this);
}
function DialogOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    DialogPrimitive.Overlay,
    {
      "data-slot": "dialog-overlay",
      className: cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      ),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
      lineNumber: 38,
      columnNumber: 5
    },
    this
  );
}
function DialogContent({
  className,
  children,
  showCloseButton = true,
  "aria-describedby": ariaDescribedBy,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(DialogPortal, { "data-slot": "dialog-portal", children: [
    /* @__PURE__ */ jsxDEV(DialogOverlay, {}, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
      lineNumber: 60,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      DialogPrimitive.Content,
      {
        "data-slot": "dialog-content",
        className: cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
          className
        ),
        "aria-describedby": ariaDescribedBy ?? void 0,
        ...props,
        children: [
          children,
          showCloseButton && /* @__PURE__ */ jsxDEV(
            DialogPrimitive.Close,
            {
              "data-slot": "dialog-close",
              className: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              children: [
                /* @__PURE__ */ jsxDEV(XIcon, {}, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
                  lineNumber: 76,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "sr-only", children: "Close" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
                  lineNumber: 77,
                  columnNumber: 13
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
              lineNumber: 72,
              columnNumber: 11
            },
            this
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
        lineNumber: 61,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
    lineNumber: 59,
    columnNumber: 5
  }, this);
}
function DialogHeader({ className, ...props }) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      "data-slot": "dialog-header",
      className: cn("flex flex-col gap-2 text-center sm:text-left", className),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
      lineNumber: 87,
      columnNumber: 5
    },
    this
  );
}
function DialogFooter({ className, ...props }) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      "data-slot": "dialog-footer",
      className: cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      ),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
      lineNumber: 97,
      columnNumber: 5
    },
    this
  );
}
function DialogTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    DialogPrimitive.Title,
    {
      "data-slot": "dialog-title",
      className: cn("text-lg leading-none font-semibold", className),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/dialog.tsx",
      lineNumber: 113,
      columnNumber: 5
    },
    this
  );
}
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsxDEV(
    "input",
    {
      type,
      "data-slot": "input",
      className: cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      ),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/input.tsx",
      lineNumber: 7,
      columnNumber: 5
    },
    this
  );
}
function loadTestMode() {
  {
    return false;
  }
}
const APP_MODES = {
  DEFAULT: "default",
  AI_MODEL: "ai-model"
};
function ChatSidebar({
  appMode = APP_MODES.DEFAULT,
  routeBase = "/media"
}) {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const currentChatId = params.chatId ? parseInt(params.chatId) : null;
  const { data: chats, isLoading: isChatsLoading } = useGetChatsQuery({
    appMode
  });
  const [createChat, { isLoading: isCreating }] = useCreateChatMutation();
  const [deleteChat] = useDeleteChatMutation();
  const [updateChat] = useUpdateChatMutation();
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChat, setEditingChat] = useState(null);
  const [newChatName, setNewChatName] = useState("");
  const [isTestMode, setIsTestMode] = useState(false);
  useEffect(() => {
    setIsTestMode(loadTestMode());
  }, []);
  function toggleTestMode() {
    const newState = !isTestMode;
    setIsTestMode(newState);
  }
  async function handleCreateChat() {
    if (!newChatName.trim()) return;
    try {
      const newChat = await createChat({
        name: newChatName.trim(),
        appMode
      }).unwrap();
      setNewChatName("");
      setIsNewChatDialogOpen(false);
      if (routeBase === "/ai-model") {
        navigate({
          to: "/ai-model/$chatId",
          params: { chatId: newChat.id.toString() }
        });
      } else {
        navigate({
          to: "/media/$chatId",
          params: { chatId: newChat.id.toString() }
        });
      }
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0447\u0430\u0442\u0430:", error);
      alert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0447\u0430\u0442\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u043D\u0441\u043E\u043B\u044C \u0434\u043B\u044F \u0434\u0435\u0442\u0430\u043B\u0435\u0439.");
    }
  }
  async function handleDeleteChat(chatId) {
    if (!confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0447\u0430\u0442 \u0438 \u0432\u0441\u0435 \u0435\u0433\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435?")) return;
    try {
      await deleteChat(chatId).unwrap();
      if (chatId === currentChatId) {
        navigate({
          to: routeBase === "/ai-model" ? "/ai-model" : "/media"
        });
      }
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u0447\u0430\u0442\u0430:", error);
      const serverError = error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object" && "error" in error.data ? String(error.data.error) : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0447\u0430\u0442. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443.";
      alert(serverError);
    }
  }
  async function handleEditChat() {
    if (!editingChat || !newChatName.trim()) return;
    try {
      await updateChat({
        id: editingChat.id,
        name: newChatName.trim()
      }).unwrap();
      setEditingChat(null);
      setNewChatName("");
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0447\u0430\u0442\u0430:", error);
    }
  }
  function openEditDialog(chat) {
    setEditingChat(chat);
    setNewChatName(chat.name);
    setIsEditDialogOpen(true);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-border bg-background", children: [
    /* @__PURE__ */ jsxDEV("div", { className: PANEL_HEADER_CLASSES, children: [
      /* @__PURE__ */ jsxDEV("h2", { className: PANEL_HEADER_TITLE_CLASSES, children: appMode === APP_MODES.AI_MODEL ? "AI Model" : "AI Media" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 169,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1", children: [
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: cn(
              "h-8 w-8",
              isTestMode ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"
            ),
            onClick: toggleTestMode,
            title: isTestMode ? "\u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0432\u043A\u043B\u044E\u0447\u0435\u043D (\u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C)" : "\u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D (\u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C)",
            children: /* @__PURE__ */ jsxDEV(FlaskConical, { className: "h-5 w-5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
              lineNumber: 189,
              columnNumber: 25
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 173,
            columnNumber: 21
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: "h-8 w-8 text-muted-foreground hover:text-primary",
            onClick: () => setIsNewChatDialogOpen(true),
            children: /* @__PURE__ */ jsxDEV(Plus, { className: "h-5 w-5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
              lineNumber: 197,
              columnNumber: 25
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 191,
            columnNumber: 21
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 172,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
      lineNumber: 168,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(ScrollArea, { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxDEV("div", { className: "p-2 w-64 truncate", children: isChatsLoading ? (
      // Skeleton loader
      Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "mb-2 flex items-center gap-2 p-2",
          children: [
            /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-4 w-4 rounded" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
              lineNumber: 212,
              columnNumber: 33
            }, this),
            /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-4 flex-1" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
              lineNumber: 213,
              columnNumber: 33
            }, this)
          ]
        },
        i,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
          lineNumber: 208,
          columnNumber: 29
        },
        this
      ))
    ) : chats && chats.length > 0 ? chats.map((chat) => /* @__PURE__ */ jsxDEV(
      ChatItem,
      {
        chat,
        isActive: chat.id === currentChatId,
        onDelete: () => handleDeleteChat(chat.id),
        onEdit: () => openEditDialog(chat),
        routeBase
      },
      chat.id,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 218,
        columnNumber: 29
      },
      this
    )) : /* @__PURE__ */ jsxDEV("div", { className: "py-8 text-center text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxDEV(MessageSquare, { className: "mx-auto mb-2 h-8 w-8 opacity-50" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 229,
        columnNumber: 29
      }, this),
      /* @__PURE__ */ jsxDEV("p", { children: "\u041D\u0435\u0442 \u0447\u0430\u0442\u043E\u0432" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 230,
        columnNumber: 29
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs", children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 231,
        columnNumber: 29
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
      lineNumber: 228,
      columnNumber: 25
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
      lineNumber: 204,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
      lineNumber: 203,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(
      Dialog,
      {
        open: isNewChatDialogOpen,
        onOpenChange: setIsNewChatDialogOpen,
        children: /* @__PURE__ */ jsxDEV(DialogContent, { className: "border-border bg-card", children: [
          /* @__PURE__ */ jsxDEV(DialogHeader, { children: /* @__PURE__ */ jsxDEV(DialogTitle, { className: "text-foreground", children: "\u041D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 244,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 243,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV(
            Input,
            {
              placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0447\u0430\u0442\u0430",
              value: newChatName,
              onChange: (e) => setNewChatName(e.target.value),
              onKeyDown: (e) => e.key === "Enter" && handleCreateChat(),
              className: "border-border bg-secondary text-foreground"
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
              lineNumber: 248,
              columnNumber: 21
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(DialogFooter, { children: [
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                variant: "ghost",
                onClick: () => setIsNewChatDialogOpen(false),
                className: "text-muted-foreground",
                children: "\u041E\u0442\u043C\u0435\u043D\u0430"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                lineNumber: 258,
                columnNumber: 25
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                onClick: handleCreateChat,
                disabled: isCreating || !newChatName.trim(),
                className: "bg-primary hover:bg-primary/90 text-primary-foreground",
                children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                lineNumber: 265,
                columnNumber: 25
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 257,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
          lineNumber: 242,
          columnNumber: 17
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 238,
        columnNumber: 13
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(Dialog, { open: isEditDialogOpen, onOpenChange: setIsEditDialogOpen, children: /* @__PURE__ */ jsxDEV(DialogContent, { className: "border-border bg-card", children: [
      /* @__PURE__ */ jsxDEV(DialogHeader, { children: /* @__PURE__ */ jsxDEV(DialogTitle, { className: "text-foreground", children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0447\u0430\u0442" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 280,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 279,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(
        Input,
        {
          placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0447\u0430\u0442\u0430",
          value: newChatName,
          onChange: (e) => setNewChatName(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && handleEditChat(),
          className: "border-border bg-secondary text-foreground"
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
          lineNumber: 284,
          columnNumber: 21
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(DialogFooter, { children: [
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            variant: "ghost",
            onClick: () => setIsEditDialogOpen(false),
            className: "text-muted-foreground",
            children: "\u041E\u0442\u043C\u0435\u043D\u0430"
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 292,
            columnNumber: 25
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            onClick: handleEditChat,
            disabled: !newChatName.trim(),
            className: "bg-primary hover:bg-primary/90 text-primary-foreground",
            children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 299,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
        lineNumber: 291,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
      lineNumber: 278,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
      lineNumber: 277,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
    lineNumber: 166,
    columnNumber: 9
  }, this);
}
function ChatItem({
  chat,
  isActive,
  onDelete,
  onEdit,
  routeBase
}) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: cn(
        "group flex items-center gap-2 rounded-xl py-2 px-3 transition-colors",
        isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      ),
      children: [
        routeBase === "/ai-model" ? /* @__PURE__ */ jsxDEV(
          Link,
          {
            to: "/ai-model/$chatId",
            params: { chatId: chat.id.toString() },
            className: "flex min-w-0 flex-1 items-center gap-2",
            children: [
              /* @__PURE__ */ jsxDEV(MessageSquare, { className: "h-4 w-4 shrink-0" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                lineNumber: 343,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "min-w-0 truncate text-sm", children: chat.name }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                lineNumber: 344,
                columnNumber: 21
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 338,
            columnNumber: 17
          },
          this
        ) : /* @__PURE__ */ jsxDEV(
          Link,
          {
            to: "/media/$chatId",
            params: { chatId: chat.id.toString() },
            className: "flex min-w-0 flex-1 items-center gap-2",
            children: [
              /* @__PURE__ */ jsxDEV(MessageSquare, { className: "h-4 w-4 shrink-0" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                lineNumber: 354,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "min-w-0 truncate text-sm", children: chat.name }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                lineNumber: 355,
                columnNumber: 21
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 349,
            columnNumber: 17
          },
          this
        ),
        chat._count && chat._count.files > 0 && /* @__PURE__ */ jsxDEV(
          "span",
          {
            className: cn(
              "shrink-0 text-xs transition-transform duration-200 translate-x-6 group-hover:translate-x-0",
              isActive ? "text-primary" : "text-muted-foreground"
            ),
            children: chat._count.files
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 362,
            columnNumber: 17
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(DropdownMenu, { children: [
          /* @__PURE__ */ jsxDEV(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxDEV(
            Button,
            {
              size: "icon",
              variant: "ghost",
              className: cn(
                "h-6 w-6 shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-100",
                isActive && "group-hover:bg-primary/20 hover:bg-primary/30"
              ),
              children: /* @__PURE__ */ jsxDEV(MoreVertical, { className: "h-4 w-4" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                lineNumber: 383,
                columnNumber: 25
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
              lineNumber: 374,
              columnNumber: 21
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
            lineNumber: 373,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(
            DropdownMenuContent,
            {
              align: "end",
              className: "border-border bg-card",
              children: [
                /* @__PURE__ */ jsxDEV(
                  DropdownMenuItem,
                  {
                    onClick: onEdit,
                    className: "text-foreground focus:bg-secondary focus:text-foreground",
                    children: [
                      /* @__PURE__ */ jsxDEV(Pencil, { className: "mr-2 h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                        lineNumber: 394,
                        columnNumber: 25
                      }, this),
                      "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C"
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                    lineNumber: 390,
                    columnNumber: 21
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  DropdownMenuItem,
                  {
                    onClick: onDelete,
                    className: "text-foreground focus:bg-destructive/10 focus:text-destructive",
                    children: [
                      /* @__PURE__ */ jsxDEV(Trash2, { className: "mr-2 h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                        lineNumber: 401,
                        columnNumber: 25
                      }, this),
                      "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
                    lineNumber: 397,
                    columnNumber: 21
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
              lineNumber: 386,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
          lineNumber: 372,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-sidebar.tsx",
      lineNumber: 329,
      columnNumber: 9
    },
    this
  );
}
const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsxDEV(
    "textarea",
    {
      ref,
      "data-slot": "textarea",
      className: cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/textarea.tsx",
      lineNumber: 10,
      columnNumber: 5
    },
    void 0
  );
});
Textarea.displayName = "Textarea";
const NumberInput = React.forwardRef(
  ({
    className,
    value,
    onValueChange,
    min,
    max,
    step = 1,
    disabled,
    ...props
  }, ref) => {
    const inputRef = React.useRef(null);
    React.useImperativeHandle(ref, () => inputRef.current);
    const numValue = value === void 0 || value === "" ? void 0 : Number(value);
    function handleIncrement() {
      if (disabled) return;
      const current = numValue ?? (min ?? 0);
      const newValue = current + step;
      const finalValue = max !== void 0 ? Math.min(newValue, max) : newValue;
      onValueChange?.(finalValue);
    }
    function handleDecrement() {
      if (disabled) return;
      const current = numValue ?? (max ?? 0);
      const newValue = current - step;
      const finalValue = min !== void 0 ? Math.max(newValue, min) : newValue;
      onValueChange?.(finalValue);
    }
    function handleChange(e) {
      const inputValue = e.target.value;
      if (inputValue === "") {
        onValueChange?.(void 0);
        return;
      }
      const normalizedValue = inputValue.replace(",", ".");
      const num = Number(normalizedValue);
      if (!isNaN(num) && normalizedValue.trim() !== "") {
        onValueChange?.(num);
      }
    }
    function handleBlur() {
      if (numValue !== void 0) {
        let finalValue = numValue;
        if (min !== void 0 && finalValue < min) finalValue = min;
        if (max !== void 0 && finalValue > max) finalValue = max;
        if (finalValue !== numValue) {
          onValueChange?.(finalValue);
        }
      }
    }
    return /* @__PURE__ */ jsxDEV("div", { className: "relative flex items-center", children: [
      /* @__PURE__ */ jsxDEV(
        Input,
        {
          ref: inputRef,
          type: "text",
          inputMode: "numeric",
          value: value === void 0 ? "" : String(value),
          onChange: handleChange,
          onBlur: handleBlur,
          disabled,
          className: cn("pr-7", className),
          min,
          max,
          ...props
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/number-input.tsx",
          lineNumber: 83,
          columnNumber: 17
        },
        void 0
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "absolute right-3 flex flex-col", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            tabIndex: -1,
            className: "flex h-3 w-4 items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-20",
            onClick: handleIncrement,
            disabled: disabled || max !== void 0 && numValue !== void 0 && numValue >= max,
            children: /* @__PURE__ */ jsxDEV(ChevronUp, { className: "size-3" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/number-input.tsx",
              lineNumber: 107,
              columnNumber: 25
            }, void 0)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/number-input.tsx",
            lineNumber: 97,
            columnNumber: 21
          },
          void 0
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            tabIndex: -1,
            className: "flex h-3 w-4 items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-20",
            onClick: handleDecrement,
            disabled: disabled || min !== void 0 && numValue !== void 0 && numValue <= min,
            children: /* @__PURE__ */ jsxDEV(ChevronDown, { className: "size-3" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/number-input.tsx",
              lineNumber: 119,
              columnNumber: 25
            }, void 0)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/number-input.tsx",
            lineNumber: 109,
            columnNumber: 21
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/number-input.tsx",
        lineNumber: 96,
        columnNumber: 17
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/number-input.tsx",
      lineNumber: 82,
      columnNumber: 13
    }, void 0);
  }
);
NumberInput.displayName = "NumberInput";
function Select({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(SelectPrimitive.Root, { "data-slot": "select", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
    lineNumber: 10,
    columnNumber: 10
  }, this);
}
function SelectGroup({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(SelectPrimitive.Group, { "data-slot": "select-group", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
    lineNumber: 16,
    columnNumber: 10
  }, this);
}
function SelectValue({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(SelectPrimitive.Value, { "data-slot": "select-value", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
    lineNumber: 22,
    columnNumber: 10
  }, this);
}
function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    SelectPrimitive.Trigger,
    {
      "data-slot": "select-trigger",
      "data-size": size,
      className: cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxDEV(SelectPrimitive.Icon, { asChild: true, children: /* @__PURE__ */ jsxDEV(ChevronDownIcon, { className: "size-4 opacity-50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
          lineNumber: 45,
          columnNumber: 9
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
          lineNumber: 44,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
      lineNumber: 34,
      columnNumber: 5
    },
    this
  );
}
function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxDEV(
    SelectPrimitive.Content,
    {
      "data-slot": "select-content",
      className: cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-[60] max-h-[300px] min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1",
        className
      ),
      position,
      align,
      style: props.style,
      ...props,
      children: [
        /* @__PURE__ */ jsxDEV(SelectScrollUpButton, {}, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
          lineNumber: 73,
          columnNumber: 9
        }, this),
        /* @__PURE__ */ jsxDEV(
          SelectPrimitive.Viewport,
          {
            className: cn(
              "p-1",
              position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
            ),
            children
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
            lineNumber: 74,
            columnNumber: 9
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectScrollDownButton, {}, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
          lineNumber: 83,
          columnNumber: 9
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
      lineNumber: 60,
      columnNumber: 7
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
    lineNumber: 59,
    columnNumber: 5
  }, this);
}
function SelectLabel({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    SelectPrimitive.Label,
    {
      "data-slot": "select-label",
      className: cn("text-muted-foreground px-2 py-1.5 text-xs", className),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
      lineNumber: 94,
      columnNumber: 5
    },
    this
  );
}
function SelectItem({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    SelectPrimitive.Item,
    {
      "data-slot": "select-item",
      className: cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsxDEV(
          "span",
          {
            "data-slot": "select-item-indicator",
            className: "absolute right-2 flex size-3.5 items-center justify-center",
            children: /* @__PURE__ */ jsxDEV(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsxDEV(CheckIcon, { className: "size-4" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
              lineNumber: 121,
              columnNumber: 11
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
              lineNumber: 120,
              columnNumber: 9
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
            lineNumber: 116,
            columnNumber: 7
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectPrimitive.ItemText, { children }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
          lineNumber: 124,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
      lineNumber: 108,
      columnNumber: 5
    },
    this
  );
}
function SelectScrollUpButton({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    SelectPrimitive.ScrollUpButton,
    {
      "data-slot": "select-scroll-up-button",
      className: cn(
        "flex cursor-default items-center justify-center py-1",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxDEV(ChevronUpIcon, { className: "size-4" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
        lineNumber: 155,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
      lineNumber: 147,
      columnNumber: 5
    },
    this
  );
}
function SelectScrollDownButton({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    SelectPrimitive.ScrollDownButton,
    {
      "data-slot": "select-scroll-down-button",
      className: cn(
        "flex cursor-default items-center justify-center py-1",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxDEV(ChevronDownIcon, { className: "size-4" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
        lineNumber: 173,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/select.tsx",
      lineNumber: 165,
      columnNumber: 5
    },
    this
  );
}
function loadLockButtonState() {
  {
    return false;
  }
}
function savePrompt(prompt, images, chatId, model) {
  return;
}
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span";
  return /* @__PURE__ */ jsxDEV(
    Comp,
    {
      "data-slot": "badge",
      className: cn(badgeVariants({ variant }), className),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/ui/badge.tsx",
      lineNumber: 38,
      columnNumber: 5
    },
    this
  );
}
const MODEL_ICONS = {
  NANO_BANANA_PRO_KIEAI: "\u{1F34C}",
  NANO_BANANA_2_KIEAI: "\u{1F34C}",
  FLUX_2_MAX_EDIT_WAVESPEED: "\u2728",
  GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI: "\u{1F9E0}",
  GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI: "\u{1F9E0}",
  MIDJOURNEY: "\u{1F3A8}",
  VEO_3_1_FAST_KIEAI: "\u{1F3A5}",
  NANO_BANANA_PRO_LAOZHANG: "\u{1F34C}",
  KLING_2_6_KIEAI: "\u{1F3AC}",
  KLING_3_0_KIEAI: "\u{1F3AC}",
  IMAGEN4_KIEAI: "\u{1F5BC}\uFE0F",
  IMAGEN4_ULTRA_KIEAI: "\u{1F48E}",
  SEEDREAM_4_5_KIEAI: "\u{1F30C}",
  SEEDREAM_4_5_EDIT_KIEAI: "\u{1FA84}",
  SEEDREAM_5_0_LITE_KIEAI: "\u{1F31F}",
  SEEDREAM_5_0_LITE_EDIT_KIEAI: "\u2728",
  ELEVENLABS_MULTILINGUAL_V2_KIEAI: "\u{1F3A4}",
  KLING_VIDEO_O1_WAVESPEED: "\u{1F3A5}",
  Z_IMAGE_TURBO_LORA_WAVESPEED: "\u{1F5BC}\uFE0F",
  Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED: "\u{1F5BC}\uFE0F",
  Z_IMAGE_LORA_TRAINER_WAVESPEED: "\u{1F9EA}",
  QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED: "\u{1F5BC}\uFE0F",
  SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED: "\u{1FA84}",
  KLING_2_6_MOTION_CONTROL_KIEAI: "\u{1F504}"
};
const DEFAULT_ICON = "\u2728";
function getModelIcon(model) {
  return MODEL_ICONS[model] || DEFAULT_ICON;
}
const PROVIDER_BADGE_CONFIG = {
  laozhang: {
    label: "LaoZhang",
    className: "bg-orange-900/50 text-orange-400 border-orange-700/50"
  },
  kieai: {
    label: "Kie.ai",
    className: "bg-blue-900/50 text-blue-400 border-blue-700/50"
  },
  wavespeed: {
    label: "Wavespeed",
    className: "bg-cyan-900/50 text-cyan-400 border-cyan-700/50"
  }
};
function ProviderBadge({
  provider,
  className,
  appMode = APP_MODES.DEFAULT
}) {
  const config2 = PROVIDER_BADGE_CONFIG[provider];
  if (!config2) {
    return null;
  }
  const modeClassName = appMode === APP_MODES.AI_MODEL ? "bg-emerald-900/50 text-emerald-400 border-emerald-700/50" : config2.className;
  return /* @__PURE__ */ jsxDEV(
    Badge,
    {
      variant: "outline",
      className: `ml-auto text-[10px] px-1.5 py-0 h-4 font-normal ${modeClassName} ${className || ""}`,
      children: config2.label
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
      lineNumber: 74,
      columnNumber: 9
    },
    this
  );
}
function ModelSelector({
  value,
  onChange,
  disabled,
  appMode = APP_MODES.DEFAULT
}) {
  const { data: models, isLoading } = useGetModelsQuery({ appMode });
  const imageModels = React__default.useMemo(() => {
    let filtered = models?.filter((model) => model.types.includes("IMAGE")) || [];
    return filtered.sort((a, b) => {
      if (a.provider === "kieai" && b.provider !== "kieai") return -1;
      if (a.provider !== "kieai" && b.provider === "kieai") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [models]);
  const videoModels = React__default.useMemo(() => {
    let filtered = models?.filter((model) => model.types.includes("VIDEO")) || [];
    return filtered.sort((a, b) => {
      if (a.provider === "kieai" && b.provider !== "kieai") return -1;
      if (a.provider !== "kieai" && b.provider === "kieai") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [models]);
  const audioModels = React__default.useMemo(() => {
    let filtered = models?.filter((model) => model.types.includes("AUDIO")) || [];
    return filtered.sort((a, b) => {
      if (a.provider === "kieai" && b.provider !== "kieai") return -1;
      if (a.provider !== "kieai" && b.provider === "kieai") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [models]);
  const currentModel = React__default.useMemo(
    () => models?.find((m) => m.key === value),
    [models, value]
  );
  const handleValueChange = React__default.useCallback(
    (v) => {
      if (v !== value) {
        onChange(v);
      }
    },
    [value, onChange]
  );
  return /* @__PURE__ */ jsxDEV(
    Select,
    {
      value,
      onValueChange: handleValueChange,
      disabled: disabled || isLoading,
      children: [
        /* @__PURE__ */ jsxDEV(SelectTrigger, { className: "w-[280px] border-border bg-secondary text-foreground rounded-xl", children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u044C", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 w-full", children: [
          /* @__PURE__ */ jsxDEV("span", { children: getModelIcon(value) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
            lineNumber: 158,
            columnNumber: 25
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "truncate", children: currentModel?.name || value }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
            lineNumber: 159,
            columnNumber: 25
          }, this),
          currentModel?.provider && currentModel.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
            ProviderBadge,
            {
              provider: currentModel.provider,
              appMode
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
              lineNumber: 164,
              columnNumber: 33
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
          lineNumber: 157,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
          lineNumber: 156,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
          lineNumber: 155,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          SelectContent,
          {
            side: "top",
            sideOffset: 8,
            position: "popper",
            collisionPadding: 20,
            avoidCollisions: true,
            className: "border-border bg-card data-[side=top]:animate-none!",
            children: isLoading ? /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 p-2 text-slate-400", children: [
              /* @__PURE__ */ jsxDEV(Sparkles, { className: "h-4 w-4 animate-pulse" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                lineNumber: 185,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439..." }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                lineNumber: 186,
                columnNumber: 25
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
              lineNumber: 184,
              columnNumber: 21
            }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
              imageModels.length > 0 && /* @__PURE__ */ jsxDEV(SelectGroup, { children: [
                /* @__PURE__ */ jsxDEV(SelectLabel, { className: "flex items-center gap-2 text-muted-foreground", children: [
                  /* @__PURE__ */ jsxDEV(ImageIcon, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 194,
                    columnNumber: 37
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 195,
                    columnNumber: 37
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                  lineNumber: 193,
                  columnNumber: 33
                }, this),
                imageModels.map((model) => /* @__PURE__ */ jsxDEV(
                  SelectItem,
                  {
                    value: model.key,
                    className: "text-muted-foreground focus:bg-secondary focus:text-foreground pl-6",
                    children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 w-full min-w-[200px]", children: [
                      /* @__PURE__ */ jsxDEV("span", { children: getModelIcon(model.key) }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                        lineNumber: 204,
                        columnNumber: 45
                      }, this),
                      /* @__PURE__ */ jsxDEV("span", { children: model.name }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                        lineNumber: 207,
                        columnNumber: 45
                      }, this),
                      model.provider && model.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
                        ProviderBadge,
                        {
                          provider: model.provider,
                          appMode
                        },
                        void 0,
                        false,
                        {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                          lineNumber: 211,
                          columnNumber: 53
                        },
                        this
                      )
                    ] }, void 0, true, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                      lineNumber: 203,
                      columnNumber: 41
                    }, this)
                  },
                  model.key,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 198,
                    columnNumber: 37
                  },
                  this
                ))
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                lineNumber: 192,
                columnNumber: 29
              }, this),
              videoModels.length > 0 && /* @__PURE__ */ jsxDEV(SelectGroup, { children: [
                /* @__PURE__ */ jsxDEV(SelectLabel, { className: "flex items-center gap-2 text-muted-foreground", children: [
                  /* @__PURE__ */ jsxDEV(Video, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 228,
                    columnNumber: 37
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: "\u0412\u0438\u0434\u0435\u043E" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 229,
                    columnNumber: 37
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                  lineNumber: 227,
                  columnNumber: 33
                }, this),
                videoModels.map((model) => /* @__PURE__ */ jsxDEV(
                  SelectItem,
                  {
                    value: model.key,
                    className: "text-muted-foreground focus:bg-secondary focus:text-foreground pl-6",
                    children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 w-full min-w-[200px]", children: [
                      /* @__PURE__ */ jsxDEV("span", { children: getModelIcon(model.key) }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                        lineNumber: 238,
                        columnNumber: 45
                      }, this),
                      /* @__PURE__ */ jsxDEV("span", { children: model.name }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                        lineNumber: 241,
                        columnNumber: 45
                      }, this),
                      model.provider && model.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
                        ProviderBadge,
                        {
                          provider: model.provider,
                          appMode
                        },
                        void 0,
                        false,
                        {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                          lineNumber: 245,
                          columnNumber: 53
                        },
                        this
                      )
                    ] }, void 0, true, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                      lineNumber: 237,
                      columnNumber: 41
                    }, this)
                  },
                  model.key,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 232,
                    columnNumber: 37
                  },
                  this
                ))
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                lineNumber: 226,
                columnNumber: 29
              }, this),
              audioModels.length > 0 && /* @__PURE__ */ jsxDEV(SelectGroup, { children: [
                /* @__PURE__ */ jsxDEV(SelectLabel, { className: "flex items-center gap-2 text-muted-foreground", children: [
                  /* @__PURE__ */ jsxDEV(Music, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 262,
                    columnNumber: 37
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: "\u0410\u0443\u0434\u0438\u043E" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 263,
                    columnNumber: 37
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                  lineNumber: 261,
                  columnNumber: 33
                }, this),
                audioModels.map((model) => /* @__PURE__ */ jsxDEV(
                  SelectItem,
                  {
                    value: model.key,
                    className: "text-muted-foreground focus:bg-secondary focus:text-foreground pl-6",
                    children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 w-full min-w-[200px]", children: [
                      /* @__PURE__ */ jsxDEV("span", { children: getModelIcon(model.key) }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                        lineNumber: 272,
                        columnNumber: 45
                      }, this),
                      /* @__PURE__ */ jsxDEV("span", { children: model.name }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                        lineNumber: 275,
                        columnNumber: 45
                      }, this),
                      model.provider && model.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
                        ProviderBadge,
                        {
                          provider: model.provider,
                          appMode
                        },
                        void 0,
                        false,
                        {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                          lineNumber: 279,
                          columnNumber: 53
                        },
                        this
                      )
                    ] }, void 0, true, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                      lineNumber: 271,
                      columnNumber: 41
                    }, this)
                  },
                  model.key,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                    lineNumber: 266,
                    columnNumber: 37
                  },
                  this
                ))
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
                lineNumber: 260,
                columnNumber: 29
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
              lineNumber: 189,
              columnNumber: 21
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
            lineNumber: 174,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
      lineNumber: 150,
      columnNumber: 9
    },
    this
  );
}
function ModelBadge({
  model,
  showProvider = false,
  appMode = APP_MODES.DEFAULT
}) {
  const { data: models } = useGetModelsQuery({ appMode });
  const modelInfo = models?.find((m) => m.key === model);
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
    /* @__PURE__ */ jsxDEV(
      Badge,
      {
        variant: "secondary",
        className: "bg-secondary text-muted-foreground",
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "mr-1", children: getModelIcon(model) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
            lineNumber: 319,
            columnNumber: 17
          }, this),
          modelInfo?.name || model
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
        lineNumber: 315,
        columnNumber: 13
      },
      this
    ),
    showProvider && modelInfo?.provider && modelInfo.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
      ProviderBadge,
      {
        provider: modelInfo.provider,
        appMode
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
        lineNumber: 325,
        columnNumber: 21
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/model-selector.tsx",
    lineNumber: 314,
    columnNumber: 9
  }, this);
}
function useTestMode() {
  const [isTestMode, setIsTestMode] = useState(false);
  useEffect(() => {
    setIsTestMode(loadTestMode());
  }, []);
  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === "ai-media-test-mode") {
        setIsTestMode(loadTestMode());
      }
    }
    function handleCustomStorageChange() {
      setIsTestMode(loadTestMode());
    }
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("test-mode-changed", handleCustomStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("test-mode-changed", handleCustomStorageChange);
    };
  }, []);
  function setTestMode(enabled) {
    setIsTestMode(enabled);
    window.dispatchEvent(new Event("test-mode-changed"));
  }
  function toggleTestMode() {
    setTestMode(!isTestMode);
  }
  return {
    isTestMode,
    setTestMode,
    toggleTestMode
  };
}
const MODEL_CONFIGS = {
  MIDJOURNEY: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  VEO_3_1_FAST_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: true,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    // videoFormat (ar)
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: true,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  NANO_BANANA_PRO_LAOZHANG: {
    isNanoBanana: false,
    isNanoBananaPro: true,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  KLING_2_6_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: true,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    // klingAspectRatio
    supportsQuality: false,
    supportsDuration: true,
    supportsSound: true,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  NANO_BANANA_PRO_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: true,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  NANO_BANANA_2_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  FLUX_2_MAX_EDIT_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 3
  },
  GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 1
  },
  GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: true,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 1
  },
  IMAGEN4_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: true,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  IMAGEN4_ULTRA_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: true,
    isImagen4Ultra: true,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  SEEDREAM_4_5_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: true,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  SEEDREAM_4_5_EDIT_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: true,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 14
  },
  SEEDREAM_5_0_LITE_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: true,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  SEEDREAM_5_0_LITE_EDIT_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: true,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 14
  },
  KLING_3_0_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: true,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: true,
    supportsSound: true,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: true,
    supportsMultiShots: true
  },
  ELEVENLABS_MULTILINGUAL_V2_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: true,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: true,
    supportsMode: false,
    supportsMultiShots: false
  },
  KLING_VIDEO_O1_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    // aspect_ratio
    supportsQuality: false,
    supportsDuration: true,
    // от 3 до 10 секунд
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 10
    // до 10 reference images
  },
  Z_IMAGE_TURBO_LORA_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 1
  },
  Z_IMAGE_LORA_TRAINER_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 1
  },
  QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 1
  },
  SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 14
  },
  WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: true,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: true,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 1
  },
  WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: true,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: true,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false,
    maxInputFiles: 1
  },
  SEEDANCE_1_5_PRO_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: true,
    // aspect_ratio (16:9 или 9:16)
    supportsQuality: false,
    supportsDuration: true,
    // 4, 8, 12 секунд
    supportsSound: true,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: false,
    supportsMultiShots: false
  },
  KLING_2_6_MOTION_CONTROL_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isKling3: false,
    isKlingMotionControl: true,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    isSeedream5: false,
    isSeedream5_Edit: false,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false,
    supportsMode: true,
    // 720p/1080p
    supportsMultiShots: false,
    maxInputFiles: 2
    // 1 image + 1 video
  }
};
function getModelConfig(model) {
  return MODEL_CONFIGS[model];
}
function useModelType(model) {
  return useMemo(() => {
    const config2 = getModelConfig(model);
    return {
      model,
      ...config2
    };
  }, [model]);
}
function getErrorMessage(error, fallback) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const err = error;
    if (err.status === 413)
      return "\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439. \u0412\u0438\u0434\u0435\u043E \u2014 \u043C\u0430\u043A\u0441 100MB, \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u2014 10MB.";
    if (typeof err.data === "object" && typeof err.data?.error === "string")
      return err.data.error;
    if (typeof err.data === "string") return err.data;
    if (typeof err.error === "string") return err.error;
    if (typeof err.message === "string") return err.message;
  }
  return fallback;
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}
function useChatInputFiles(chatId, appMode = APP_MODES.DEFAULT, allowZipArchive = false) {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadToImgbb] = useUploadToImgbbMutation();
  const [uploadUserMedia] = useUploadUserMediaMutation();
  const previewUrlsRef = useRef(/* @__PURE__ */ new Set());
  const processFiles = useCallback(
    async (files, shouldUpload = false, skipSizeCheck = false) => {
      const newFiles = [];
      const imageFiles = [];
      const videoFiles = [];
      for (const file of files) {
        const isZipArchive = file.type === "application/zip" || file.name.toLowerCase().endsWith(".zip");
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/") && !(allowZipArchive && isZipArchive)) {
          console.warn(
            "[ChatInput] \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D \u0444\u0430\u0439\u043B \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0433\u043E \u0442\u0438\u043F\u0430:",
            file.type
          );
          continue;
        }
        const maxSize = isZipArchive ? 50 * 1024 * 1024 : file.type.startsWith("video/") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (!skipSizeCheck && file.size > maxSize) {
          const maxSizeLabel = isZipArchive ? "50" : file.type.startsWith("video/") ? "100" : "10";
          alert(
            `\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 "${file.name}" \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0442\u044C ${maxSizeLabel}MB`
          );
          continue;
        }
        if (file.type.startsWith("image/")) {
          imageFiles.push(file);
        } else if (file.type.startsWith("video/")) {
          videoFiles.push(file);
        }
      }
      const filesForPreview = [...imageFiles, ...videoFiles];
      const zipFiles = files.filter(
        (file) => (file.type === "application/zip" || file.name.toLowerCase().endsWith(".zip")) && !file.type.startsWith("image/") && !file.type.startsWith("video/")
      );
      for (const file of [...filesForPreview, ...zipFiles]) {
        try {
          const isZipArchive = file.type === "application/zip" || file.name.toLowerCase().endsWith(".zip");
          const preview = isZipArchive ? "zip-archive" : URL.createObjectURL(file);
          if (!isZipArchive) {
            previewUrlsRef.current.add(preview);
          }
          newFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview
          });
        } catch (error) {
          console.error(
            "[ChatInput] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0444\u0430\u0439\u043B\u0430:",
            file.name,
            error
          );
          alert(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B "${file.name}"`);
        }
      }
      if (imageFiles.length > 0) {
        try {
          const base64Images = await Promise.all(
            imageFiles.map((file) => fileToBase64(file))
          );
          console.log(
            "[ChatInput] \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u043D\u0430 imgbb...",
            { count: imageFiles.length }
          );
          const result = await uploadToImgbb({
            files: base64Images
          }).unwrap();
          let imageIndex = 0;
          for (let i = 0; i < newFiles.length; i++) {
            if (newFiles[i].file.type.startsWith("image/")) {
              if (result.urls[imageIndex]) {
                newFiles[i].imgbbUrl = result.urls[imageIndex];
                imageIndex++;
              }
            }
          }
          console.log(
            "[ChatInput] \u2705 \u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B \u043D\u0430 imgbb:",
            { uploaded: result.uploaded, total: result.total }
          );
        } catch (error) {
          const errorMessage = getErrorMessage(
            error,
            "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439"
          );
          console.error(
            "[ChatInput] \u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u043D\u0430 imgbb:",
            errorMessage,
            error
          );
          alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439: ${errorMessage}`);
        }
      }
      if (shouldUpload && chatId && newFiles.length > 0) {
        try {
          const uploadFiles = await Promise.all(
            newFiles.filter(
              (f) => f.file.type.startsWith("image/") || f.file.type.startsWith("video/")
            ).map(async (f) => ({
              base64: await fileToBase64(f.file),
              mimeType: f.file.type,
              filename: f.file.name,
              imgbbUrl: f.imgbbUrl
            }))
          );
          if (uploadFiles.length === 0) {
            return newFiles;
          }
          console.log(
            `[ChatInput] \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 ${uploadFiles.length} \u0444\u0430\u0439\u043B\u043E\u0432 \u0432 \u0411\u0414 (ai-media)...`
          );
          const result = await uploadUserMedia({
            chatId,
            appMode,
            files: uploadFiles
          }).unwrap();
          console.log(
            "[ChatInput] \u2705 \u0424\u0430\u0439\u043B\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B \u0432 \u0411\u0414 \u0438 ai-media"
          );
          if (result && result.files) {
            result.files.forEach((serverFile) => {
              const localFile = newFiles.find(
                (f) => f.file.name === serverFile.filename
              );
              if (!localFile) return;
              const isVideo = serverFile.type === "VIDEO";
              if (isVideo && serverFile.path) {
                localFile.serverPath = serverFile.path;
              } else if (serverFile.url) {
                localFile.imgbbUrl = serverFile.url;
              }
            });
          }
        } catch (error) {
          const errorMessage = getErrorMessage(
            error,
            "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432"
          );
          console.error(
            "[ChatInput] \u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u043E\u0432 \u0432 \u0411\u0414:",
            errorMessage,
            error
          );
          alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432: ${errorMessage}`);
        }
      }
      return newFiles;
    },
    [uploadToImgbb, uploadUserMedia, chatId, appMode, allowZipArchive]
  );
  const urlToFile = useCallback(
    async (url, filename) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0444\u0430\u0439\u043B\u0430");
      }
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type });
    },
    []
  );
  const handleFileSelect = useCallback(
    async (event) => {
      const files = event.target.files;
      if (!files) return;
      try {
        const newFiles = await processFiles(Array.from(files), true);
        setAttachedFiles((prev) => [...prev, ...newFiles]);
      } catch (error) {
        const errorMessage = getErrorMessage(
          error,
          "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432"
        );
        console.error(
          "[ChatInput] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435 \u0444\u0430\u0439\u043B\u043E\u0432:",
          errorMessage,
          error
        );
        alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432: ${errorMessage}`);
      }
      if (event.target) {
        event.target.value = "";
      }
    },
    [processFiles]
  );
  const addFileFromUrl = useCallback(
    async (url, filename, imgbbUrl) => {
      try {
        const isImage = filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes("i.ibb.co") || // imgbb URL
        url.includes("i.imgbb.com");
        if (imgbbUrl && isImage) {
          console.log(
            "[ChatInput] \u2705 \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C imgbbUrl \u0438\u0437 \u0411\u0414, \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u043C \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u0443\u044E \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443 \u043D\u0430 imgbb:",
            imgbbUrl
          );
          const preview = url;
          const mimeType = filename.match(/\.png$/i) ? "image/png" : filename.match(/\.(jpg|jpeg)$/i) ? "image/jpeg" : filename.match(/\.gif$/i) ? "image/gif" : filename.match(/\.webp$/i) ? "image/webp" : "image/jpeg";
          const emptyBlob = new Blob([], { type: mimeType });
          const file2 = new File([emptyBlob], filename, {
            type: mimeType
          });
          const attachedFile = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file: file2,
            preview,
            imgbbUrl
            // Используем URL из БД напрямую, не загружаем на imgbb
          };
          setAttachedFiles((prev) => [...prev, attachedFile]);
          return;
        }
        const file = await urlToFile(url, filename);
        const processedFiles = await processFiles([file], false, true);
        setAttachedFiles((prev) => [...prev, ...processedFiles]);
      } catch (error) {
        const errorMessage = getErrorMessage(
          error,
          "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430"
        );
        console.error(
          "[ChatInput] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u0430:",
          errorMessage,
          error
        );
        alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430: ${errorMessage}`);
      }
    },
    [urlToFile, processFiles]
  );
  const removeFile = useCallback((fileId) => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file) {
        if (file.preview !== "zip-archive") {
          URL.revokeObjectURL(file.preview);
          previewUrlsRef.current.delete(file.preview);
        }
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);
  const handleDragOver = useCallback(
    (event, isDisabled) => {
      event.preventDefault();
      event.stopPropagation();
      if (!isDisabled) {
        setIsDragging(true);
      }
    },
    []
  );
  const handleDragLeave = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentTarget = event.currentTarget;
      const relatedTarget = event.relatedTarget;
      if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
        setIsDragging(false);
      }
    },
    []
  );
  const handleDrop = useCallback(
    async (event, isDisabled) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (isDisabled) return;
      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;
      try {
        const newFiles = await processFiles(files, true);
        if (newFiles.length > 0) {
          setAttachedFiles((prev) => [...prev, ...newFiles]);
        }
      } catch (error) {
        const errorMessage = getErrorMessage(
          error,
          "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432"
        );
        console.error(
          "[ChatInput] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435 \u0444\u0430\u0439\u043B\u043E\u0432 (drag-and-drop):",
          errorMessage,
          error
        );
        alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432: ${errorMessage}`);
      }
    },
    [processFiles]
  );
  const handlePaste = useCallback(
    async (event, isDisabled) => {
      if (isDisabled) return;
      const items = event.clipboardData.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
      if (files.length === 0) return;
      event.preventDefault();
      try {
        const newFiles = await processFiles(files, true);
        if (newFiles.length > 0) {
          setAttachedFiles((prev) => [...prev, ...newFiles]);
        }
      } catch (error) {
        const errorMessage = getErrorMessage(
          error,
          "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432"
        );
        console.error(
          "[ChatInput] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435 \u0444\u0430\u0439\u043B\u043E\u0432 (paste):",
          errorMessage,
          error
        );
        alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432: ${errorMessage}`);
      }
    },
    [processFiles]
  );
  const cleanup = useCallback(() => {
    previewUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    previewUrlsRef.current.clear();
  }, []);
  const clearFiles = useCallback(() => {
    setAttachedFiles((prev) => {
      prev.forEach((f) => {
        if (f.preview !== "zip-archive") {
          URL.revokeObjectURL(f.preview);
          previewUrlsRef.current.delete(f.preview);
        }
      });
      return [];
    });
  }, []);
  const getFileAsBase64 = useCallback(async (file) => {
    return fileToBase64(file);
  }, []);
  return {
    attachedFiles,
    setAttachedFiles,
    isDragging,
    processFiles,
    handleFileSelect,
    addFileFromUrl,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    cleanup,
    clearFiles,
    getFileAsBase64
  };
}
const Z_IMAGE_I2I_LORA_DEFAULT_STRENGTH = 0.1;
function useChatInputSubmit({
  chatId,
  currentModel,
  generateMedia,
  generateMediaTest,
  isTestMode,
  onRequestCreated,
  onPendingMessage,
  onSendError,
  getFileAsBase64,
  appMode = APP_MODES.DEFAULT
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInProgressRef = useRef(false);
  const [uploadToImgbb] = useUploadToImgbbMutation();
  function isAbortLikeError(error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }
    if (!(error && typeof error === "object")) return false;
    const maybeError = error;
    const rawParts = [
      maybeError.name,
      maybeError.message,
      maybeError.error,
      maybeError.data?.error,
      maybeError.status
    ].filter((value) => typeof value === "string").join(" ").toLowerCase();
    return rawParts.includes("abort") || rawParts.includes("aborted") || rawParts.includes("signal timed out");
  }
  function splitPromptsByAsterisk(input) {
    return input.split("*").map((part) => part.trim()).filter((part) => part.length > 0);
  }
  const handleSubmit = useCallback(
    async (event, params) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (submitInProgressRef.current) {
        console.warn(
          "[ChatInput] \u26A0\uFE0F \u041F\u043E\u043F\u044B\u0442\u043A\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0439 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 (\u0444\u043B\u0430\u0433 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D), \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u0435\u043C"
        );
        return;
      }
      if (!params.prompt.trim() && params.attachedFiles.length === 0) {
        return;
      }
      if (params.modelType.isSeedream4_5_Edit && params.attachedFiles.length > (params.modelType.maxInputFiles || 0)) {
        submitInProgressRef.current = false;
        setIsSubmitting(false);
        if (onSendError) {
          onSendError(
            `Seedream 4.5 Edit \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 14 \u0444\u0430\u0439\u043B\u043E\u0432. \u0412\u044B\u0431\u0440\u0430\u043D\u043E: ${params.attachedFiles.length}`
          );
        }
        return;
      }
      if (params.modelType.isSeedream5_Edit && params.attachedFiles.length > (params.modelType.maxInputFiles || 0)) {
        submitInProgressRef.current = false;
        setIsSubmitting(false);
        if (onSendError) {
          onSendError(
            `Seedream 5.0 Edit \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 14 \u0444\u0430\u0439\u043B\u043E\u0432. \u0412\u044B\u0431\u0440\u0430\u043D\u043E: ${params.attachedFiles.length}`
          );
        }
        return;
      }
      if (params.modelType.isKlingMotionControl) {
        const imageCount = params.attachedFiles.filter(
          (f) => f.file.type.startsWith("image/")
        ).length;
        const videoCount = params.attachedFiles.filter(
          (f) => f.file.type.startsWith("video/")
        ).length;
        if (imageCount !== 1 || videoCount !== 1) {
          submitInProgressRef.current = false;
          setIsSubmitting(false);
          if (onSendError) {
            onSendError(
              "Kling Motion Control \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0440\u043E\u0432\u043D\u043E 1 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 (\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436) \u0438 1 \u0432\u0438\u0434\u0435\u043E (\u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F)"
            );
          }
          return;
        }
      }
      const isGrokImagineImageToImage = currentModel === "GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI";
      const isGrokImagineImageToVideo = currentModel === "GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI";
      const isZImageLoraTrainer = currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED";
      if (isGrokImagineImageToImage || isGrokImagineImageToVideo) {
        const imageCount = params.attachedFiles.filter(
          (f) => f.file.type.startsWith("image/")
        ).length;
        if (imageCount === 0) {
          submitInProgressRef.current = false;
          setIsSubmitting(false);
          const message = "Grok Imagine \u0442\u0440\u0435\u0431\u0443\u0435\u0442 1 \u0432\u0445\u043E\u0434\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435";
          if (onSendError) {
            onSendError(message);
          }
          alert(message);
          return;
        }
        if (imageCount > 1) {
          submitInProgressRef.current = false;
          setIsSubmitting(false);
          const message = "Grok Imagine \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E 1 \u0432\u0445\u043E\u0434\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435";
          if (onSendError) {
            onSendError(message);
          }
          alert(message);
          return;
        }
      }
      const maxAttachments = params.modelType.maxInputFiles;
      if (maxAttachments != null && maxAttachments > 0 && params.attachedFiles.length > maxAttachments) {
        submitInProgressRef.current = false;
        setIsSubmitting(false);
        const message = `\u042D\u0442\u0430 \u043C\u043E\u0434\u0435\u043B\u044C \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 ${maxAttachments} \u0432\u0445\u043E\u0434\u043D\u044B\u0445 \u0444\u0430\u0439\u043B\u043E\u0432. \u0412\u044B\u0431\u0440\u0430\u043D\u043E: ${params.attachedFiles.length}`;
        if (onSendError) onSendError(message);
        alert(message);
        return;
      }
      if (isZImageLoraTrainer) {
        const zipCount = params.attachedFiles.filter(
          (f) => f.file.type === "application/zip" || f.file.name.toLowerCase().endsWith(".zip")
        ).length;
        if (zipCount === 0) {
          submitInProgressRef.current = false;
          setIsSubmitting(false);
          const message = "Z-Image LoRA Trainer \u0442\u0440\u0435\u0431\u0443\u0435\u0442 ZIP-\u0430\u0440\u0445\u0438\u0432 \u0441 \u0434\u0430\u0442\u0430\u0441\u0435\u0442\u043E\u043C";
          if (onSendError) onSendError(message);
          alert(message);
          return;
        }
        if (!params.triggerWord || params.triggerWord.trim().length < 2) {
          submitInProgressRef.current = false;
          setIsSubmitting(false);
          const message = "\u0414\u043B\u044F Z-Image LoRA Trainer \u0443\u043A\u0430\u0436\u0438\u0442\u0435 trigger word (\u043C\u0438\u043D\u0438\u043C\u0443\u043C 2 \u0441\u0438\u043C\u0432\u043E\u043B\u0430)";
          if (onSendError) onSendError(message);
          alert(message);
          return;
        }
      }
      submitInProgressRef.current = true;
      setIsSubmitting(true);
      let finalPrompt = params.prompt.trim();
      if (params.modelType.isNanoBanana && !params.modelType.isNanoBananaPro) {
        const promptParts = [];
        if (params.format) {
          promptParts.push(params.format);
        }
        if (params.quality) {
          promptParts.push(params.quality);
        }
        if (promptParts.length > 0) {
          finalPrompt = `${finalPrompt} ${promptParts.join(" ")}`;
        }
      }
      if (onPendingMessage) {
        onPendingMessage(finalPrompt);
      }
      try {
        let result;
        if (isTestMode) {
          console.log(
            "[ChatInput] \u{1F9EA} \u0422\u0415\u0421\u0422\u041E\u0412\u042B\u0419 \u0420\u0415\u0416\u0418\u041C: \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0411\u0415\u0417 \u0432\u044B\u0437\u043E\u0432\u0430 \u043D\u0435\u0439\u0440\u043E\u043D\u043A\u0438",
            {
              chatId,
              prompt: finalPrompt.substring(0, 50),
              note: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0444\u0430\u0439\u043B \u0438\u0437 \u0447\u0430\u0442\u0430, \u0437\u0430\u043F\u0440\u043E\u0441 \u0432 API \u043D\u0435\u0439\u0440\u043E\u043D\u043A\u0438 \u041D\u0415 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          );
          try {
            result = await generateMediaTest({
              chatId,
              prompt: finalPrompt,
              ...params.seed !== void 0 && params.seed !== null && params.seed !== "" && { seed: params.seed }
            }).unwrap();
          } catch (error) {
            if (error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object" && "error" in error.data && typeof error.data.error === "string" && error.data.error.includes("\u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432")) {
              alert(
                "\u0412 \u0447\u0430\u0442\u0435 \u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0434\u043B\u044F \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u0438\u043D \u0444\u0430\u0439\u043B."
              );
              submitInProgressRef.current = false;
              setIsSubmitting(false);
              return;
            }
            throw error;
          }
          console.log(
            "[ChatInput] \u{1F9EA} \u0422\u0415\u0421\u0422\u041E\u0412\u042B\u0419 \u0420\u0415\u0416\u0418\u041C: \u0437\u0430\u0433\u043B\u0443\u0448\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430, \u0444\u0430\u0439\u043B \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D \u0411\u0415\u0417 \u0432\u044B\u0437\u043E\u0432\u0430 \u043D\u0435\u0439\u0440\u043E\u043D\u043A\u0438, requestId:",
            result.requestId
          );
          if (onRequestCreated && result.requestId) {
            onRequestCreated(result.requestId);
          }
        } else {
          console.log(
            "[ChatInput] \u2705 \u041E\u0431\u044B\u0447\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C: \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u043D\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E \u0432 \u043D\u0435\u0439\u0440\u043E\u043D\u043A\u0443:",
            {
              chatId,
              prompt: finalPrompt.substring(0, 50),
              model: currentModel,
              format: params.format,
              quality: params.quality,
              videoFormat: params.modelType.isVeo ? params.videoFormat : void 0,
              veoGenerationType: params.modelType.isVeo ? params.veoGenerationType : void 0,
              attachedFilesCount: params.attachedFiles.length,
              imageFilesCount: params.attachedFiles.filter(
                (f) => f.file.type.startsWith("image/")
              ).length,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          );
          const imageFiles = params.attachedFiles.filter(
            (f) => f.file.type.startsWith("image/")
          );
          const zipFiles = params.attachedFiles.filter(
            (f) => f.file.type === "application/zip" || f.file.name.toLowerCase().endsWith(".zip")
          );
          const inputFilesUrls = [];
          let tailImageUrl;
          if (params.modelType.isKling25 && imageFiles.length > 0) {
            const firstImage = imageFiles[0];
            if (firstImage.imgbbUrl) {
              inputFilesUrls.push(firstImage.imgbbUrl);
            } else {
              const base64 = await getFileAsBase64(
                firstImage.file
              );
              const result2 = await uploadToImgbb({
                files: [base64]
              }).unwrap();
              if (result2.urls[0]) {
                inputFilesUrls.push(result2.urls[0]);
              } else {
                throw new Error(
                  `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B ${firstImage.file.name} \u043D\u0430 imgbb`
                );
              }
            }
            if (imageFiles.length >= 2) {
              const secondImage = imageFiles[1];
              if (secondImage.imgbbUrl) {
                tailImageUrl = secondImage.imgbbUrl;
              } else {
                const base64 = await getFileAsBase64(
                  secondImage.file
                );
                const result2 = await uploadToImgbb({
                  files: [base64]
                }).unwrap();
                if (result2.urls[0]) {
                  tailImageUrl = result2.urls[0];
                } else {
                  throw new Error(
                    `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C tail \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 ${secondImage.file.name} \u043D\u0430 imgbb`
                  );
                }
              }
            }
          } else {
            for (const file of imageFiles) {
              if (file.imgbbUrl) {
                inputFilesUrls.push(file.imgbbUrl);
              } else {
                console.log(
                  "[ChatInput] \u26A0\uFE0F imgbbUrl \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442, \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u043D\u0430 imgbb...",
                  file.file.name
                );
                const base64 = await getFileAsBase64(file.file);
                const result2 = await uploadToImgbb({
                  files: [base64]
                }).unwrap();
                if (result2.urls[0]) {
                  inputFilesUrls.push(result2.urls[0]);
                } else {
                  throw new Error(
                    `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B ${file.file.name} \u043D\u0430 imgbb`
                  );
                }
              }
            }
          }
          if (isZImageLoraTrainer && zipFiles.length > 0) {
            const firstArchiveBase64 = await getFileAsBase64(
              zipFiles[0].file
            );
            inputFilesUrls.push(firstArchiveBase64);
          }
          let inputVideoFilesUrls;
          if (params.modelType.isKlingMotionControl) {
            const videoFiles = params.attachedFiles.filter(
              (f) => f.file.type.startsWith("video/")
            );
            inputVideoFilesUrls = await Promise.all(
              videoFiles.map(async (f) => {
                if (f.serverPath) {
                  return getMediaFileUrl(f.serverPath);
                }
                return getFileAsBase64(f.file);
              })
            );
          }
          console.log(
            "[ChatInput] \u{1F4E4} \u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430 generateMedia:",
            {
              chatId,
              model: currentModel,
              inputFilesUrlsCount: inputFilesUrls.length,
              inputVideoFilesCount: inputVideoFilesUrls?.length ?? 0,
              hasInputFiles: inputFilesUrls.length > 0
            }
          );
          const generationSourcePrompt = params.enhancedPrompt?.trim() || finalPrompt;
          const promptBatch = splitPromptsByAsterisk(
            generationSourcePrompt
          );
          const promptsToGenerate = promptBatch.length > 0 ? promptBatch : [generationSourcePrompt];
          if (promptsToGenerate.length > 1) {
            console.log(
              "[ChatInput] \u{1F500} \u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D \u043C\u0443\u043B\u044C\u0442\u0438-\u043F\u0440\u043E\u043C\u043F\u0442 \u043F\u043E '*':",
              {
                promptsCount: promptsToGenerate.length
              }
            );
          }
          let lastResult = null;
          for (const [
            index,
            promptPart
          ] of promptsToGenerate.entries()) {
            const currentResult = await generateMedia({
              chatId,
              prompt: promptPart,
              enhancedPrompt: params.enhancedPrompt?.trim() && promptsToGenerate.length === 1 ? params.enhancedPrompt?.trim() : void 0,
              appMode: params.appMode || appMode,
              model: currentModel,
              inputFiles: inputFilesUrls.length > 0 ? inputFilesUrls : void 0,
              ...params.modelType.supportsFormat && params.format && { format: params.format },
              ...params.modelType.supportsQuality && params.quality && { quality: params.quality },
              ...params.modelType.isVeo && params.videoFormat && {
                ar: params.videoFormat
              },
              ...params.modelType.supportsVeoGenerationType && params.veoGenerationType && {
                generationType: params.veoGenerationType
              },
              ...params.modelType.isKling && params.klingAspectRatio && {
                format: params.klingAspectRatio
              },
              ...params.modelType.supportsDuration && params.klingDuration && {
                duration: params.klingDuration
              },
              ...params.modelType.supportsSound && params.klingSound !== void 0 && {
                sound: params.klingSound
              },
              ...params.fixedLens !== void 0 && {
                fixedLens: params.fixedLens
              },
              ...params.modelType.supportsNegativePrompt && params.negativePrompt && params.negativePrompt.trim() && {
                negativePrompt: params.negativePrompt.trim()
              },
              ...params.modelType.supportsSeed && params.seed !== void 0 && params.seed !== null && params.seed !== "" && { seed: params.seed },
              ...params.modelType.isKling25 && params.klingAspectRatio && {
                format: params.klingAspectRatio
              },
              ...params.modelType.isKling25 && params.klingDuration && {
                duration: params.klingDuration
              },
              ...params.modelType.isKling25 && params.negativePrompt && params.negativePrompt.trim() && {
                negativePrompt: params.negativePrompt.trim()
              },
              ...params.modelType.supportsCfgScale && params.cfgScale !== void 0 && params.cfgScale !== null && {
                cfgScale: params.cfgScale
              },
              ...params.modelType.supportsTailImageUrl && tailImageUrl && {
                tailImageUrl
              },
              ...params.modelType.supportsElevenLabsParams && {
                voice: params.voice,
                stability: params.stability,
                similarityBoost: params.similarityBoost,
                speed: params.speed,
                ...params.languageCode && {
                  languageCode: params.languageCode
                }
              },
              ...params.modelType.isKlingMotionControl && inputVideoFilesUrls && inputVideoFilesUrls.length > 0 && {
                inputVideoFiles: inputVideoFilesUrls,
                characterOrientation: params.klingMotionCharacterOrientation ?? "image",
                videoQuality: params.klingMotionVideoQuality === "1080p" ? "1080p" : "720p"
              },
              ...currentModel === "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED" && inputFilesUrls.length > 0 && {
                strength: Z_IMAGE_I2I_LORA_DEFAULT_STRENGTH
              },
              ...(currentModel === "Z_IMAGE_TURBO_LORA_WAVESPEED" || currentModel === "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED" || currentModel === "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED") && params.loras && params.loras.length > 0 && {
                loras: params.loras
              },
              ...currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED" && params.triggerWord && params.triggerWord.trim().length > 0 && {
                triggerWord: params.triggerWord.trim()
              }
            }).unwrap();
            lastResult = currentResult;
            if (onRequestCreated && currentResult.requestId) {
              onRequestCreated(currentResult.requestId);
            }
            console.log(
              "[ChatInput] \u2705 \u041F\u043E\u0434\u0437\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D",
              `${index + 1}/${promptsToGenerate.length}`
            );
          }
          if (!lastResult) {
            throw new Error(
              "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E"
            );
          }
          result = lastResult;
          console.log(
            "[ChatInput] \u2705 \u041E\u0431\u044B\u0447\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C: \u0437\u0430\u043F\u0440\u043E\u0441 \u0432 \u043D\u0435\u0439\u0440\u043E\u043D\u043A\u0443 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D, requestId:",
            result.requestId
          );
        }
        if (params.isLockEnabled) {
          const savedFilesData = [];
          for (const file of params.attachedFiles) {
            if (file.imgbbUrl) {
              savedFilesData.push(file.imgbbUrl);
            } else if (file.file.type.startsWith("video/")) {
              savedFilesData.push(file.preview);
            } else {
              const base64 = await getFileAsBase64(file.file);
              const result2 = await uploadToImgbb({
                files: [base64]
              }).unwrap();
              if (result2.urls[0]) {
                savedFilesData.push(result2.urls[0]);
              }
            }
          }
          savePrompt(
            params.prompt.trim(),
            savedFilesData,
            chatId,
            currentModel
          );
        } else {
          params.onClearForm();
        }
        submitInProgressRef.current = false;
        setIsSubmitting(false);
      } catch (error) {
        console.error("[ChatInput] \u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438:", error);
        const isAuthError = error && typeof error === "object" && "status" in error && error.status === 401 || error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object" && "error" in error.data && typeof error.data.error === "string" && (error.data.error.includes("No token provided") || error.data.error.includes("token") || error.data.error.includes("\u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446"));
        if (isAuthError) {
          handleSessionTimeout();
          submitInProgressRef.current = false;
          setIsSubmitting(false);
          return;
        }
        if (isAbortLikeError(error)) {
          const abortMessage = "\u0417\u0430\u043F\u0440\u043E\u0441 \u0431\u044B\u043B \u043E\u0442\u043C\u0435\u043D\u0435\u043D (aborted). \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0443.";
          if (onSendError) {
            onSendError(abortMessage);
          }
          submitInProgressRef.current = false;
          setIsSubmitting(false);
          return;
        }
        const errorMessage = error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object" && "error" in error.data && typeof error.data.error === "string" ? error.data.error : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437.";
        if (onSendError) {
          onSendError(errorMessage);
        }
        alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438: ${errorMessage}`);
        submitInProgressRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      chatId,
      currentModel,
      generateMedia,
      generateMediaTest,
      isTestMode,
      onRequestCreated,
      onPendingMessage,
      onSendError,
      getFileAsBase64,
      uploadToImgbb,
      appMode
    ]
  );
  return {
    handleSubmit,
    isSubmitting,
    submitInProgressRef
  };
}
const EMPTY_MODEL_SETTINGS_CONFIG = {};
const FORMAT_OPTIONS_1_1_16_9_9_16 = [
  { value: "1:1", label: "1:1 (\u041A\u0432\u0430\u0434\u0440\u0430\u0442)" },
  { value: "16:9", label: "16:9 (\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0439)" },
  { value: "9:16", label: "9:16 (\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439)" }
];
const FORMAT_OPTIONS_16_9_9_16 = [
  { value: "16:9", label: "16:9 (\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0439)" },
  { value: "9:16", label: "9:16 (\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439)" }
];
const FORMAT_OPTIONS_SEEDREAM = [
  { value: "1:1", label: "1:1 (\u041A\u0432\u0430\u0434\u0440\u0430\u0442)" },
  { value: "4:3", label: "4:3 (\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0439)" },
  { value: "3:4", label: "3:4 (\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439)" },
  { value: "4:5", label: "4:5 (\u041F\u043E\u0440\u0442\u0440\u0435\u0442)" },
  { value: "16:9", label: "16:9 (\u0428\u0438\u0440\u043E\u043A\u0438\u0439)" },
  { value: "9:16", label: "9:16 (\u0412\u044B\u0441\u043E\u043A\u0438\u0439)" },
  { value: "2:3", label: "2:3 (\u041F\u043E\u0440\u0442\u0440\u0435\u0442)" },
  { value: "3:2", label: "3:2 (\u041B\u0430\u043D\u0434\u0448\u0430\u0444\u0442)" },
  { value: "21:9", label: "21:9 (\u0423\u043B\u044C\u0442\u0440\u0430\u0448\u0438\u0440\u043E\u043A\u0438\u0439)" }
];
const QUALITY_OPTIONS_1K_2K_4K = [
  { value: "1k", label: "1K" },
  { value: "2k", label: "2K" },
  { value: "4k", label: "4K" }
];
const QUALITY_OPTIONS_2K_4K = [
  { value: "2k", label: "2K" },
  { value: "4k", label: "4K" }
];
const QUALITY_OPTIONS_SEEDREAM = [
  { value: "2k", label: "Basic (2K)" },
  { value: "4k", label: "High (4K)" }
];
const DURATION_OPTIONS = [
  { value: "5", label: "5 \u0441\u0435\u043A" },
  { value: "10", label: "10 \u0441\u0435\u043A" }
];
const DURATION_OPTIONS_GROK_IMAGINE = [
  { value: "6", label: "6 \u0441\u0435\u043A" },
  { value: "10", label: "10 \u0441\u0435\u043A" }
];
const DURATION_OPTIONS_WAVESPEED = [
  { value: "3", label: "3 \u0441\u0435\u043A" },
  { value: "4", label: "4 \u0441\u0435\u043A" },
  { value: "5", label: "5 \u0441\u0435\u043A" },
  { value: "6", label: "6 \u0441\u0435\u043A" },
  { value: "7", label: "7 \u0441\u0435\u043A" },
  { value: "8", label: "8 \u0441\u0435\u043A" },
  { value: "9", label: "9 \u0441\u0435\u043A" },
  { value: "10", label: "10 \u0441\u0435\u043A" }
];
const DURATION_OPTIONS_WAN_2_2 = [
  { value: "5", label: "5 \u0441\u0435\u043A" },
  { value: "8", label: "8 \u0441\u0435\u043A" }
];
const DURATION_OPTIONS_SEEDANCE = [
  { value: "4", label: "4 \u0441\u0435\u043A" },
  { value: "8", label: "8 \u0441\u0435\u043A" },
  { value: "12", label: "12 \u0441\u0435\u043A" }
];
const SOUND_OPTIONS = [
  { value: "true", label: "\u0437\u0432\u0443\u043A on" },
  { value: "false", label: "\u0437\u0432\u0443\u043A off" }
];
const GENERATION_TYPE_OPTIONS = [
  { value: "TEXT_2_VIDEO", label: "\u0422\u0435\u043A\u0441\u0442 \u2192 \u0412\u0438\u0434\u0435\u043E" },
  { value: "FIRST_AND_LAST_FRAMES_2_VIDEO", label: "\u041A\u0430\u0434\u0440\u044B \u2192 \u0412\u0438\u0434\u0435\u043E" },
  { value: "REFERENCE_2_VIDEO", label: "\u0420\u0435\u0444\u0435\u0440\u0435\u043D\u0441 \u2192 \u0412\u0438\u0434\u0435\u043E" },
  { value: "EXTEND_VIDEO", label: "\u041F\u0440\u043E\u0434\u043B\u0435\u043D\u0438\u0435 \u0432\u0438\u0434\u0435\u043E" }
];
const MODEL_SETTINGS_CONFIG = {
  NANO_BANANA_PRO_LAOZHANG: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    quality: {
      options: QUALITY_OPTIONS_2K_4K,
      defaultValue: "2k"
    }
  },
  NANO_BANANA_PRO_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_1_1_16_9_9_16,
      defaultValue: "9:16"
    },
    quality: {
      options: QUALITY_OPTIONS_1K_2K_4K,
      defaultValue: "2k"
    }
  },
  NANO_BANANA_2_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_1_1_16_9_9_16,
      defaultValue: "9:16"
    },
    quality: {
      options: QUALITY_OPTIONS_1K_2K_4K,
      defaultValue: "2k"
    }
  },
  FLUX_2_MAX_EDIT_WAVESPEED: {
    format: {
      options: FORMAT_OPTIONS_1_1_16_9_9_16,
      defaultValue: "1:1"
    }
  },
  GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI: {},
  GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI: {
    duration: {
      options: DURATION_OPTIONS_GROK_IMAGINE,
      defaultValue: 6
    }
  },
  IMAGEN4_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_1_1_16_9_9_16,
      defaultValue: "9:16"
    }
  },
  IMAGEN4_ULTRA_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_1_1_16_9_9_16,
      defaultValue: "9:16"
    }
  },
  VEO_3_1_FAST_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    generationType: {
      options: GENERATION_TYPE_OPTIONS,
      defaultValue: "TEXT_2_VIDEO"
    }
  },
  KLING_2_6_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    duration: {
      options: DURATION_OPTIONS,
      defaultValue: 5
    },
    sound: {
      options: SOUND_OPTIONS,
      defaultValue: false
    }
  },
  SEEDREAM_4_5_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_SEEDREAM,
      defaultValue: "9:16"
    },
    quality: {
      options: QUALITY_OPTIONS_SEEDREAM,
      defaultValue: "4k"
      // по цене одинаково с 2к
    }
  },
  SEEDREAM_4_5_EDIT_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_SEEDREAM,
      defaultValue: "9:16"
    },
    quality: {
      options: QUALITY_OPTIONS_SEEDREAM,
      defaultValue: "4k"
      // по цене одинаково с 2к
    }
  },
  SEEDREAM_5_0_LITE_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_SEEDREAM,
      defaultValue: "9:16"
    },
    quality: {
      options: QUALITY_OPTIONS_SEEDREAM,
      defaultValue: "4k"
      // basic = 2K, high = 4K
    }
  },
  SEEDREAM_5_0_LITE_EDIT_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_SEEDREAM,
      defaultValue: "9:16"
    },
    quality: {
      options: QUALITY_OPTIONS_SEEDREAM,
      defaultValue: "4k"
      // basic = 2K, high = 4K
    }
  },
  KLING_3_0_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    duration: {
      options: [
        { value: "3", label: "3 \u0441\u0435\u043A" },
        { value: "5", label: "5 \u0441\u0435\u043A" },
        { value: "10", label: "10 \u0441\u0435\u043A" },
        { value: "15", label: "15 \u0441\u0435\u043A" }
      ],
      defaultValue: 5
    },
    // mode (std/pro) для Kling 3.0
    mode: {
      options: [
        { value: "std", label: "Standard" },
        { value: "pro", label: "Pro" }
      ],
      defaultValue: "std"
    },
    // multi_shots для Kling 3.0
    multiShots: {
      options: [
        { value: true, label: "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E" },
        { value: false, label: "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E" }
      ],
      defaultValue: false
    },
    // sound для Kling 3.0
    sound: {
      options: SOUND_OPTIONS,
      defaultValue: true
    }
  },
  MIDJOURNEY: {},
  ELEVENLABS_MULTILINGUAL_V2_KIEAI: {},
  // Настройки через отдельные поля в UI
  KLING_VIDEO_O1_WAVESPEED: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    duration: {
      options: DURATION_OPTIONS_WAVESPEED,
      defaultValue: 5
    }
  },
  Z_IMAGE_TURBO_LORA_WAVESPEED: {
    format: {
      options: FORMAT_OPTIONS_SEEDREAM,
      defaultValue: "1:1"
    }
  },
  Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED: {
    format: {
      options: FORMAT_OPTIONS_SEEDREAM,
      defaultValue: "1:1"
    }
  },
  Z_IMAGE_LORA_TRAINER_WAVESPEED: {},
  QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED: {
    format: {
      options: FORMAT_OPTIONS_SEEDREAM,
      defaultValue: "1:1"
    }
  },
  SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED: {
    format: {
      options: FORMAT_OPTIONS_SEEDREAM,
      defaultValue: "1:1"
    }
  },
  WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    duration: {
      options: DURATION_OPTIONS_WAN_2_2,
      defaultValue: 5
    }
  },
  WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    duration: {
      options: DURATION_OPTIONS_WAN_2_2,
      defaultValue: 5
    }
  },
  SEEDANCE_1_5_PRO_KIEAI: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    duration: {
      options: DURATION_OPTIONS_SEEDANCE,
      defaultValue: 4
    },
    // generate_audio (звук) для Seedance 1.5 Pro
    sound: {
      options: SOUND_OPTIONS,
      // По умолчанию без звука, как в большинстве видео-моделей
      defaultValue: false
    }
  },
  KLING_2_6_MOTION_CONTROL_KIEAI: {
    // character_orientation: image (макс 10с) или video (макс 30с)
    characterOrientation: {
      options: [
        { value: "image", label: "\u041A\u0430\u043A \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 (\u043C\u0430\u043A\u0441 10\u0441)" },
        { value: "video", label: "\u041A\u0430\u043A \u043D\u0430 \u0432\u0438\u0434\u0435\u043E (\u043C\u0430\u043A\u0441 30\u0441)" }
      ],
      defaultValue: "image"
    },
    // mode: 720p (std) или 1080p (pro)
    mode: {
      options: [
        { value: "std", label: "720p" },
        { value: "pro", label: "1080p" }
      ],
      defaultValue: "std"
    }
  }
};
function getModelSettingsConfig(model) {
  return MODEL_SETTINGS_CONFIG[model] || EMPTY_MODEL_SETTINGS_CONFIG;
}
function FormatSelect({
  value,
  config: config2,
  onValueChange,
  disabled,
  className = "w-[120px]"
}) {
  const handleChange = (newValue) => {
    if (newValue === "default") {
      onValueChange(void 0);
    } else {
      const format = newValue;
      onValueChange(format);
    }
  };
  const displayValue = value || config2.defaultValue || (config2.allowDefault ? "default" : config2.defaultValue || "");
  const placeholder = config2.defaultValue || "\u0424\u043E\u0440\u043C\u0430\u0442";
  return /* @__PURE__ */ jsxDEV(
    Select,
    {
      value: displayValue || void 0,
      onValueChange: handleChange,
      disabled,
      children: [
        /* @__PURE__ */ jsxDEV(
          SelectTrigger,
          {
            className: `${className} border-border bg-secondary text-foreground rounded-xl`,
            children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder, children: value || placeholder }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
              lineNumber: 74,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 71,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          SelectContent,
          {
            side: "top",
            sideOffset: 8,
            position: "popper",
            collisionPadding: 20,
            avoidCollisions: true,
            className: "border-border bg-card data-[side=top]:animate-none!",
            children: config2.options.map((option) => /* @__PURE__ */ jsxDEV(
              SelectItem,
              {
                value: option.value,
                className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
                children: option.label
              },
              option.value,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
                lineNumber: 87,
                columnNumber: 21
              },
              this
            ))
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 78,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
      lineNumber: 66,
      columnNumber: 9
    },
    this
  );
}
function QualitySelect({
  value,
  config: config2,
  onValueChange,
  disabled,
  className = "w-[100px]"
}) {
  const handleChange = (newValue) => {
    if (newValue === "default") {
      onValueChange(void 0);
    } else {
      const quality = newValue;
      onValueChange(quality);
    }
  };
  const displayValue = value || config2.defaultValue || (config2.allowDefault ? "default" : config2.defaultValue || "");
  const placeholder = config2.defaultValue ? config2.defaultValue.toUpperCase() : "\u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E";
  return /* @__PURE__ */ jsxDEV(
    Select,
    {
      value: displayValue || void 0,
      onValueChange: handleChange,
      disabled,
      children: [
        /* @__PURE__ */ jsxDEV(
          SelectTrigger,
          {
            className: `${className} border-border bg-secondary text-foreground rounded-xl`,
            children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder, children: value ? value.toUpperCase() : placeholder }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
              lineNumber: 143,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 140,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          SelectContent,
          {
            side: "top",
            sideOffset: 8,
            position: "popper",
            collisionPadding: 20,
            avoidCollisions: true,
            className: "border-border bg-card data-[side=top]:animate-none!",
            children: config2.options.map((option) => /* @__PURE__ */ jsxDEV(
              SelectItem,
              {
                value: option.value,
                className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
                children: option.label
              },
              option.value,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
                lineNumber: 156,
                columnNumber: 21
              },
              this
            ))
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 147,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
      lineNumber: 135,
      columnNumber: 9
    },
    this
  );
}
function DurationSelect({
  value,
  config: config2,
  onValueChange,
  disabled,
  className = "w-[100px]"
}) {
  const handleChange = (newValue) => {
    const duration = parseInt(newValue);
    onValueChange(duration);
  };
  const displayValue = (value || config2.defaultValue).toString();
  return /* @__PURE__ */ jsxDEV(
    Select,
    {
      value: displayValue,
      onValueChange: handleChange,
      disabled,
      children: [
        /* @__PURE__ */ jsxDEV(
          SelectTrigger,
          {
            className: `${className} border-border bg-secondary text-foreground rounded-xl`,
            children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", children: [
              value || config2.defaultValue,
              " \u0441\u0435\u043A"
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
              lineNumber: 211,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 208,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          SelectContent,
          {
            side: "top",
            sideOffset: 8,
            position: "popper",
            collisionPadding: 20,
            avoidCollisions: true,
            className: "border-border bg-card data-[side=top]:animate-none!",
            children: config2.options.map((option) => /* @__PURE__ */ jsxDEV(
              SelectItem,
              {
                value: option.value,
                className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
                children: option.label
              },
              option.value,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
                lineNumber: 224,
                columnNumber: 21
              },
              this
            ))
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 215,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
      lineNumber: 203,
      columnNumber: 9
    },
    this
  );
}
function SoundSelect({
  value,
  config: config2,
  onValueChange,
  disabled,
  className = "w-[100px]"
}) {
  const handleChange = (newValue) => {
    const sound = newValue === "true";
    onValueChange(sound);
  };
  const displayValue = value === void 0 ? config2.defaultValue.toString() : value.toString();
  return /* @__PURE__ */ jsxDEV(
    Select,
    {
      value: displayValue,
      onValueChange: handleChange,
      disabled,
      children: [
        /* @__PURE__ */ jsxDEV(
          SelectTrigger,
          {
            className: `${className} border-border bg-secondary text-foreground rounded-xl`,
            children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: "\u0417\u0432\u0443\u043A", children: value === void 0 || value ? "\u0437\u0432\u0443\u043A on" : "\u0437\u0432\u0443\u043A off" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
              lineNumber: 271,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 268,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          SelectContent,
          {
            side: "top",
            sideOffset: 8,
            position: "popper",
            collisionPadding: 20,
            avoidCollisions: true,
            className: "border-border bg-card data-[side=top]:animate-none!",
            children: config2.options.map((option) => /* @__PURE__ */ jsxDEV(
              SelectItem,
              {
                value: option.value,
                className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
                children: option.label
              },
              option.value,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
                lineNumber: 284,
                columnNumber: 21
              },
              this
            ))
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 275,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
      lineNumber: 263,
      columnNumber: 9
    },
    this
  );
}
function GenerationTypeSelect({
  value,
  config: config2,
  onValueChange,
  disabled,
  className = "w-[160px]"
}) {
  const handleChange = (newValue) => {
    onValueChange(
      newValue
    );
  };
  const displayValue = value || config2.defaultValue;
  const selectedOption = config2.options.find((o) => o.value === displayValue);
  const placeholder = selectedOption ? selectedOption.label : "\u0420\u0435\u0436\u0438\u043C";
  return /* @__PURE__ */ jsxDEV(
    Select,
    {
      value: displayValue || void 0,
      onValueChange: handleChange,
      disabled,
      children: [
        /* @__PURE__ */ jsxDEV(
          SelectTrigger,
          {
            className: `${className} border-border bg-secondary text-foreground rounded-xl`,
            children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder, children: selectedOption?.label || placeholder }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
              lineNumber: 347,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 344,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          SelectContent,
          {
            side: "top",
            sideOffset: 8,
            position: "popper",
            collisionPadding: 20,
            avoidCollisions: true,
            className: "border-border bg-card focus:bg-accent focus:text-accent-foreground",
            children: config2.options.map((option) => /* @__PURE__ */ jsxDEV(
              SelectItem,
              {
                value: option.value,
                className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
                children: option.label
              },
              option.value,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
                lineNumber: 360,
                columnNumber: 21
              },
              this
            ))
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
            lineNumber: 351,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
      lineNumber: 339,
      columnNumber: 9
    },
    this
  );
}
function ModelSettingsPanel({
  model,
  format,
  quality,
  duration,
  sound,
  onFormatChange,
  onQualityChange,
  onDurationChange,
  onSoundChange,
  veoGenerationType,
  onVeoGenerationTypeChange,
  disabled
}) {
  const config2 = getModelSettingsConfig(model);
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    config2.format && /* @__PURE__ */ jsxDEV(
      FormatSelect,
      {
        value: format,
        config: config2.format,
        onValueChange: onFormatChange,
        disabled,
        className: config2.format.options.some((o) => o.value === "1:1") ? "w-[140px]" : "w-[120px]"
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
        lineNumber: 419,
        columnNumber: 17
      },
      this
    ),
    config2.quality && /* @__PURE__ */ jsxDEV(
      QualitySelect,
      {
        value: quality,
        config: config2.quality,
        onValueChange: onQualityChange,
        disabled
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
        lineNumber: 433,
        columnNumber: 17
      },
      this
    ),
    config2.duration && /* @__PURE__ */ jsxDEV(
      DurationSelect,
      {
        value: duration,
        config: config2.duration,
        onValueChange: onDurationChange,
        disabled
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
        lineNumber: 442,
        columnNumber: 17
      },
      this
    ),
    config2.sound && /* @__PURE__ */ jsxDEV(
      SoundSelect,
      {
        value: sound,
        config: config2.sound,
        onValueChange: onSoundChange,
        disabled
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
        lineNumber: 451,
        columnNumber: 17
      },
      this
    ),
    config2.generationType && onVeoGenerationTypeChange && /* @__PURE__ */ jsxDEV(
      GenerationTypeSelect,
      {
        value: veoGenerationType,
        config: config2.generationType,
        onValueChange: onVeoGenerationTypeChange,
        disabled
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
        lineNumber: 460,
        columnNumber: 17
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input/model-settings.tsx",
    lineNumber: 417,
    columnNumber: 9
  }, this);
}
function loadMediaSettings() {
  {
    return {};
  }
}
function saveMediaSettings(settings) {
  {
    return;
  }
}
const DEFAULT_SETTINGS = {
  format: void 0,
  quality: void 0,
  duration: void 0,
  veoGenerationType: void 0,
  sound: void 0,
  fixedLens: void 0,
  negativePrompt: "",
  seed: void 0,
  cfgScale: void 0,
  voice: "Rachel",
  stability: 0.7,
  similarityBoost: 0.75,
  speed: 1,
  languageCode: ""
};
function useModelSettings(currentModel) {
  const modelType = useModelType(currentModel);
  const config2 = getModelSettingsConfig(currentModel);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const isInitialMount = useRef(true);
  useEffect(() => {
    const storedSettings = loadMediaSettings();
    const newSettings = { ...DEFAULT_SETTINGS };
    if (storedSettings.format) {
      newSettings.format = storedSettings.format;
    } else if (modelType.isVeo && storedSettings.videoFormat) {
      newSettings.format = storedSettings.videoFormat;
    } else if ((modelType.isKling || modelType.isKling25) && storedSettings.klingAspectRatio) {
      newSettings.format = storedSettings.klingAspectRatio;
    } else if (config2.format?.defaultValue) {
      newSettings.format = config2.format.defaultValue;
    }
    if (storedSettings.quality) {
      newSettings.quality = storedSettings.quality;
    } else if (config2.quality?.defaultValue) {
      newSettings.quality = config2.quality.defaultValue;
    }
    if (modelType.isVeo && storedSettings.veoGenerationType) {
      newSettings.veoGenerationType = storedSettings.veoGenerationType;
    } else if (config2.generationType?.defaultValue) {
      newSettings.veoGenerationType = config2.generationType.defaultValue;
    }
    if (modelType.isKlingMotionControl) {
      newSettings.klingMotionCharacterOrientation = storedSettings.klingMotionCharacterOrientation ?? config2.characterOrientation?.defaultValue;
      newSettings.klingMotionVideoQuality = storedSettings.klingMotionVideoQuality ?? (config2.mode?.defaultValue === "pro" ? "1080p" : "720p");
    }
    if (config2.duration) {
      const candidate = storedSettings.klingDuration ?? config2.duration.defaultValue;
      const optionValues = config2.duration.options.map(
        (o) => Number(o.value)
      );
      const isValid = candidate !== void 0 && optionValues.includes(candidate);
      newSettings.duration = isValid ? candidate : config2.duration.defaultValue;
    }
    if (storedSettings.klingSound !== void 0) {
      newSettings.sound = storedSettings.klingSound;
    } else if (config2.sound?.defaultValue !== void 0) {
      newSettings.sound = config2.sound.defaultValue;
    }
    setSettings(newSettings);
    isInitialMount.current = true;
  }, [currentModel, modelType, config2]);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (modelType.isVeo) {
      saveMediaSettings({
        videoFormat: settings.format && settings.format !== "1:1" ? settings.format : void 0,
        veoGenerationType: settings.veoGenerationType
      });
    } else if (modelType.isKling || modelType.isKling25) {
      saveMediaSettings({
        klingAspectRatio: settings.format && settings.format !== "1:1" ? settings.format : void 0,
        klingDuration: settings.duration,
        klingSound: modelType.isKling ? settings.sound : void 0
      });
    } else if (modelType.isKlingMotionControl) {
      saveMediaSettings({
        klingMotionCharacterOrientation: settings.klingMotionCharacterOrientation,
        klingMotionVideoQuality: settings.klingMotionVideoQuality
      });
    } else {
      ({
        format: settings.format,
        quality: settings.quality
      });
      if (config2.duration && settings.duration !== void 0) {
        settings.duration;
      }
    }
  }, [settings, modelType]);
  const updateSettings = (updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };
  const setFormat = (format) => {
    updateSettings({ format });
  };
  const setQuality = (quality) => {
    updateSettings({ quality });
  };
  const setDuration = (duration) => {
    updateSettings({ duration });
  };
  const setSound = (sound) => {
    updateSettings({ sound });
  };
  const setFixedLens = (fixedLens) => {
    updateSettings({ fixedLens });
  };
  const setVeoGenerationType = (veoGenerationType) => {
    updateSettings({ veoGenerationType });
  };
  const setNegativePrompt = (negativePrompt) => {
    updateSettings({ negativePrompt });
  };
  const setSeed = (seed) => {
    updateSettings({ seed });
  };
  const setCfgScale = (cfgScale) => {
    updateSettings({ cfgScale });
  };
  const setVoice = (voice) => {
    updateSettings({ voice });
  };
  const setStability = (stability) => {
    updateSettings({ stability });
  };
  const setSimilarityBoost = (similarityBoost) => {
    updateSettings({ similarityBoost });
  };
  const setSpeed = (speed) => {
    updateSettings({ speed });
  };
  const setLanguageCode = (languageCode) => {
    updateSettings({ languageCode });
  };
  const setKlingMotionCharacterOrientation = (value) => {
    updateSettings({ klingMotionCharacterOrientation: value });
  };
  const setKlingMotionVideoQuality = (value) => {
    updateSettings({ klingMotionVideoQuality: value });
  };
  const resetModelSpecificSettings = () => {
    const updates = {};
    if (modelType.isVeo || modelType.isImagen4) {
      updates.seed = void 0;
    }
    if (modelType.isImagen4) {
      updates.negativePrompt = "";
    }
    if (modelType.isKling25) {
      updates.negativePrompt = "";
      updates.cfgScale = void 0;
    }
    if (Object.keys(updates).length > 0) {
      updateSettings(updates);
    }
  };
  return {
    settings,
    setFormat,
    setQuality,
    setDuration,
    setSound,
    setFixedLens,
    setVeoGenerationType,
    setNegativePrompt,
    setSeed,
    setCfgScale,
    setVoice,
    setStability,
    setSimilarityBoost,
    setSpeed,
    setLanguageCode,
    setKlingMotionCharacterOrientation,
    setKlingMotionVideoQuality,
    updateSettings,
    resetModelSpecificSettings
  };
}
const MAX_WAVESPEED_LORA_COUNT = 3;
const LORAS = [
  {
    value: "https://storage.yandexcloud.net/flexbot/wow_alina_g.safetensors?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJEkxXIGwURWe3QgSG9GHUp%2F20260405%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20260405T083954Z&X-Amz-Expires=2592000&X-Amz-Signature=8e1c0e5fd687f7c8e1156ba5a74d09b96f76ffa9e99e0b0e188d3c0dfecf3e22&X-Amz-SignedHeaders=host&response-content-disposition=attachment",
    label: "Alina Style v1.0",
    description: "\u0421\u0442\u0438\u043B\u044C Alina \u0434\u043B\u044F \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043E\u0432"
  },
  {
    value: "https://storage.yandexcloud.net/flexbot/Kodak%20Portra%20400%20zib%20v1.safetensors?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJEkxXIGwURWe3QgSG9GHUp%2F20260405%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20260405T083638Z&X-Amz-Expires=2592000&X-Amz-Signature=e05acaeb04577d413bb06e0a1cd5a1719bc7f91181f1f223205287026edcdc3f&X-Amz-SignedHeaders=host&response-content-disposition=attachment",
    label: "Kodak Portra 400 zib v1",
    description: "Kodak Portra 400 zib v1"
  },
  {
    value: "https://storage.yandexcloud.net/flexbot/lips-bj_low_noise.safetensors?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJEkxXIGwURWe3QgSG9GHUp%2F20260405%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20260405T084718Z&X-Amz-Expires=2592000&X-Amz-Signature=70d4f7a69bc87c994090aec11d1cd7a375572ea1a2ef71ee9147dbf0beb3811a&X-Amz-SignedHeaders=host&response-content-disposition=attachment",
    label: "Lips BJ low noise",
    description: "Lips BJ low noise"
  },
  {
    value: "https://civitai.com/api/download/models/67890",
    label: "Realistic Skin v2",
    description: "\u0420\u0435\u0430\u043B\u0438\u0441\u0442\u0438\u0447\u043D\u0430\u044F \u043A\u043E\u0436\u0430 \u0438 \u0442\u0435\u043A\u0441\u0442\u0443\u0440\u044B"
  }
];
const LORA_SELECT_NONE = "__lora_none__";
function normalizeLoraSlotsAfterClear(sliced) {
  if (sliced.length === 0) return [{ path: "", scale: 1 }];
  const last = sliced[sliced.length - 1];
  if (last.path !== "") return [...sliced, { path: "", scale: 1 }];
  return sliced;
}
function buildLoraSlotRowsFromSaved(saved) {
  const rows = saved.filter(
    (l) => typeof l.path === "string" && String(l.path).trim().length > 0
  ).slice(0, MAX_WAVESPEED_LORA_COUNT).map((l) => ({
    path: String(l.path).trim(),
    scale: typeof l.scale === "number" ? l.scale : 1
  }));
  if (rows.length === 0) return [{ path: "", scale: 1 }];
  if (rows.length < MAX_WAVESPEED_LORA_COUNT)
    return [...rows, { path: "", scale: 1 }];
  return rows;
}
const ELEVENLABS_VOICES = [
  "Roger",
  "Sarah",
  "Charlie",
  "George",
  "Callum",
  "River",
  "Liam",
  "Alice",
  "Matilda",
  "Will",
  "Jessica",
  "Eric",
  "Chris",
  "Brian",
  "Daniel",
  "Lily",
  "Bill"
];
const ChatInput = forwardRef(
  function ChatInput2({
    chatId,
    currentModel,
    onModelChange,
    onRequestCreated,
    onPendingMessage,
    onSendError,
    disabled,
    scrollToBottom,
    showScrollButton,
    appMode = APP_MODES.DEFAULT
  }, ref) {
    const [prompt, setPrompt] = useState("");
    const [enhancedPrompt, setEnhancedPrompt] = useState("");
    const [triggerWord, setTriggerWord] = useState("");
    const [loraSlotRows, setLoraSlotRows] = useState([
      { path: "", scale: 1 }
    ]);
    const [isLockEnabled, setIsLockEnabled] = useState(false);
    const {
      settings,
      setKlingMotionCharacterOrientation,
      setKlingMotionVideoQuality,
      setFormat,
      setQuality,
      setDuration,
      setSound,
      setFixedLens,
      setVeoGenerationType,
      setNegativePrompt,
      setSeed,
      setCfgScale,
      setVoice,
      setStability,
      setSimilarityBoost,
      setSpeed,
      setLanguageCode,
      resetModelSpecificSettings
    } = useModelSettings(currentModel);
    const [needsScrollbar, setNeedsScrollbar] = useState(false);
    const [attachingFile, setAttachingFile] = useState(false);
    const { isTestMode } = useTestMode();
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const enhancedTextareaRef = useRef(null);
    const compactMainPromptRef = useRef(false);
    const enhancedExpandedRef = useRef(false);
    const [enhancedPromptFocused, setEnhancedPromptFocused] = useState(false);
    const [needsScrollbarEnhanced, setNeedsScrollbarEnhanced] = useState(false);
    const [generateMedia] = useGenerateMediaMutation();
    const [generateMediaTest] = useGenerateMediaTestMutation();
    const [promptEnhance, { isLoading: isEnhancingPrompt }] = usePromptEnhanceMutation();
    const isDisabled = disabled ?? false;
    const modelType = useModelType(currentModel);
    const isAiModelMode = appMode === APP_MODES.AI_MODEL;
    const isEnhancedPromptExpanded = enhancedPrompt.trim().length > 0 || enhancedPromptFocused;
    compactMainPromptRef.current = isAiModelMode && isEnhancedPromptExpanded;
    enhancedExpandedRef.current = isEnhancedPromptExpanded;
    const {
      format,
      quality,
      duration,
      sound,
      veoGenerationType,
      negativePrompt,
      seed,
      cfgScale,
      voice,
      stability,
      similarityBoost,
      speed,
      languageCode,
      fixedLens
    } = settings;
    const {
      attachedFiles,
      isDragging,
      handleFileSelect: handleFileSelectHook,
      addFileFromUrl,
      removeFile,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handlePaste,
      cleanup,
      clearFiles,
      getFileAsBase64
    } = useChatInputFiles(
      chatId,
      appMode,
      currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED"
    );
    const loadingEffectForAttachFile = useMemo(
      () => createLoadingEffectForAttachFile(setAttachingFile),
      []
    );
    const { handleSubmit, isSubmitting, submitInProgressRef } = useChatInputSubmit({
      chatId,
      currentModel,
      generateMedia,
      generateMediaTest,
      isTestMode,
      onRequestCreated,
      onPendingMessage,
      onSendError,
      getFileAsBase64,
      appMode
    });
    const { data: models } = useGetModelsQuery({ appMode });
    const currentModelConfig = useMemo(
      () => models?.find((m) => m.key === currentModel),
      [models, currentModel]
    );
    const MAX_PROMPT_LENGTH = currentModelConfig?.promptLimit ?? 5e3;
    const measureTextareaOneLineCap = (el) => {
      const lineStyle = getComputedStyle(el);
      const lineHeight = parseFloat(lineStyle.lineHeight) || 22;
      const paddingTop = parseFloat(lineStyle.paddingTop) || 8;
      const paddingBottom = parseFloat(lineStyle.paddingBottom) || 8;
      return Math.ceil(lineHeight + paddingTop + paddingBottom);
    };
    const adjustTextareaHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      if (compactMainPromptRef.current) {
        const oneLineCap = measureTextareaOneLineCap(textarea);
        const newHeight2 = Math.min(scrollHeight, oneLineCap);
        textarea.style.height = `${newHeight2}px`;
        setNeedsScrollbar(scrollHeight > newHeight2 + 1);
        return;
      }
      const maxHeight = window.innerHeight * 0.2;
      const newHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      const needsScroll = scrollHeight > newHeight + 1;
      setNeedsScrollbar(needsScroll);
    }, []);
    const adjustEnhancedTextareaHeight = useCallback(() => {
      const el = enhancedTextareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      const scrollHeight = el.scrollHeight;
      if (!enhancedExpandedRef.current) {
        const oneLineCap = measureTextareaOneLineCap(el);
        const newHeight2 = Math.min(scrollHeight, oneLineCap);
        el.style.height = `${newHeight2}px`;
        setNeedsScrollbarEnhanced(scrollHeight > newHeight2 + 1);
        return;
      }
      const maxHeight = window.innerHeight * 0.2;
      const newHeight = Math.min(scrollHeight, maxHeight);
      el.style.height = `${newHeight}px`;
      setNeedsScrollbarEnhanced(scrollHeight > newHeight + 1);
    }, []);
    const handleTextareaChange = useCallback(
      (e) => {
        const value = e.target.value;
        setPrompt(value.slice(0, MAX_PROMPT_LENGTH));
        requestAnimationFrame(() => {
          adjustTextareaHeight();
        });
      },
      [adjustTextareaHeight]
    );
    useEffect(() => {
      requestAnimationFrame(() => {
        adjustTextareaHeight();
      });
    }, [prompt, adjustTextareaHeight, isEnhancedPromptExpanded]);
    useEffect(() => {
      requestAnimationFrame(() => {
        adjustEnhancedTextareaHeight();
      });
    }, [
      enhancedPrompt,
      adjustEnhancedTextareaHeight,
      isEnhancedPromptExpanded
    ]);
    useEffect(() => {
      const handleResize = () => {
        adjustTextareaHeight();
        adjustEnhancedTextareaHeight();
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [adjustTextareaHeight, adjustEnhancedTextareaHeight]);
    useImperativeHandle(ref, () => ({
      setPrompt: (newPrompt) => {
        setPrompt(newPrompt);
        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(
              newPrompt.length,
              newPrompt.length
            );
          }
        }, 0);
      },
      addFileFromUrl,
      setRequestData: async (request) => {
        setPrompt(request.prompt);
        const settings2 = request.settings || {};
        if (settings2.format) setFormat(settings2.format);
        if (settings2.quality)
          setQuality(settings2.quality);
        if (settings2.duration)
          setDuration(settings2.duration);
        if (settings2.veoGenerationType)
          setVeoGenerationType(
            settings2.veoGenerationType
          );
        if (settings2.sound !== void 0)
          setSound(settings2.sound);
        if (settings2.negativePrompt)
          setNegativePrompt(settings2.negativePrompt);
        if (settings2.enhancedPrompt)
          setEnhancedPrompt(settings2.enhancedPrompt);
        if (settings2.triggerWord)
          setTriggerWord(settings2.triggerWord);
        else setTriggerWord("");
        if (settings2.seed || request.seed)
          setSeed(settings2.seed || request.seed);
        if (settings2.cfgScale) setCfgScale(settings2.cfgScale);
        if (Array.isArray(settings2.loras)) {
          setLoraSlotRows(
            buildLoraSlotRowsFromSaved(
              settings2.loras
            )
          );
        } else {
          setLoraSlotRows([{ path: "", scale: 1 }]);
        }
        if (settings2.voice) setVoice(settings2.voice);
        if (settings2.stability !== void 0)
          setStability(settings2.stability);
        if (settings2.similarityBoost !== void 0)
          setSimilarityBoost(settings2.similarityBoost);
        if (settings2.speed !== void 0)
          setSpeed(settings2.speed);
        if (settings2.languageCode)
          setLanguageCode(settings2.languageCode);
        clearFiles();
        if (request.inputFiles && request.inputFiles.length > 0) {
          const { getMediaFileUrl: getMediaFileUrl2 } = await Promise.resolve().then(() => constants);
          for (const filePath of request.inputFiles) {
            try {
              const url = filePath.startsWith("http") ? filePath : getMediaFileUrl2(filePath);
              const filename = filePath.split("/").pop() || "file";
              const imgbbUrl = filePath.startsWith("http") ? filePath : void 0;
              await addFileFromUrl(url, filename, imgbbUrl);
            } catch (error) {
              console.error(
                "[ChatInput] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430 \u0438\u0437 \u0437\u0430\u043F\u0440\u043E\u0441\u0430:",
                error
              );
              const errorMessage = error instanceof Error ? error.message : "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430";
              alert(
                `\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430 "${filePath}": ${errorMessage}`
              );
            }
          }
        }
        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(
              request.prompt.length,
              request.prompt.length
            );
          }
        }, 100);
      }
    }));
    useEffect(() => {
      const lockState = loadLockButtonState();
      setIsLockEnabled(lockState);
    }, []);
    useEffect(() => {
      return () => {
        cleanup();
      };
    }, [cleanup]);
    const handleFileSelect = useCallback(
      (event) => {
        handleFileSelectHook(event);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      [handleFileSelectHook]
    );
    const onSubmit = useCallback(
      (event) => {
        if (isDisabled) {
          console.warn(
            "[ChatInput] \u26A0\uFE0F \u041F\u043E\u043F\u044B\u0442\u043A\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0439 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 (\u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D), \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u0435\u043C"
          );
          return;
        }
        const videoFormat = modelType.isVeo && format && format !== "1:1" ? format : void 0;
        const klingAspectRatio = (modelType.isKling || modelType.isKling25) && format && format !== "1:1" ? format : void 0;
        const params = {
          prompt,
          enhancedPrompt: isAiModelMode && enhancedPrompt.trim() ? enhancedPrompt.trim() : void 0,
          attachedFiles,
          format,
          quality,
          videoFormat,
          veoGenerationType,
          klingAspectRatio,
          klingDuration: modelType.supportsDuration && duration !== void 0 ? duration : void 0,
          klingSound: sound,
          negativePrompt,
          seed,
          cfgScale,
          modelType,
          voice,
          stability,
          similarityBoost,
          speed,
          languageCode,
          isLockEnabled,
          onClearForm: () => {
            setPrompt("");
            setEnhancedPrompt("");
            setTriggerWord("");
            resetModelSpecificSettings();
            setLoraSlotRows([{ path: "", scale: 1 }]);
            clearFiles();
          },
          fixedLens: void 0,
          klingMotionCharacterOrientation: settings.klingMotionCharacterOrientation,
          klingMotionVideoQuality: settings.klingMotionVideoQuality,
          loras: loraSlotRows.filter((row) => row.path.trim().length > 0).slice(0, MAX_WAVESPEED_LORA_COUNT).map((row) => ({
            path: row.path.trim(),
            scale: row.scale
          })),
          triggerWord: currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED" ? triggerWord : void 0,
          appMode
        };
        handleSubmit(event, {
          ...params,
          // fixedLens используется только для Seedance 1.5 Pro
          fixedLens: currentModel === "SEEDANCE_1_5_PRO_KIEAI" ? fixedLens : void 0
        });
      },
      [
        isDisabled,
        handleSubmit,
        prompt,
        enhancedPrompt,
        appMode,
        isAiModelMode,
        attachedFiles,
        format,
        quality,
        duration,
        sound,
        negativePrompt,
        seed,
        cfgScale,
        modelType,
        voice,
        stability,
        similarityBoost,
        speed,
        languageCode,
        isLockEnabled,
        veoGenerationType,
        loraSlotRows,
        clearFiles,
        triggerWord
      ]
    );
    const isLoraEnabledWavespeedModel = currentModel === "Z_IMAGE_TURBO_LORA_WAVESPEED" || currentModel === "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED" || currentModel === "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED";
    const handleEnhancePrompt = useCallback(async () => {
      if (!isAiModelMode || !prompt.trim()) return;
      try {
        const attachments = attachedFiles.map((file) => file.imgbbUrl || file.preview).filter((value) => Boolean(value));
        const result = await promptEnhance({
          appMode: APP_MODES.AI_MODEL,
          prompt: prompt.trim(),
          attachments
        }).unwrap();
        setEnhancedPrompt(result.enhancedPrompt);
        setNegativePrompt(result.negativePrompt);
      } catch (error) {
        const errorMessage = error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object" && "error" in error.data && typeof error.data.error === "string" ? error.data.error : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u043F\u0440\u043E\u043C\u043F\u0442";
        alert(errorMessage);
      }
    }, [
      isAiModelMode,
      prompt,
      attachedFiles,
      promptEnhance,
      setNegativePrompt
    ]);
    const handleLoraSlotPathChange = useCallback(
      (index, path) => {
        setLoraSlotRows((prev) => {
          if (path === "")
            return normalizeLoraSlotsAfterClear(
              prev.slice(0, index)
            );
          const next = [...prev];
          next[index] = {
            path,
            scale: next[index]?.scale ?? 1
          };
          const last = next[next.length - 1];
          const filled = next.filter((r) => r.path).length;
          if (last.path !== "" && filled < MAX_WAVESPEED_LORA_COUNT)
            next.push({ path: "", scale: 1 });
          return next;
        });
      },
      []
    );
    const handleLoraScaleChange = useCallback(
      (index, scale) => {
        setLoraSlotRows(
          (prev) => prev.map(
            (row, i) => i === index && row.path ? { ...row, scale: scale ?? 1 } : row
          )
        );
      },
      []
    );
    useEffect(() => {
      if (!isLoraEnabledWavespeedModel)
        setLoraSlotRows([{ path: "", scale: 1 }]);
    }, [isLoraEnabledWavespeedModel]);
    const handleKeyDown = useCallback(
      (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          if (submitInProgressRef.current || isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onSubmit(event);
        }
      },
      [submitInProgressRef, isDisabled, onSubmit]
    );
    function toggleLock() {
      const newState = !isLockEnabled;
      setIsLockEnabled(newState);
    }
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        id: "chat-input",
        className: cn(
          "absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-950/60 backdrop-blur-xl rounded-3xl border border-white/10 p-4 z-20",
          isAiModelMode ? "shadow-2xl shadow-emerald-900/30" : "shadow-2xl shadow-cyan-900/20"
        ),
        children: [
          attachedFiles.length > 0 ? /* @__PURE__ */ jsxDEV("div", { className: "mb-3 flex flex-wrap gap-2 items-center", children: [
            attachedFiles.map((file) => {
              const isVideo = file.file.type.startsWith("video/");
              const isZipArchive = file.file.type === "application/zip" || file.file.name.toLowerCase().endsWith(".zip");
              return /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "group relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-secondary shadow-sm",
                  children: [
                    isZipArchive ? /* @__PURE__ */ jsxDEV("div", { className: "flex h-full w-full items-center justify-center px-1 text-[10px] font-medium text-slate-300 text-center leading-tight", children: "ZIP" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 786,
                      columnNumber: 41
                    }, this) : isVideo ? /* @__PURE__ */ jsxDEV(
                      "video",
                      {
                        src: file.preview,
                        className: "h-full w-full object-cover"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                        lineNumber: 790,
                        columnNumber: 41
                      },
                      this
                    ) : /* @__PURE__ */ jsxDEV(
                      "img",
                      {
                        src: file.preview,
                        alt: "Attachment",
                        className: "h-full w-full object-cover"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                        lineNumber: 796,
                        columnNumber: 41
                      },
                      this
                    ),
                    /* @__PURE__ */ jsxDEV(
                      "button",
                      {
                        onClick: () => removeFile(file.id),
                        className: "absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground",
                        children: /* @__PURE__ */ jsxDEV(X, { className: "h-3 w-3" }, void 0, false, {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                          lineNumber: 806,
                          columnNumber: 41
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                        lineNumber: 802,
                        columnNumber: 37
                      },
                      this
                    )
                  ]
                },
                file.id,
                true,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                  lineNumber: 781,
                  columnNumber: 33
                },
                this
              );
            }),
            attachingFile && /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 ml-2 animate-spin" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 812,
              columnNumber: 29
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 774,
            columnNumber: 21
          }, this) : attachingFile && /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 mb-4 mx-4 animate-spin" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 817,
            columnNumber: 25
          }, this),
          modelType.isKling25 && /* @__PURE__ */ jsxDEV("p", { className: "mb-2 text-xs text-muted-foreground", children: "\u0414\u043B\u044F image-to-video: \u043F\u0435\u0440\u0432\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u2014 \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u0430\u0434\u0440, \u0432\u0442\u043E\u0440\u043E\u0435 \u2014 \u0444\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u0430\u0434\u0440 (tail)" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 823,
            columnNumber: 21
          }, this),
          isLoraEnabledWavespeedModel && /* @__PURE__ */ jsxDEV("div", { className: "mb-2 space-y-2", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "mb-3 text-xs text-muted-foreground", children: [
              "LoRA (\u0434\u043E ",
              MAX_WAVESPEED_LORA_COUNT,
              "): \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430; \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0440\u044F\u0434 \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0432\u044B\u0431\u043E\u0440\u0430"
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 832,
              columnNumber: 25
            }, this),
            loraSlotRows.map((row, index) => {
              const takenElsewhere = new Set(
                loraSlotRows.filter((_, i) => i !== index).map((r) => r.path).filter(Boolean)
              );
              const options = LORAS.filter(
                (o) => !takenElsewhere.has(o.value) || o.value === row.path
              );
              const selectedMeta = row.path ? LORAS.find((o) => o.value === row.path) : void 0;
              return /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "flex flex-col gap-0",
                  children: [
                    row.path && selectedMeta ? /* @__PURE__ */ jsxDEV("div", { className: "space-y-0.5 pl-0.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 857,
                      columnNumber: 41
                    }, this) : null,
                    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-row items-center gap-2", children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxDEV(
                        Select,
                        {
                          value: row.path ? row.path : LORA_SELECT_NONE,
                          onValueChange: (v) => handleLoraSlotPathChange(
                            index,
                            v === LORA_SELECT_NONE ? "" : v
                          ),
                          disabled: isDisabled,
                          children: [
                            /* @__PURE__ */ jsxDEV(SelectTrigger, { className: "w-full border-border bg-secondary text-foreground rounded-xl h-9 text-xs", children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C LoRA" }, void 0, false, {
                              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                              lineNumber: 887,
                              columnNumber: 53
                            }, this) }, void 0, false, {
                              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                              lineNumber: 886,
                              columnNumber: 49
                            }, this),
                            /* @__PURE__ */ jsxDEV(SelectContent, { children: [
                              /* @__PURE__ */ jsxDEV(
                                SelectItem,
                                {
                                  value: LORA_SELECT_NONE,
                                  className: "text-xs",
                                  children: "\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E"
                                },
                                void 0,
                                false,
                                {
                                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                                  lineNumber: 890,
                                  columnNumber: 53
                                },
                                this
                              ),
                              options.map((o) => /* @__PURE__ */ jsxDEV(
                                SelectItem,
                                {
                                  value: o.value,
                                  className: "text-xs",
                                  children: o.label
                                },
                                o.value,
                                false,
                                {
                                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                                  lineNumber: 897,
                                  columnNumber: 57
                                },
                                this
                              ))
                            ] }, void 0, true, {
                              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                              lineNumber: 889,
                              columnNumber: 49
                            }, this)
                          ]
                        },
                        void 0,
                        true,
                        {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                          lineNumber: 870,
                          columnNumber: 45
                        },
                        this
                      ) }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                        lineNumber: 869,
                        columnNumber: 41
                      }, this),
                      row.path ? /* @__PURE__ */ jsxDEV(
                        NumberInput,
                        {
                          "aria-label": "\u0421\u0438\u043B\u0430 LoRA",
                          placeholder: "\u0421\u0438\u043B\u0430",
                          value: row.scale,
                          onValueChange: (value) => handleLoraScaleChange(
                            index,
                            value
                          ),
                          disabled: isDisabled,
                          className: "w-24 shrink-0 border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl h-9 text-xs",
                          min: 0,
                          max: 2,
                          step: 0.1
                        },
                        void 0,
                        false,
                        {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                          lineNumber: 909,
                          columnNumber: 45
                        },
                        this
                      ) : null
                    ] }, void 0, true, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 868,
                      columnNumber: 37
                    }, this)
                  ]
                },
                `lora-slot-${index}`,
                true,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                  lineNumber: 852,
                  columnNumber: 33
                },
                this
              );
            })
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 831,
            columnNumber: 21
          }, this),
          currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED" && /* @__PURE__ */ jsxDEV("div", { className: "mb-2", children: [
            /* @__PURE__ */ jsxDEV(
              Input,
              {
                type: "text",
                placeholder: "Trigger word \u0434\u043B\u044F LoRA (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 alina_style)",
                value: triggerWord,
                onChange: (e) => setTriggerWord(e.target.value),
                disabled: isDisabled,
                className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 935,
                columnNumber: 25
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("p", { className: "mt-1 text-xs text-muted-foreground", children: "ZIP \u0434\u043B\u044F \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438: \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 50MB" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 943,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 934,
            columnNumber: 21
          }, this),
          isAiModelMode && /* @__PURE__ */ jsxDEV("div", { className: "mb-2", children: /* @__PURE__ */ jsxDEV(
            Textarea,
            {
              ref: enhancedTextareaRef,
              value: enhancedPrompt,
              onChange: (e) => {
                setEnhancedPrompt(
                  e.target.value.slice(0, MAX_PROMPT_LENGTH)
                );
                requestAnimationFrame(
                  () => adjustEnhancedTextareaHeight()
                );
              },
              onFocus: () => setEnhancedPromptFocused(true),
              onBlur: () => setEnhancedPromptFocused(false),
              disabled: isDisabled,
              placeholder: "\u0423\u043B\u0443\u0447\u0448\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043F\u0442",
              maxLength: MAX_PROMPT_LENGTH,
              className: cn(
                "w-full resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground rounded-xl transition-[min-height,max-height] focus-visible:ring-emerald-500 focus-visible:border-emerald-500/50",
                isEnhancedPromptExpanded ? "min-h-[76px] max-h-[20vh] py-2 pl-3 pr-3" : "min-h-9 max-h-9 py-2 pl-3 pr-3 overflow-y-hidden",
                isEnhancedPromptExpanded && needsScrollbarEnhanced && "overflow-y-auto custom-scrollbar",
                isEnhancedPromptExpanded && !needsScrollbarEnhanced && "overflow-y-hidden"
              ),
              style: { height: "auto" }
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 951,
              columnNumber: 25
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 950,
            columnNumber: 21
          }, this),
          modelType.supportsNegativePrompt && !modelType.isImagen4 && !modelType.isKling25 && /* @__PURE__ */ jsxDEV("div", { className: "mb-2", children: /* @__PURE__ */ jsxDEV(
            Input,
            {
              type: "text",
              placeholder: "\u041D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043F\u0442 (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E)",
              value: negativePrompt,
              onChange: (e) => setNegativePrompt(e.target.value),
              disabled: isDisabled,
              className: "w-full border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl"
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 988,
              columnNumber: 29
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 987,
            columnNumber: 25
          }, this),
          modelType.isSeedream4_5_Edit && /* @__PURE__ */ jsxDEV("p", { className: "mb-2 text-xs text-muted-foreground", children: "Seedream 4.5 Edit \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0434\u043E 14 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0434\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1003,
            columnNumber: 21
          }, this),
          modelType.isSeedream5_Edit && /* @__PURE__ */ jsxDEV("p", { className: "mb-2 text-xs text-muted-foreground", children: "Seedream 5.0 Edit \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0434\u043E 14 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0434\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1011,
            columnNumber: 21
          }, this),
          modelType.isKlingMotionControl && /* @__PURE__ */ jsxDEV("p", { className: "mb-2 text-xs text-muted-foreground", children: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F 1 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 (\u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436) \u0438 1 \u0432\u0438\u0434\u0435\u043E (\u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0441 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F). \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0444\u0430\u0439\u043B\u044B." }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1019,
            columnNumber: 21
          }, this),
          modelType.isKlingMotionControl && /* @__PURE__ */ jsxDEV("div", { className: "mb-2 flex flex-wrap items-center gap-2 text-xs", children: [
            /* @__PURE__ */ jsxDEV(
              Select,
              {
                value: settings.klingMotionCharacterOrientation ?? "image",
                onValueChange: (v) => setKlingMotionCharacterOrientation(
                  v
                ),
                disabled: isDisabled,
                children: [
                  /* @__PURE__ */ jsxDEV(SelectTrigger, { className: "w-[200px] border-border bg-secondary text-foreground rounded-xl", children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: "\u041E\u0440\u0438\u0435\u043D\u0442\u0430\u0446\u0438\u044F" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1041,
                    columnNumber: 33
                  }, this) }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1040,
                    columnNumber: 29
                  }, this),
                  /* @__PURE__ */ jsxDEV(SelectContent, { children: [
                    /* @__PURE__ */ jsxDEV(SelectItem, { value: "image", children: "\u041A\u0430\u043A \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438 (\u043C\u0430\u043A\u0441 10\u0441)" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1044,
                      columnNumber: 33
                    }, this),
                    /* @__PURE__ */ jsxDEV(SelectItem, { value: "video", children: "\u041A\u0430\u043A \u043D\u0430 \u0432\u0438\u0434\u0435\u043E (\u043C\u0430\u043A\u0441 30\u0441)" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1047,
                      columnNumber: 33
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1043,
                    columnNumber: 29
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1028,
                columnNumber: 25
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              Select,
              {
                value: settings.klingMotionVideoQuality ?? "720p",
                onValueChange: (v) => setKlingMotionVideoQuality(
                  v
                ),
                disabled: isDisabled,
                children: [
                  /* @__PURE__ */ jsxDEV(SelectTrigger, { className: "w-[100px] border-border bg-secondary text-foreground rounded-xl", children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1062,
                    columnNumber: 33
                  }, this) }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1061,
                    columnNumber: 29
                  }, this),
                  /* @__PURE__ */ jsxDEV(SelectContent, { children: [
                    /* @__PURE__ */ jsxDEV(SelectItem, { value: "720p", children: "720p" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1065,
                      columnNumber: 33
                    }, this),
                    /* @__PURE__ */ jsxDEV(SelectItem, { value: "1080p", children: "1080p" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1066,
                      columnNumber: 33
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1064,
                    columnNumber: 29
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1052,
                columnNumber: 25
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1027,
            columnNumber: 21
          }, this),
          currentModel === "SEEDANCE_1_5_PRO_KIEAI" && /* @__PURE__ */ jsxDEV("div", { className: "mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "\u041A\u0430\u043C\u0435\u0440\u0430:" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1075,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV(
              Select,
              {
                value: fixedLens === void 0 ? "false" : fixedLens ? "true" : "false",
                onValueChange: (value) => setFixedLens(value === "true"),
                disabled: isDisabled,
                children: [
                  /* @__PURE__ */ jsxDEV(SelectTrigger, { className: "w-[150px] border-border bg-secondary text-foreground rounded-xl", children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: "\u0420\u0435\u0436\u0438\u043C \u043A\u0430\u043C\u0435\u0440\u044B" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1090,
                    columnNumber: 33
                  }, this) }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1089,
                    columnNumber: 29
                  }, this),
                  /* @__PURE__ */ jsxDEV(
                    SelectContent,
                    {
                      side: "top",
                      sideOffset: 8,
                      position: "popper",
                      collisionPadding: 20,
                      avoidCollisions: true,
                      className: "border-border bg-card data-[side=top]:animate-none!",
                      children: [
                        /* @__PURE__ */ jsxDEV(
                          SelectItem,
                          {
                            value: "true",
                            className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
                            children: "\u0424\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0440\u0430\u043A\u0443\u0440\u0441 (fixed_lens)"
                          },
                          void 0,
                          false,
                          {
                            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                            lineNumber: 1100,
                            columnNumber: 33
                          },
                          this
                        ),
                        /* @__PURE__ */ jsxDEV(
                          SelectItem,
                          {
                            value: "false",
                            className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
                            children: "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u0430\u044F \u043A\u0430\u043C\u0435\u0440\u0430"
                          },
                          void 0,
                          false,
                          {
                            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                            lineNumber: 1106,
                            columnNumber: 33
                          },
                          this
                        )
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1092,
                      columnNumber: 29
                    },
                    this
                  )
                ]
              },
              void 0,
              true,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1076,
                columnNumber: 25
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1074,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV(
              ModelSelector,
              {
                value: currentModel,
                onChange: (model) => {
                  setSeed(void 0);
                  onModelChange(model);
                },
                disabled: isDisabled,
                appMode
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1119,
                columnNumber: 21
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              ModelSettingsPanel,
              {
                model: currentModel,
                format,
                quality,
                duration,
                sound,
                onFormatChange: (value) => setFormat(value),
                onQualityChange: setQuality,
                onDurationChange: setDuration,
                onSoundChange: setSound,
                veoGenerationType,
                onVeoGenerationTypeChange: setVeoGenerationType,
                disabled: isDisabled
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1130,
                columnNumber: 21
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1118,
            columnNumber: 17
          }, this),
          modelType.isVeo && /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 mb-2", children: /* @__PURE__ */ jsxDEV("div", { className: "w-74", children: /* @__PURE__ */ jsxDEV(
            NumberInput,
            {
              placeholder: "Seed (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E, 10000-99999)",
              value: seed,
              onValueChange: setSeed,
              disabled: isDisabled,
              className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl",
              min: 1e4,
              max: 99999
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1163,
              columnNumber: 29
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1162,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1161,
            columnNumber: 21
          }, this),
          modelType.isImagen4 && /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 mb-2", children: [
            modelType.supportsNegativePrompt ? /* @__PURE__ */ jsxDEV(
              Input,
              {
                type: "text",
                placeholder: "\u041D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043F\u0442 (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E)",
                value: negativePrompt,
                onChange: (e) => setNegativePrompt(e.target.value),
                disabled: isDisabled,
                className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1180,
                columnNumber: 29
              },
              this
            ) : null,
            /* @__PURE__ */ jsxDEV(
              NumberInput,
              {
                placeholder: "Seed (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E)",
                value: seed,
                onValueChange: setSeed,
                disabled: isDisabled,
                className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-40"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1191,
                columnNumber: 25
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1178,
            columnNumber: 21
          }, this),
          modelType.isKling25 && (modelType.supportsNegativePrompt || modelType.supportsCfgScale) && /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 mb-2", children: [
            modelType.supportsNegativePrompt ? /* @__PURE__ */ jsxDEV(
              Input,
              {
                type: "text",
                placeholder: "\u041D\u0435\u0433\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043F\u0442 (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E)",
                value: negativePrompt,
                onChange: (e) => setNegativePrompt(e.target.value),
                disabled: isDisabled,
                className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1207,
                columnNumber: 33
              },
              this
            ) : null,
            modelType.supportsCfgScale ? /* @__PURE__ */ jsxDEV(
              NumberInput,
              {
                placeholder: "CFG Scale (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E, 1-20)",
                value: cfgScale,
                onValueChange: setCfgScale,
                disabled: isDisabled,
                className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-40",
                min: 1,
                max: 20
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1219,
                columnNumber: 33
              },
              this
            ) : null
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1205,
            columnNumber: 25
          }, this),
          modelType.isElevenLabs && /* @__PURE__ */ jsxDEV("div", { className: "mb-2 space-y-2", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-muted-foreground", children: "\u0413\u043E\u043B\u043E\u0441" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1237,
                columnNumber: 33
              }, this),
              /* @__PURE__ */ jsxDEV(
                Select,
                {
                  value: voice,
                  onValueChange: setVoice,
                  disabled: isDisabled,
                  children: [
                    /* @__PURE__ */ jsxDEV(SelectTrigger, { className: "w-40 border-border bg-secondary text-foreground focus-visible:ring-primary rounded-xl", children: /* @__PURE__ */ jsxDEV(SelectValue, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0433\u043E\u043B\u043E\u0441" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1247,
                      columnNumber: 41
                    }, this) }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1246,
                      columnNumber: 37
                    }, this),
                    /* @__PURE__ */ jsxDEV(
                      SelectContent,
                      {
                        side: "top",
                        sideOffset: 8,
                        position: "popper",
                        collisionPadding: 20,
                        avoidCollisions: true,
                        className: "border-border bg-card data-[side=top]:animate-none!",
                        children: ELEVENLABS_VOICES.map(
                          (voiceOption) => /* @__PURE__ */ jsxDEV(
                            SelectItem,
                            {
                              value: voiceOption,
                              className: "text-foreground focus:bg-secondary focus:text-foreground",
                              children: voiceOption
                            },
                            voiceOption,
                            false,
                            {
                              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                              lineNumber: 1259,
                              columnNumber: 49
                            },
                            this
                          )
                        )
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                        lineNumber: 1249,
                        columnNumber: 37
                      },
                      this
                    )
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                  lineNumber: 1240,
                  columnNumber: 33
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1236,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-muted-foreground", children: "\u0421\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C (0-1)" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1272,
                columnNumber: 33
              }, this),
              /* @__PURE__ */ jsxDEV(
                NumberInput,
                {
                  placeholder: "0.5",
                  value: stability,
                  onValueChange: (value) => setStability(value ?? 0.5),
                  disabled: isDisabled,
                  className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-36",
                  min: 0,
                  max: 1,
                  step: 0.1
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                  lineNumber: 1275,
                  columnNumber: 33
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1271,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-muted-foreground", children: "\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u0430 (0-1)" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1289,
                columnNumber: 33
              }, this),
              /* @__PURE__ */ jsxDEV(
                NumberInput,
                {
                  placeholder: "0.75",
                  value: similarityBoost,
                  onValueChange: (value) => setSimilarityBoost(value ?? 0.75),
                  disabled: isDisabled,
                  className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-44",
                  min: 0,
                  max: 1,
                  step: 0.1
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                  lineNumber: 1292,
                  columnNumber: 33
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1288,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-muted-foreground", children: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C (0.5-2)" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1306,
                columnNumber: 33
              }, this),
              /* @__PURE__ */ jsxDEV(
                NumberInput,
                {
                  placeholder: "1",
                  value: speed,
                  onValueChange: (value) => setSpeed(value ?? 1),
                  disabled: isDisabled,
                  className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-36",
                  min: 0.5,
                  max: 2,
                  step: 0.1
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                  lineNumber: 1309,
                  columnNumber: 33
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1305,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-slate-400", children: "\u041A\u043E\u0434 \u044F\u0437\u044B\u043A\u0430 (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E)" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1323,
                columnNumber: 33
              }, this),
              /* @__PURE__ */ jsxDEV(
                Input,
                {
                  type: "text",
                  placeholder: "ru, en, es...",
                  value: languageCode,
                  onChange: (e) => setLanguageCode(e.target.value),
                  disabled: isDisabled,
                  className: "border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl w-40"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                  lineNumber: 1326,
                  columnNumber: 33
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1322,
              columnNumber: 29
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1235,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1234,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: cn(
                "relative rounded-xl transition-all",
                isDragging && "border-2 border-primary bg-secondary/80 p-1"
              ),
              onDragOver: (e) => handleDragOver(e, isDisabled),
              onDragLeave: handleDragLeave,
              onDrop: (e) => handleDrop(e, isDisabled),
              children: [
                /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    ref: fileInputRef,
                    type: "file",
                    accept: currentModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED" ? "image/*,video/*,.zip,application/zip" : "image/*,video/*",
                    multiple: true,
                    onChange: handleFileSelect,
                    className: "hidden"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1352,
                    columnNumber: 21
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  Textarea,
                  {
                    ref: textareaRef,
                    value: prompt,
                    onChange: handleTextareaChange,
                    onKeyDown: handleKeyDown,
                    onPaste: (e) => {
                      loadingEffectForAttachFile();
                      handlePaste(e, isDisabled);
                    },
                    placeholder: "\u041E\u043F\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C...",
                    maxLength: MAX_PROMPT_LENGTH,
                    className: cn(
                      "resize-none border-border bg-secondary pl-4 pr-12 text-foreground placeholder:text-muted-foreground rounded-xl transition-all",
                      isAiModelMode && isEnhancedPromptExpanded ? "min-h-11 max-h-[20vh] py-2 pb-9" : "min-h-[76px] max-h-[20vh] pb-10",
                      "focus-visible:ring-primary focus-visible:border-primary",
                      needsScrollbar && "overflow-y-auto custom-scrollbar",
                      !needsScrollbar && "overflow-y-hidden",
                      isDragging && "border-primary"
                    ),
                    style: { height: "auto" },
                    disabled: isDisabled
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1364,
                    columnNumber: 21
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: cn(
                      "absolute bottom-2.5 right-12 text-[10px] select-none pointer-events-none transition-colors px-1 rounded bg-background/50",
                      prompt.length >= MAX_PROMPT_LENGTH ? "text-destructive" : prompt.length >= MAX_PROMPT_LENGTH * 0.9 ? "text-primary" : "text-muted-foreground"
                    ),
                    children: [
                      prompt.length,
                      "/",
                      MAX_PROMPT_LENGTH
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1391,
                    columnNumber: 21
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-1.5 left-1.5 flex items-center gap-0", children: [
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      type: "button",
                      size: "icon-sm",
                      variant: "ghost",
                      className: cn(
                        "h-8 w-8 hover:bg-secondary",
                        attachedFiles.length > 0 ? "text-primary" : "text-muted-foreground hover:text-primary"
                      ),
                      onClick: () => fileInputRef.current?.click(),
                      disabled: isDisabled,
                      children: /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                        lineNumber: 1419,
                        columnNumber: 29
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1406,
                      columnNumber: 25
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      type: "button",
                      size: "icon-sm",
                      variant: "ghost",
                      className: cn(
                        "h-8 w-8 hover:bg-secondary",
                        isLockEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      ),
                      onClick: toggleLock,
                      disabled: isDisabled,
                      title: isLockEnabled ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E" : "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
                      children: isLockEnabled ? /* @__PURE__ */ jsxDEV(Lock, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                        lineNumber: 1442,
                        columnNumber: 33
                      }, this) : /* @__PURE__ */ jsxDEV(Unlock, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                        lineNumber: 1444,
                        columnNumber: 33
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1423,
                      columnNumber: 25
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                  lineNumber: 1405,
                  columnNumber: 21
                }, this),
                isAiModelMode && /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    type: "button",
                    size: "icon-sm",
                    variant: "secondary",
                    className: cn(
                      "absolute right-1.5 h-8 w-8 text-emerald-300 hover:text-emerald-200",
                      isEnhancedPromptExpanded ? "bottom-2" : "bottom-10"
                    ),
                    onClick: handleEnhancePrompt,
                    disabled: isDisabled || !prompt.trim() || isEnhancingPrompt,
                    title: "\u0423\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u043F\u0440\u043E\u043C\u043F\u0442 (Comet API)",
                    children: isEnhancingPrompt ? /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1470,
                      columnNumber: 33
                    }, this) : /* @__PURE__ */ jsxDEV("span", { children: "\u2728" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1472,
                      columnNumber: 33
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1451,
                    columnNumber: 25
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    type: "button",
                    size: "icon-sm",
                    className: "absolute bottom-1.5 right-1.5 bg-primary hover:bg-primary/90 text-primary-foreground",
                    onClick: (e) => {
                      if (submitInProgressRef.current || isDisabled) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      onSubmit(e);
                    },
                    disabled: isDisabled || !prompt.trim() && attachedFiles.length === 0,
                    children: isSubmitting ? /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1495,
                      columnNumber: 29
                    }, this) : /* @__PURE__ */ jsxDEV(Send, { className: "h-4 w-4" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                      lineNumber: 1497,
                      columnNumber: 29
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                    lineNumber: 1476,
                    columnNumber: 21
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1342,
              columnNumber: 17
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("p", { className: "mt-2 text-xs text-muted-foreground", children: "Enter \u2014 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C, Shift+Enter \u2014 \u043D\u043E\u0432\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430. \u041C\u043E\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u0442\u044C \u0444\u0430\u0439\u043B\u044B \u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u044C \u0438\u0437 \u0431\u0443\u0444\u0435\u0440\u0430 \u043E\u0431\u043C\u0435\u043D\u0430 (Ctrl+V/Cmd+V)" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
            lineNumber: 1503,
            columnNumber: 17
          }, this),
          showScrollButton && scrollToBottom && /* @__PURE__ */ jsxDEV(
            Button,
            {
              size: "icon",
              variant: "secondary",
              className: cn(
                "absolute -top-14 right-1 z-30 h-10 w-10 rounded-full bg-slate-950/60 backdrop-blur-xl text-foreground shadow-2xl border border-white/10 hover:bg-slate-950/80",
                isAiModelMode ? "shadow-emerald-900/30" : "shadow-cyan-900/20"
              ),
              onClick: scrollToBottom,
              children: /* @__PURE__ */ jsxDEV(ChevronDown, { className: "h-6 w-6" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
                lineNumber: 1522,
                columnNumber: 25
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
              lineNumber: 1511,
              columnNumber: 21
            },
            this
          )
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/chat-input.tsx",
        lineNumber: 763,
        columnNumber: 13
      },
      this
    );
  }
);
async function extractVideoThumbnail(videoUrl) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 1e4);
    function cleanup() {
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      video.src = "";
      video.load();
    }
    function handleError() {
      console.warn("[VideoThumbnail] \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0432\u0438\u0434\u0435\u043E:", videoUrl);
      cleanup();
      resolve(null);
    }
    function handleLoadedData() {
      video.currentTime = 0.1;
    }
    video.addEventListener("error", handleError);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        const maxSize = 400;
        const scale = Math.min(
          maxSize / video.videoWidth,
          maxSize / video.videoHeight,
          1
        );
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL("image/jpeg", 0.8);
        cleanup();
        resolve(thumbnail);
      } catch (error) {
        console.warn("[VideoThumbnail] \u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u044F \u043A\u0430\u0434\u0440\u0430:", error);
        cleanup();
        resolve(null);
      }
    });
    video.src = videoUrl;
  });
}
const pendingThumbnails = /* @__PURE__ */ new Set();
function isThumbnailPending(fileId) {
  return pendingThumbnails.has(fileId);
}
function markThumbnailPending(fileId) {
  pendingThumbnails.add(fileId);
}
function unmarkThumbnailPending(fileId) {
  pendingThumbnails.delete(fileId);
}
const CACHE_NAME = "video-cache-v1";
async function cacheVideo(url, fileId) {
  if (!("caches" in window)) {
    console.warn("[VideoCache] Cache API \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F");
    return;
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(`video-${fileId}`, response.clone());
      console.log(`[VideoCache] \u2705 \u0412\u0438\u0434\u0435\u043E \u0437\u0430\u043A\u0435\u0448\u0438\u0440\u043E\u0432\u0430\u043D\u043E: fileId=${fileId}`);
    } else {
      console.warn(`[VideoCache] \u26A0\uFE0F \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E \u0434\u043B\u044F \u043A\u0435\u0448\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F: ${response.status}`);
    }
  } catch (error) {
    console.warn("[VideoCache] \u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043A\u0435\u0448\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0432\u0438\u0434\u0435\u043E:", error);
  }
}
async function getCachedVideo(fileId) {
  if (!("caches" in window)) {
    return null;
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(`video-${fileId}`);
    if (cached) {
      console.log(`[VideoCache] \u2705 \u0412\u0438\u0434\u0435\u043E \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u043A\u0435\u0448\u0435: fileId=${fileId}`);
    }
    return cached || null;
  } catch (error) {
    console.warn("[VideoCache] \u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0438\u0437 \u043A\u0435\u0448\u0430:", error);
    return null;
  }
}
function MediaPreview({
  file,
  showDelete = false,
  className,
  onAttach
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
  const originalFileUrl = getOriginalFileUrl(file);
  const imagePreviewUrls = [
    file.previewPath ? getMediaFileUrl(file.previewPath) : null,
    file.path ? getMediaFileUrl(file.path) : null,
    file.previewUrl ? toDirectImageUrl(file.previewUrl) : null,
    file.url ? toDirectImageUrl(file.url) : null
  ].filter((url) => url !== null && url !== void 0).filter((url, index, self) => self.indexOf(url) === index);
  const imagePreviewUrl = imagePreviewUrls[0] || null;
  async function handleDelete() {
    try {
      await deleteFile(file.id).unwrap();
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F:", error);
    }
  }
  function handleDownload() {
    const downloadUrl = getOriginalFileUrl(file);
    if (downloadUrl) {
      downloadFile(downloadUrl, file.filename);
    } else {
      console.warn(
        "[MediaPreview] \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B: \u043D\u0435\u0442 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E URL",
        file
      );
    }
  }
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: cn(
          "group relative overflow-hidden rounded-xl border border-border bg-secondary",
          className
        ),
        children: [
          file.type === "IMAGE" && /* @__PURE__ */ jsxDEV(
            ImagePreview,
            {
              src: imagePreviewUrl || "",
              fallbackUrls: imagePreviewUrls.slice(1),
              alt: file.filename,
              onClick: () => setIsFullscreen(true)
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 104,
              columnNumber: 21
            },
            this
          ),
          file.type === "VIDEO" && /* @__PURE__ */ jsxDEV(
            VideoPreview,
            {
              fileId: file.id,
              previewUrl: file.previewPath || file.previewUrl || null,
              originalUrl: originalFileUrl || "",
              filename: file.filename
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 113,
              columnNumber: 21
            },
            this
          ),
          file.type === "AUDIO" && /* @__PURE__ */ jsxDEV(
            AudioPreview,
            {
              originalUrl: originalFileUrl || "",
              filename: file.filename
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 122,
              columnNumber: 21
            },
            this
          ),
          file.type !== "VIDEO" && file.type !== "AUDIO" && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100", children: [
            file.type === "IMAGE" && /* @__PURE__ */ jsxDEV(
              Button,
              {
                size: "icon",
                variant: "secondary",
                className: "h-8 w-8",
                onClick: () => setIsFullscreen(true),
                children: /* @__PURE__ */ jsxDEV(Maximize2, { className: "h-4 w-4" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                  lineNumber: 138,
                  columnNumber: 33
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                lineNumber: 132,
                columnNumber: 29
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                size: "icon",
                variant: "secondary",
                className: "h-8 w-8",
                onClick: handleDownload,
                children: /* @__PURE__ */ jsxDEV(Download, { className: "h-4 w-4" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                  lineNumber: 148,
                  columnNumber: 29
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                lineNumber: 142,
                columnNumber: 25
              },
              this
            ),
            showDelete && /* @__PURE__ */ jsxDEV(
              Button,
              {
                size: "icon",
                variant: "destructive",
                className: "h-8 w-8",
                onClick: handleDelete,
                disabled: isDeleting,
                children: /* @__PURE__ */ jsxDEV(Trash2, { className: "h-4 w-4" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                  lineNumber: 159,
                  columnNumber: 33
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                lineNumber: 152,
                columnNumber: 29
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 130,
            columnNumber: 21
          }, this),
          file.type === "VIDEO" && showDelete && /* @__PURE__ */ jsxDEV("div", { className: "absolute right-2 top-2 z-10", children: /* @__PURE__ */ jsxDEV(
            Button,
            {
              size: "icon",
              variant: "destructive",
              className: "h-8 w-8 bg-black/70 hover:bg-red-600/80",
              onClick: handleDelete,
              disabled: isDeleting,
              children: /* @__PURE__ */ jsxDEV(Trash2, { className: "h-4 w-4" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                lineNumber: 175,
                columnNumber: 29
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 168,
              columnNumber: 25
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 167,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxDEV(TypeIcon, { type: file.type }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 183,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-muted-foreground", children: formatFileSize(file.size || 0) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 184,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 182,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 181,
            columnNumber: 17
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
        lineNumber: 96,
        columnNumber: 13
      },
      this
    ),
    file.type === "IMAGE" && /* @__PURE__ */ jsxDEV(Dialog, { open: isFullscreen, onOpenChange: setIsFullscreen, children: /* @__PURE__ */ jsxDEV(
      DialogContent,
      {
        showCloseButton: false,
        className: "max-h-[95vh] max-w-[95vw] overflow-hidden border-border bg-background p-0",
        children: [
          /* @__PURE__ */ jsxDEV(DialogTitle, { className: "sr-only", children: [
            "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F: ",
            file.filename
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 198,
            columnNumber: 25
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
            /* @__PURE__ */ jsxDEV(
              "img",
              {
                src: originalFileUrl || file.url || "",
                alt: file.filename,
                className: "max-h-[90vh] w-full object-contain"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                lineNumber: 202,
                columnNumber: 29
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute right-2 top-2 flex gap-2", children: [
              /* @__PURE__ */ jsxDEV(
                Button,
                {
                  size: "icon",
                  variant: "secondary",
                  onClick: handleDownload,
                  children: /* @__PURE__ */ jsxDEV(Download, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                    lineNumber: 213,
                    columnNumber: 37
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                  lineNumber: 208,
                  columnNumber: 33
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                Button,
                {
                  size: "icon",
                  variant: "secondary",
                  onClick: () => setIsFullscreen(false),
                  children: /* @__PURE__ */ jsxDEV(X, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                    lineNumber: 220,
                    columnNumber: 37
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                  lineNumber: 215,
                  columnNumber: 33
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 207,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between text-white", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "font-medium text-foreground", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                lineNumber: 225,
                columnNumber: 37
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-muted-foreground", children: getImageDimensions(
                file.width,
                file.height
              ) }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
                lineNumber: 228,
                columnNumber: 37
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 224,
              columnNumber: 33
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
              lineNumber: 223,
              columnNumber: 29
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 201,
            columnNumber: 25
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
        lineNumber: 194,
        columnNumber: 21
      },
      this
    ) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
      lineNumber: 193,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
    lineNumber: 95,
    columnNumber: 9
  }, this);
}
function ImagePreview({
  src,
  fallbackUrls = [],
  alt,
  onClick
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  function handleError() {
    console.warn("[ImagePreview] \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F:", {
      currentSrc,
      currentUrlIndex,
      fallbackUrls,
      alt
    });
    if (currentUrlIndex < fallbackUrls.length) {
      const nextIndex = currentUrlIndex + 1;
      setCurrentUrlIndex(nextIndex);
      const nextUrl = fallbackUrls[currentUrlIndex];
      console.log("[ImagePreview] \u041F\u0440\u043E\u0431\u0443\u0435\u043C \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 URL:", nextUrl);
      setCurrentSrc(nextUrl);
      setIsLoaded(false);
      setHasError(false);
    } else {
      console.error(
        "[ImagePreview] \u0412\u0441\u0435 URL \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u044B, \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u043C \u0438\u043A\u043E\u043D\u043A\u0443 \u0444\u0430\u0439\u043B\u0430"
      );
      setHasError(true);
    }
  }
  useEffect(() => {
    setCurrentSrc(src);
    setCurrentUrlIndex(0);
    setIsLoaded(false);
    setHasError(false);
  }, [src]);
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [currentSrc]);
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "relative aspect-square cursor-pointer overflow-hidden",
      onClick,
      children: [
        !isLoaded && !hasError && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center bg-secondary", children: /* @__PURE__ */ jsxDEV(ImageIcon, { className: "h-8 w-8 animate-pulse text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 309,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 308,
          columnNumber: 17
        }, this),
        hasError ? /* @__PURE__ */ jsxDEV("div", { className: "flex h-full items-center justify-center bg-secondary", children: /* @__PURE__ */ jsxDEV(FileIcon, { className: "h-8 w-8 text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 314,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 313,
          columnNumber: 17
        }, this) : /* @__PURE__ */ jsxDEV(
          "img",
          {
            src: currentSrc,
            alt,
            loading: "lazy",
            className: cn(
              "h-full w-full object-cover transition-opacity",
              isLoaded ? "opacity-100" : "opacity-0"
            ),
            onLoad: () => setIsLoaded(true),
            onError: handleError
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 317,
            columnNumber: 17
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
      lineNumber: 303,
      columnNumber: 9
    },
    this
  );
}
function VideoPreview({
  fileId,
  previewUrl,
  originalUrl,
  filename
}) {
  const [shouldLoadOriginal, setShouldLoadOriginal] = useState(false);
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [localThumbnail, setLocalThumbnail] = useState(null);
  const thumbnailGeneratedRef = useRef(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [uploadThumbnail] = useUploadThumbnailMutation();
  const isPendingPreview = previewUrl?.startsWith("__pending__") ?? false;
  const actualPreviewUrl = isPendingPreview && previewUrl ? previewUrl.replace("__pending__", "") : previewUrl;
  useEffect(() => {
    if (previewUrl || isGeneratingThumbnail || thumbnailGeneratedRef.current || isThumbnailPending(fileId) || !originalUrl) {
      return;
    }
    async function generateThumbnail() {
      thumbnailGeneratedRef.current = true;
      markThumbnailPending(fileId);
      setIsGeneratingThumbnail(true);
      try {
        const thumbnail = await extractVideoThumbnail(originalUrl);
        if (thumbnail) {
          setLocalThumbnail(thumbnail);
          uploadThumbnail({ fileId, thumbnail }).catch((error) => {
            console.warn(
              "[VideoPreview] \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 thumbnail \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440:",
              error
            );
          });
        }
      } catch (error) {
        console.warn(
          "[VideoPreview] \u041E\u0448\u0438\u0431\u043A\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 thumbnail:",
          error
        );
      } finally {
        setIsGeneratingThumbnail(false);
        unmarkThumbnailPending(fileId);
      }
    }
    generateThumbnail();
  }, [
    fileId,
    previewUrl,
    originalUrl,
    isGeneratingThumbnail,
    uploadThumbnail
  ]);
  useEffect(() => {
    if (!shouldLoadOriginal || !originalUrl) return;
    let blobUrl = null;
    async function loadVideo() {
      setIsLoadingVideo(true);
      try {
        const cached = await getCachedVideo(fileId);
        if (cached) {
          const blob2 = await cached.blob();
          blobUrl = URL.createObjectURL(blob2);
          setVideoBlobUrl(blobUrl);
          setIsLoadingVideo(false);
          return;
        }
        const response = await fetch(originalUrl);
        if (!response.ok) {
          throw new Error(
            `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E: ${response.status}`
          );
        }
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        setVideoBlobUrl(blobUrl);
        await cacheVideo(originalUrl, fileId);
        setIsLoadingVideo(false);
      } catch (error) {
        console.error("[VideoPreview] \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0432\u0438\u0434\u0435\u043E:", error);
        setIsLoadingVideo(false);
        setVideoBlobUrl(originalUrl);
      }
    }
    loadVideo();
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [shouldLoadOriginal, originalUrl, fileId]);
  function handlePlay() {
    setShouldLoadOriginal(true);
  }
  const displayPreviewUrl = actualPreviewUrl ? actualPreviewUrl.startsWith("data:") ? actualPreviewUrl : actualPreviewUrl.startsWith("http://") || actualPreviewUrl.startsWith("https://") ? actualPreviewUrl : getMediaFileUrl(actualPreviewUrl) : localThumbnail;
  if (shouldLoadOriginal) {
    const videoSrc = videoBlobUrl || originalUrl;
    return /* @__PURE__ */ jsxDEV("div", { className: "group/video relative aspect-square", children: [
      isLoadingVideo && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center bg-secondary z-10", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV(Video, { className: "h-8 w-8 animate-pulse text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 508,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-muted-foreground", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0432\u0438\u0434\u0435\u043E..." }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 509,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
        lineNumber: 507,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
        lineNumber: 506,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(
        "video",
        {
          src: videoSrc,
          poster: displayPreviewUrl || void 0,
          controls: true,
          className: "h-full w-full object-cover video-controls-on-hover"
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 515,
          columnNumber: 17
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
      lineNumber: 504,
      columnNumber: 13
    }, this);
  }
  if (isGeneratingThumbnail && !localThumbnail) {
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "relative aspect-square cursor-pointer overflow-hidden",
        onClick: handlePlay,
        children: [
          /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-full w-full rounded-none" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 532,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV("div", { className: "rounded-full bg-white/20 p-4 backdrop-blur-sm animate-pulse", children: /* @__PURE__ */ jsxDEV(Video, { className: "h-8 w-8 text-white" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 535,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 534,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 533,
            columnNumber: 17
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
        lineNumber: 528,
        columnNumber: 13
      },
      this
    );
  }
  if (!displayPreviewUrl || hasPreviewError) {
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "relative aspect-square cursor-pointer overflow-hidden bg-secondary",
        onClick: handlePlay,
        children: /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex flex-col items-center justify-center gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "rounded-full bg-white/20 p-6 backdrop-blur-sm", children: /* @__PURE__ */ jsxDEV(Video, { className: "h-12 w-12 text-white" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 551,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 550,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u044F" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 553,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 549,
          columnNumber: 17
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
        lineNumber: 545,
        columnNumber: 13
      },
      this
    );
  }
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "relative aspect-square cursor-pointer overflow-hidden",
      onClick: handlePlay,
      children: [
        /* @__PURE__ */ jsxDEV(
          "img",
          {
            src: displayPreviewUrl,
            alt: filename,
            loading: "lazy",
            className: cn(
              "h-full w-full object-cover transition-opacity",
              isPreviewLoaded ? "opacity-100" : "opacity-0"
            ),
            onLoad: () => setIsPreviewLoaded(true),
            onError: (e) => {
              console.warn("[VideoPreview] \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043F\u0440\u0435\u0432\u044C\u044E:", {
                fileId,
                filename,
                displayPreviewUrl,
                error: e
              });
              setHasPreviewError(true);
            }
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
            lineNumber: 567,
            columnNumber: 13
          },
          this
        ),
        !isPreviewLoaded && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center bg-secondary", children: /* @__PURE__ */ jsxDEV(Video, { className: "h-8 w-8 animate-pulse text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 588,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 587,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-black/0 transition-colors hover:bg-black/10" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
          lineNumber: 592,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
      lineNumber: 563,
      columnNumber: 9
    },
    this
  );
}
function AudioPreview({ originalUrl, filename }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "flex aspect-video flex-col items-center justify-center gap-3 bg-secondary p-4", children: [
    /* @__PURE__ */ jsxDEV(AudioLines, { className: "h-12 w-12 text-primary" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
      lineNumber: 607,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-muted-foreground text-center max-w-full truncate", children: filename }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
      lineNumber: 608,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("audio", { src: originalUrl, controls: true, className: "w-full" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
      lineNumber: 611,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
    lineNumber: 606,
    columnNumber: 9
  }, this);
}
function TypeIcon({ type }) {
  const config2 = {
    IMAGE: { icon: ImageIcon },
    VIDEO: { icon: Video },
    AUDIO: { icon: AudioLines }
  };
  const { icon: Icon } = config2[type];
  return /* @__PURE__ */ jsxDEV(Icon, { className: "h-4 w-4 text-muted-foreground" }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-preview.tsx",
    lineNumber: 630,
    columnNumber: 12
  }, this);
}
function getImageDimensions(width, height) {
  if (width && height) {
    return `${width} \xD7 ${height}`;
  }
  return "";
}
function StatusBadge({ status }) {
  const config2 = {
    PENDING: {
      icon: Loader2,
      label: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430",
      className: "bg-blue-900/30 text-blue-400"
    },
    PROCESSING: {
      icon: Loader2,
      label: "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F",
      className: "bg-blue-900/30 text-blue-400"
    },
    COMPLETING: {
      icon: Loader2,
      label: "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435",
      className: "bg-blue-900/30 text-blue-400"
    },
    COMPLETED: {
      icon: CheckCircle2,
      label: "\u0413\u043E\u0442\u043E\u0432\u043E",
      className: "bg-green-900/30 text-green-400"
    },
    FAILED: {
      icon: AlertCircle,
      label: "\u041E\u0448\u0438\u0431\u043A\u0430",
      className: "bg-red-900/30 text-red-400"
    }
  };
  const { icon: Icon, label, className } = config2[status] ?? config2.PROCESSING;
  const shouldSpin = status === "PROCESSING" || status === "PENDING" || status === "COMPLETING";
  return /* @__PURE__ */ jsxDEV(Badge, { variant: "secondary", className, children: [
    /* @__PURE__ */ jsxDEV(
      Icon,
      {
        className: `mr-1 h-3 w-3 ${shouldSpin ? "animate-spin" : ""}`
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/status-badge.tsx",
        lineNumber: 44,
        columnNumber: 13
      },
      this
    ),
    label
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/status-badge.tsx",
    lineNumber: 43,
    columnNumber: 9
  }, this);
}
function AttachedFileThumbnail({ urls, alt, isVideo }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const currentUrl = urls[currentIndex];
  function handleError() {
    if (currentIndex + 1 < urls.length) {
      setCurrentIndex((i) => i + 1);
      setHasError(false);
    } else {
      setHasError(true);
    }
  }
  if (hasError || !currentUrl) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-primary-foreground/20 bg-secondary", children: /* @__PURE__ */ jsxDEV(ImageIcon, { className: "h-8 w-8 text-muted-foreground/50" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
      lineNumber: 60,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
      lineNumber: 59,
      columnNumber: 13
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "h-16 w-16 overflow-hidden rounded-lg border border-primary-foreground/20", children: isVideo ? /* @__PURE__ */ jsxDEV(
    "video",
    {
      src: currentUrl,
      className: "h-full w-full object-cover",
      onError: handleError
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
      lineNumber: 68,
      columnNumber: 17
    },
    this
  ) : /* @__PURE__ */ jsxDEV(
    "img",
    {
      src: currentUrl,
      alt,
      className: "h-full w-full object-cover",
      referrerPolicy: "no-referrer",
      onError: handleError
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
      lineNumber: 74,
      columnNumber: 17
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
    lineNumber: 66,
    columnNumber: 9
  }, this);
}
function MessageItem({
  request,
  onEditPrompt,
  onAttachFile,
  onRepeatRequest
}) {
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
  const { data: models } = useGetModelsQuery();
  const [fullscreenVideo, setFullscreenVideo] = useState(
    null
  );
  const [attachingFile, setAttachingFile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef(null);
  const loadingEffectForAttachFile = useMemo(
    () => createLoadingEffectForAttachFile(setAttachingFile),
    []
  );
  useEffect(() => {
    if (textRef.current) {
      const { scrollHeight, clientHeight } = textRef.current;
      setIsClamped(scrollHeight > clientHeight);
    }
  }, [request.prompt]);
  function getModelInfo(model) {
    if (!model) return null;
    return models?.find((m) => m.key === model);
  }
  const modelInfo = getModelInfo(request.model);
  const providerName = modelInfo?.provider ? getProviderDisplayName(modelInfo.provider) : null;
  async function handleDeleteFile(event, fileId) {
    event.stopPropagation();
    try {
      await deleteFile(fileId).unwrap();
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u0430:", error);
    }
  }
  function getResponseBackgroundClass() {
    if (request.status === "FAILED") {
      return "bg-destructive/10 border border-destructive/20";
    }
    return "bg-secondary/40 border border-border/50";
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "group flex items-start justify-end gap-2", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1", children: [
        onEditPrompt && /* @__PURE__ */ jsxDEV(
          Button,
          {
            type: "button",
            size: "icon",
            variant: "ghost",
            className: "h-8 w-8 shrink-0 text-primary opacity-0 transition-opacity hover:text-primary/80 hover:bg-primary/20 group-hover:opacity-100",
            onClick: () => onEditPrompt(request.prompt),
            title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u043C\u043F\u0442",
            children: /* @__PURE__ */ jsxDEV(Copy, { className: "text-muted-foreground" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 172,
              columnNumber: 29
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
            lineNumber: 164,
            columnNumber: 25
          },
          this
        ),
        onRepeatRequest && /* @__PURE__ */ jsxDEV(
          Button,
          {
            type: "button",
            size: "icon",
            variant: "ghost",
            className: "h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary hover:bg-primary/20 focus:text-primary focus:bg-primary/20 group-hover:opacity-100",
            onClick: () => onRepeatRequest(request),
            title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441 \u043A \u043D\u0435\u0439\u0440\u043E\u043D\u043A\u0435",
            children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-4 w-4" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 186,
              columnNumber: 29
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
            lineNumber: 178,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
        lineNumber: 161,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 shadow-sm", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
          /* @__PURE__ */ jsxDEV(
            "p",
            {
              ref: textRef,
              className: `whitespace-pre-wrap text-sm text-primary-foreground transition-all duration-200 ${!isExpanded ? "line-clamp-2" : ""}`,
              children: request.prompt
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 192,
              columnNumber: 25
            },
            this
          ),
          isClamped && /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setIsExpanded(!isExpanded),
              className: "mt-1 text-xs font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors",
              children: isExpanded ? "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C" : "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E"
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 201,
              columnNumber: 29
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
          lineNumber: 191,
          columnNumber: 21
        }, this),
        (request.inputFiles && request.inputFiles.length > 0 || request.files && request.files.length > 0 && (!request.inputFiles || request.inputFiles.length === 0)) && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 flex flex-wrap gap-2", children: [
          request.inputFiles?.map((fileUrl, idx) => {
            if (!fileUrl) return null;
            const isDataUrl = fileUrl.startsWith("data:");
            const isHttpUrl = fileUrl.startsWith("http://") || fileUrl.startsWith("https://");
            const urls = [];
            if (isDataUrl) {
              urls.push(fileUrl);
            } else if (!isHttpUrl && fileUrl) {
              urls.push(getMediaFileUrl(fileUrl));
            } else if (isHttpUrl) {
              urls.push(toDirectImageUrl(fileUrl));
            } else {
              return null;
            }
            const allUrls = [...new Set(urls)];
            const isVideo = isDataUrl ? isVideoDataUrl(fileUrl) : fileUrl.match(/\.(mp4|webm|mov)$/i) !== null;
            return /* @__PURE__ */ jsxDEV(
              AttachedFileThumbnail,
              {
                urls: allUrls,
                alt: `\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043D\u044B\u0439 \u0444\u0430\u0439\u043B ${idx + 1}`,
                isVideo
              },
              idx,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                lineNumber: 243,
                columnNumber: 37
              },
              this
            );
          }),
          (!request.inputFiles || request.inputFiles.length === 0) && request.files.map((file) => {
            const urls = [];
            if (file.path) urls.push(getMediaFileUrl(file.path));
            if (file.previewPath) urls.push(getMediaFileUrl(file.previewPath));
            if (file.url) urls.push(toDirectImageUrl(file.url));
            const uniqueUrls = urls.filter((u, i, a) => a.indexOf(u) === i);
            if (uniqueUrls.length === 0) return null;
            return /* @__PURE__ */ jsxDEV(
              AttachedFileThumbnail,
              {
                urls: uniqueUrls,
                alt: file.filename,
                isVideo: file.type === "VIDEO"
              },
              file.id,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                lineNumber: 264,
                columnNumber: 41
              },
              this
            );
          })
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
          lineNumber: 215,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "mt-1 flex items-center justify-end gap-2 text-xs text-primary-foreground/70", children: [
          modelInfo && /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1", children: [
            modelInfo.name,
            providerName && /* @__PURE__ */ jsxDEV("span", { className: "text-primary-foreground/50", children: [
              "\u2022 ",
              providerName
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 279,
              columnNumber: 37
            }, this),
            request.seed && /* @__PURE__ */ jsxDEV("span", { className: "text-primary-foreground/50", children: [
              "\u2022 Seed: ",
              request.seed
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 284,
              columnNumber: 37
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
            lineNumber: 276,
            columnNumber: 29
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: formatTime(request.createdAt) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
            lineNumber: 290,
            columnNumber: 25
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
          lineNumber: 274,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
        lineNumber: 190,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
      lineNumber: 159,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex justify-start", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-[80%] space-y-3", children: [
      (request.status !== "COMPLETED" || request.status === "COMPLETED" && request.files.length === 0) && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: `rounded-2xl rounded-tl-sm px-4 py-3 ${getResponseBackgroundClass()}`,
          children: [
            /* @__PURE__ */ jsxDEV(StatusBadge, { status: request.status }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 306,
              columnNumber: 29
            }, this),
            request.status === "FAILED" && request.errorMessage && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive", children: [
              /* @__PURE__ */ jsxDEV(AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                lineNumber: 312,
                columnNumber: 41
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "min-w-0 flex-1 text-xs whitespace-pre-wrap break-all overflow-x-auto", children: request.errorMessage }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                lineNumber: 313,
                columnNumber: 41
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 311,
              columnNumber: 37
            }, this),
            (request.status === "PENDING" || request.status === "PROCESSING" || request.status === "COMPLETING") && /* @__PURE__ */ jsxDEV("div", { className: "mt-3 space-y-3", children: /* @__PURE__ */ jsxDEV(Skeleton, { className: "aspect-square w-48 rounded-xl" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 325,
              columnNumber: 37
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 323,
              columnNumber: 33
            }, this),
            request.status === "COMPLETED" && request.files.length === 0 && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 rounded-lg bg-primary/10 p-3 text-primary", children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm", children: "\u26A0\uFE0F \u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430, \u043D\u043E \u0444\u0430\u0439\u043B\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 333,
              columnNumber: 41
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 332,
              columnNumber: 37
            }, this),
            request.completedAt && /* @__PURE__ */ jsxDEV("p", { className: "mt-2 text-xs text-slate-500", children: [
              "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E: ",
              formatTime(request.completedAt)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 342,
              columnNumber: 33
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
          lineNumber: 302,
          columnNumber: 25
        },
        this
      ),
      request.status === "COMPLETED" && request.files.length > 0 && /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: request.files.map((file) => {
          return /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "group flex items-start gap-2",
              children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: `inline-block w-fit rounded-2xl rounded-tl-sm p-2 ${getResponseBackgroundClass()}`,
                    children: /* @__PURE__ */ jsxDEV(
                      MediaPreview,
                      {
                        file,
                        onAttach: onAttachFile
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                        lineNumber: 363,
                        columnNumber: 53
                      },
                      this
                    )
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                    lineNumber: 360,
                    columnNumber: 49
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "mt-1 flex flex-col gap-1", children: [
                  file.type === "IMAGE" && onAttachFile && /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      type: "button",
                      size: "icon",
                      variant: "ghost",
                      className: "h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary hover:bg-primary/10 group-hover:opacity-100",
                      onClick: () => {
                        const fileUrl = file.path ? getMediaFileUrl(
                          file.path
                        ) : file.url;
                        if (!fileUrl) {
                          console.warn(
                            "[MessageItem] \u041D\u0435\u0442 file.path \u0438 file.url"
                          );
                          alert(
                            "\u041E\u0448\u0438\u0431\u043A\u0430: \u0443 \u0444\u0430\u0439\u043B\u0430 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u0443\u0442\u044C \u0438\u043B\u0438 URL. \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u0430\u0439\u043B."
                          );
                          return;
                        }
                        loadingEffectForAttachFile();
                        onAttachFile(
                          fileUrl,
                          file.filename,
                          file.url || void 0
                        );
                      },
                      title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
                      children: attachingFile ? /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                        lineNumber: 409,
                        columnNumber: 69
                      }, this) : /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                        lineNumber: 411,
                        columnNumber: 69
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                      lineNumber: 373,
                      columnNumber: 61
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      type: "button",
                      size: "icon",
                      variant: "ghost",
                      className: "h-8 w-8 shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100",
                      onClick: (e) => handleDeleteFile(
                        e,
                        file.id
                      ),
                      disabled: isDeleting,
                      title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u0430\u0439\u043B",
                      children: /* @__PURE__ */ jsxDEV(Trash2, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                        lineNumber: 430,
                        columnNumber: 57
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                      lineNumber: 416,
                      columnNumber: 53
                    },
                    this
                  ),
                  file.type === "VIDEO" && /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      type: "button",
                      size: "icon",
                      variant: "ghost",
                      className: "h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary hover:bg-primary/10 group-hover:opacity-100",
                      onClick: () => setFullscreenVideo(
                        file
                      ),
                      title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043D\u0430 \u0432\u0435\u0441\u044C \u044D\u043A\u0440\u0430\u043D",
                      children: /* @__PURE__ */ jsxDEV(Maximize2, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                        lineNumber: 446,
                        columnNumber: 61
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                      lineNumber: 434,
                      columnNumber: 57
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                  lineNumber: 369,
                  columnNumber: 49
                }, this)
              ]
            },
            file.id,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
              lineNumber: 356,
              columnNumber: 45
            },
            this
          );
        }) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
          lineNumber: 353,
          columnNumber: 33
        }, this),
        request.completedAt && /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-500", children: [
          "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E:",
          " ",
          formatTime(request.completedAt)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
          lineNumber: 456,
          columnNumber: 37
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
        lineNumber: 352,
        columnNumber: 29
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
      lineNumber: 297,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
      lineNumber: 296,
      columnNumber: 13
    }, this),
    fullscreenVideo && /* @__PURE__ */ jsxDEV(
      Dialog,
      {
        open: !!fullscreenVideo,
        onOpenChange: (open) => !open && setFullscreenVideo(null),
        children: /* @__PURE__ */ jsxDEV(
          DialogContent,
          {
            showCloseButton: false,
            className: "max-h-[95vh] max-w-[95vw] overflow-hidden border-border bg-background p-0",
            children: [
              /* @__PURE__ */ jsxDEV(DialogTitle, { className: "sr-only", children: [
                "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0432\u0438\u0434\u0435\u043E: ",
                fullscreenVideo.filename
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                lineNumber: 476,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
                /* @__PURE__ */ jsxDEV(
                  "video",
                  {
                    src: getOriginalFileUrl(fullscreenVideo) || "",
                    controls: true,
                    autoPlay: true,
                    className: "max-h-[90vh] w-full"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                    lineNumber: 480,
                    columnNumber: 29
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "absolute right-2 top-2 flex gap-2", children: [
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      size: "icon",
                      variant: "secondary",
                      onClick: () => {
                        const downloadUrl = getOriginalFileUrl(fullscreenVideo);
                        if (!downloadUrl) {
                          console.warn(
                            "[MessageItem] \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B: \u043D\u0435\u0442 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E URL",
                            fullscreenVideo
                          );
                          return;
                        }
                        downloadFile(
                          downloadUrl,
                          fullscreenVideo.filename
                        );
                      },
                      title: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B",
                      children: /* @__PURE__ */ jsxDEV(Download, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                        lineNumber: 507,
                        columnNumber: 37
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                      lineNumber: 487,
                      columnNumber: 33
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    Button,
                    {
                      size: "icon",
                      variant: "secondary",
                      onClick: () => setFullscreenVideo(null),
                      children: /* @__PURE__ */ jsxDEV(X, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                        lineNumber: 514,
                        columnNumber: 37
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                      lineNumber: 509,
                      columnNumber: 33
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                  lineNumber: 486,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
                lineNumber: 479,
                columnNumber: 25
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
            lineNumber: 472,
            columnNumber: 21
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
        lineNumber: 468,
        columnNumber: 17
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-item.tsx",
    lineNumber: 157,
    columnNumber: 9
  }, this);
}
function MessageSkeleton() {
  return /* @__PURE__ */ jsxDEV("div", { className: "mb-6 space-y-3", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-16 w-64 rounded-2xl" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-skeleton.tsx",
      lineNumber: 8,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-skeleton.tsx",
      lineNumber: 7,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex justify-start", children: /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-48 w-80 rounded-2xl" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-skeleton.tsx",
      lineNumber: 11,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-skeleton.tsx",
      lineNumber: 10,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-skeleton.tsx",
    lineNumber: 6,
    columnNumber: 9
  }, this);
}
function MessageList({
  requests,
  chatModel,
  isLoading,
  onEditPrompt,
  onAttachFile,
  onRepeatRequest,
  onScrollStateChange,
  onScrollToBottomRef,
  appMode = APP_MODES.DEFAULT
}) {
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [inputPanelHeight, setInputPanelHeight] = useState(0);
  const requestsStatusKey = useMemo(
    () => requests.map((r) => `${r.id}-${r.status}`).join("|"),
    [requests]
  );
  const [showScrollButton, setShowScrollButton] = useState(false);
  useEffect(() => {
    onScrollStateChange?.(showScrollButton);
  }, [showScrollButton, onScrollStateChange]);
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }
  }, []);
  useEffect(() => {
    onScrollToBottomRef?.(scrollToBottom);
  }, [scrollToBottom, onScrollToBottomRef]);
  useEffect(() => {
    const inputPanel = document.getElementById("chat-input");
    if (!inputPanel) return;
    const updateInputPanelHeight = () => {
      const height = inputPanel.offsetHeight;
      setInputPanelHeight(height);
    };
    updateInputPanelHeight();
    const resizeObserver = new ResizeObserver(() => {
      updateInputPanelHeight();
    });
    resizeObserver.observe(inputPanel);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom);
    }
  }, []);
  useEffect(() => {
    const viewport = scrollRef.current;
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll);
      return () => viewport.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [requests.length, requestsStatusKey]);
  if (isLoading) {
    return /* @__PURE__ */ jsxDEV("div", { className: "min-h-0 flex-1 p-4", children: [
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 131,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 132,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 133,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
      lineNumber: 130,
      columnNumber: 13
    }, this);
  }
  if (requests.length === 0) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-4 rounded-full bg-secondary p-6", children: /* @__PURE__ */ jsxDEV("span", { className: "text-4xl", children: "\u{1F3A8}" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 142,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 141,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "mb-2 text-xl font-semibold text-white", children: "\u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 144,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "max-w-md text-slate-400", children: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0440\u043E\u043C\u043F\u0442 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C, \u0447\u0442\u043E\u0431\u044B \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435, \u0432\u0438\u0434\u0435\u043E \u0438\u043B\u0438 \u0430\u0443\u0434\u0438\u043E \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E AI" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 147,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mt-4", children: /* @__PURE__ */ jsxDEV(ModelBadge, { model: chatModel, appMode }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 152,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
        lineNumber: 151,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
      lineNumber: 140,
      columnNumber: 13
    }, this);
  }
  const bottomPadding = inputPanelHeight > 0 ? inputPanelHeight + 24 + 16 : 300;
  return /* @__PURE__ */ jsxDEV("div", { className: "relative flex-1 overflow-hidden min-h-0 mx-0", children: /* @__PURE__ */ jsxDEV(ScrollArea, { className: "h-full bg-background", ref: scrollRef, children: /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "space-y-6 p-4",
      style: { paddingBottom: `${bottomPadding}px` },
      children: [
        requests.map((request) => /* @__PURE__ */ jsxDEV(
          MessageItem,
          {
            request,
            onEditPrompt,
            onAttachFile,
            onRepeatRequest
          },
          request.id,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
            lineNumber: 172,
            columnNumber: 25
          },
          this
        )),
        /* @__PURE__ */ jsxDEV("div", { ref: messagesEndRef }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
          lineNumber: 181,
          columnNumber: 21
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
      lineNumber: 167,
      columnNumber: 17
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
    lineNumber: 166,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/message-list.tsx",
    lineNumber: 165,
    columnNumber: 9
  }, this);
}
function MediaFullscreenView({
  file,
  onClose,
  onAttachFile,
  onRepeatRequest,
  isPinned = false,
  onTogglePin
}) {
  const fileUrl = getOriginalFileUrl(file);
  if (!fileUrl) return null;
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);
  function handleDownload() {
    const downloadUrl = getOriginalFileUrl(file);
    if (!downloadUrl) {
      console.warn(
        "[MediaFullscreenView] \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B: \u043D\u0435\u0442 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E URL",
        file
      );
      return;
    }
    downloadFile(downloadUrl, file.filename);
  }
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm",
      onClick: onClose,
      children: /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "relative max-h-[95vh] max-w-[95vw]",
          onClick: (e) => e.stopPropagation(),
          children: [
            file.type === "IMAGE" && /* @__PURE__ */ jsxDEV(
              "img",
              {
                src: fileUrl,
                alt: file.filename,
                className: "max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                lineNumber: 71,
                columnNumber: 21
              },
              this
            ),
            file.type === "VIDEO" && file.path && /* @__PURE__ */ jsxDEV("div", { className: "relative rounded-lg overflow-hidden shadow-2xl", children: /* @__PURE__ */ jsxDEV(
              "video",
              {
                src: fileUrl,
                controls: true,
                autoPlay: true,
                className: "max-h-[90vh] w-full"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                lineNumber: 80,
                columnNumber: 25
              },
              this
            ) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
              lineNumber: 79,
              columnNumber: 21
            }, this),
            file.type === "AUDIO" && /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4 rounded-xl bg-secondary p-8 shadow-2xl border border-border", children: [
              /* @__PURE__ */ jsxDEV("audio", { src: fileUrl, controls: true }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                lineNumber: 91,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-foreground font-medium", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                lineNumber: 92,
                columnNumber: 25
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
              lineNumber: 90,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute right-2 top-2 flex gap-2", children: [
              file.type === "IMAGE" && onAttachFile && /* @__PURE__ */ jsxDEV(
                Button,
                {
                  size: "icon",
                  variant: "secondary",
                  onClick: (e) => {
                    e.stopPropagation();
                    onAttachFile(
                      fileUrl,
                      file.filename,
                      file.url || void 0
                    );
                  },
                  className: "h-8 w-8 hover:bg-primary hover:text-primary-foreground",
                  title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
                  children: /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                    lineNumber: 117,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                  lineNumber: 102,
                  columnNumber: 25
                },
                this
              ),
              onRepeatRequest && /* @__PURE__ */ jsxDEV(
                Button,
                {
                  size: "icon",
                  variant: "secondary",
                  onClick: (e) => {
                    e.stopPropagation();
                    onRepeatRequest(file.requestId);
                  },
                  className: "h-8 w-8 text-muted-foreground hover:text-primary",
                  title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441",
                  children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                    lineNumber: 132,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                  lineNumber: 122,
                  columnNumber: 25
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                Button,
                {
                  size: "icon",
                  variant: "secondary",
                  onClick: (e) => {
                    e.stopPropagation();
                    handleDownload();
                  },
                  className: "h-8 w-8 hover:bg-secondary/80",
                  title: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B",
                  children: /* @__PURE__ */ jsxDEV(Download, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                    lineNumber: 145,
                    columnNumber: 25
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                  lineNumber: 135,
                  columnNumber: 21
                },
                this
              ),
              file.type === "IMAGE" && onTogglePin && /* @__PURE__ */ jsxDEV(
                Button,
                {
                  size: "icon",
                  variant: "secondary",
                  onClick: (e) => {
                    e.stopPropagation();
                    onTogglePin();
                  },
                  className: `h-8 w-8 ${isPinned ? "text-primary hover:text-primary/80" : ""}`,
                  title: isPinned ? "\u041E\u0442\u043A\u0440\u0435\u043F\u0438\u0442\u044C" : "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C",
                  children: /* @__PURE__ */ jsxDEV(
                    Pin,
                    {
                      className: `h-4 w-4 ${isPinned ? "fill-current" : ""}`
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                      lineNumber: 163,
                      columnNumber: 29
                    },
                    this
                  )
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                  lineNumber: 149,
                  columnNumber: 25
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                Button,
                {
                  size: "icon",
                  variant: "secondary",
                  onClick: (e) => {
                    e.stopPropagation();
                    onClose();
                  },
                  className: "h-8 w-8",
                  title: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
                  children: /* @__PURE__ */ jsxDEV(X, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                    lineNumber: 180,
                    columnNumber: 25
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                  lineNumber: 170,
                  columnNumber: 21
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
              lineNumber: 99,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between text-white", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "font-medium", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                lineNumber: 187,
                columnNumber: 25
              }, this),
              file.size && /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-slate-300", children: formatFileSize(file.size) }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
                lineNumber: 189,
                columnNumber: 29
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
              lineNumber: 186,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
              lineNumber: 185,
              columnNumber: 17
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
          lineNumber: 66,
          columnNumber: 13
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-fullscreen-view.tsx",
      lineNumber: 62,
      columnNumber: 9
    },
    this
  );
}
function GalleryFileCard({
  file,
  onClick,
  onAttachFile,
  onRepeatRequest,
  onDeleteFile,
  onTogglePin,
  isDeleting,
  attachingFile,
  onLoadingEffect,
  isPinned,
  isVideo
}) {
  function handleAttach(e) {
    e.stopPropagation();
    if (!onAttachFile) return;
    const fileUrl = file.path ? getMediaFileUrl(file.path) : file.url;
    if (!fileUrl) {
      console.warn("[MediaGallery] \u041D\u0435\u0442 file.path \u0438 file.url");
      alert(
        "\u041E\u0448\u0438\u0431\u043A\u0430: \u0443 \u0444\u0430\u0439\u043B\u0430 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u0443\u0442\u044C \u0438\u043B\u0438 URL. \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u0430\u0439\u043B."
      );
      return;
    }
    onLoadingEffect();
    onAttachFile(
      fileUrl,
      file.filename,
      file.type === "IMAGE" ? file.url || void 0 : void 0
    );
  }
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "group relative cursor-pointer transition-transform hover:scale-105",
      onClick: (e) => {
        e.stopPropagation();
        onClick(file);
      },
      role: "button",
      tabIndex: 0,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(file);
        }
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxDEV(MediaPreview, { file, className: "h-full w-full" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
          lineNumber: 89,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
          lineNumber: 88,
          columnNumber: 13
        }, this),
        onAttachFile && /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: "absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-primary hover:bg-primary/20 group-hover:opacity-100",
            onClick: handleAttach,
            title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
            children: attachingFile ? /* @__PURE__ */ jsxDEV(Loader2, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
              lineNumber: 102,
              columnNumber: 25
            }, this) : /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-3.5 w-3.5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
              lineNumber: 104,
              columnNumber: 25
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
            lineNumber: 94,
            columnNumber: 17
          },
          this
        ),
        onRepeatRequest && /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: "absolute left-8 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-primary hover:bg-primary/20 focus:text-primary focus:bg-primary/20 group-hover:opacity-100",
            onClick: (e) => {
              e.stopPropagation();
              onRepeatRequest(file.requestId);
            },
            title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441",
            children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-3.5 w-3.5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
              lineNumber: 121,
              columnNumber: 21
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
            lineNumber: 111,
            columnNumber: 17
          },
          this
        ),
        isVideo && /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: "absolute left-1 top-8 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-blue-400 hover:bg-blue-600/20 group-hover:opacity-100",
            onClick: (e) => {
              e.stopPropagation();
              onClick(file);
            },
            title: "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0438\u0434\u0435\u043E",
            children: /* @__PURE__ */ jsxDEV(Maximize2, { className: "h-3.5 w-3.5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
              lineNumber: 137,
              columnNumber: 21
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
            lineNumber: 127,
            columnNumber: 17
          },
          this
        ),
        onTogglePin && /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: `absolute right-7 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 ${isPinned ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-600/20" : "text-slate-400 hover:text-yellow-400 hover:bg-yellow-600/20"}`,
            onClick: (e) => {
              e.stopPropagation();
              onTogglePin(file.id);
            },
            title: isPinned ? "\u041E\u0442\u043A\u0440\u0435\u043F\u0438\u0442\u044C" : "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C",
            children: /* @__PURE__ */ jsxDEV(
              Pin,
              {
                className: `h-3.5 w-3.5 ${isPinned ? "fill-current" : ""}`
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
                lineNumber: 157,
                columnNumber: 21
              },
              this
            )
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
            lineNumber: 143,
            columnNumber: 17
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: "absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100",
            onClick: (e) => onDeleteFile(e, file.id),
            disabled: isDeleting,
            title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u0430\u0439\u043B",
            children: /* @__PURE__ */ jsxDEV(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
              lineNumber: 172,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
            lineNumber: 164,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/gallery-file-card.tsx",
      lineNumber: 73,
      columnNumber: 9
    },
    this
  );
}
function calculateRequestCost(request, pricingMap) {
  if (request.status === "FAILED") {
    return 0;
  }
  if (typeof request.costUsd === "number" && !Number.isNaN(request.costUsd)) {
    return request.costUsd;
  }
  if (pricingMap && request.model) {
    const pricing = pricingMap[request.model];
    if (pricing && typeof pricing.usd === "number") {
      return pricing.usd;
    }
  }
  return 0;
}
function calculateTotalChatCost(requests, pricingMap) {
  return requests.reduce((total, request) => {
    return total + calculateRequestCost(request, pricingMap);
  }, 0);
}
function formatCost(cost) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(cost);
}
const INITIAL_FILES_LIMIT = 12;
function MediaGallery({
  chatId,
  onAttachFile,
  onRepeatRequest,
  appMode = APP_MODES.DEFAULT
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
  const [page, setPage] = useState(1);
  const [accumulatedFiles, setAccumulatedFiles] = useState([]);
  const loadMoreTriggerRef = useRef(null);
  const [isVideoExpanded, setIsVideoExpanded] = useState(true);
  const [isImageExpanded, setIsImageExpanded] = useState(true);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [attachingFile, setAttachingFile] = useState(false);
  const [pinnedImageIds, setPinnedImageIds] = useState(
    /* @__PURE__ */ new Set()
  );
  const loadingEffectForAttachFile = useMemo(
    () => createLoadingEffectForAttachFile(setAttachingFile),
    []
  );
  useEffect(() => {
    if (chatId === void 0) return;
    const storageKey = `pinned-images-chat-${chatId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        const newSet = new Set(ids);
        setPinnedImageIds(newSet);
      } catch (error) {
        console.error("Error loading pinned images:", error);
      }
    } else {
      setPinnedImageIds(/* @__PURE__ */ new Set());
    }
  }, [chatId]);
  useEffect(() => {
    setPage(1);
    setAccumulatedFiles([]);
  }, [chatId]);
  const {
    data: filesData,
    isLoading,
    isFetching
  } = useGetFilesQuery(
    {
      page,
      limit: 50,
      // Загружаем по 50 файлов за раз
      chatId,
      // Передаем chatId для фильтрации
      appMode
    },
    {
      // Пропускаем запрос, если chatId не указан
      skip: chatId === void 0
    }
  );
  const { data: chatData } = useGetChatQuery(
    { id: chatId, limit: 1e3, appMode },
    {
      skip: chatId === void 0,
      refetchOnMountOrArgChange: false
    }
  );
  const { data: pricingMap } = useGetPricingQuery();
  const totalCost = useMemo(() => {
    if (!chatData?.requests) return 0;
    return calculateTotalChatCost(chatData.requests, pricingMap);
  }, [chatData?.requests, pricingMap]);
  useEffect(() => {
    if (!filesData?.data) {
      return;
    }
    if (page === 1) {
      setAccumulatedFiles((prev) => {
        const newFilesIds = new Set(filesData.data.map((f) => f.id));
        const currentPinnedIds = pinnedImageIds;
        const preservedPinnedFiles = prev.filter(
          (f) => currentPinnedIds.has(f.id) && !newFilesIds.has(f.id)
        );
        return [...preservedPinnedFiles, ...filesData.data];
      });
    } else {
      setAccumulatedFiles((prev) => {
        new Set(filesData.data.map((f) => f.id));
        const existingIds = new Set(prev.map((f) => f.id));
        const newFiles = filesData.data.filter(
          (f) => !existingIds.has(f.id)
        );
        const updatedFilesMap = new Map(
          filesData.data.map((f) => [f.id, f])
        );
        const updatedFiles = prev.map((existingFile) => {
          return updatedFilesMap.get(existingFile.id) || existingFile;
        });
        return [...updatedFiles, ...newFiles];
      });
    }
  }, [filesData, page]);
  useEffect(() => {
    if (!chatData?.requests || pinnedImageIds.size === 0) return;
    setAccumulatedFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id));
      const currentPinnedIds = pinnedImageIds;
      const newPinnedFiles = [];
      chatData.requests.forEach((request) => {
        request.files.forEach((file) => {
          if (currentPinnedIds.has(file.id) && !existingIds.has(file.id)) {
            newPinnedFiles.push(file);
          }
        });
      });
      if (newPinnedFiles.length === 0) return prev;
      return [...newPinnedFiles, ...prev];
    });
  }, [chatData, pinnedImageIds]);
  function togglePinImage(fileId) {
    setPinnedImageIds((prev) => {
      const newPinned = new Set(prev);
      if (newPinned.has(fileId)) {
        newPinned.delete(fileId);
      } else {
        newPinned.add(fileId);
      }
      if (chatId !== void 0) {
        const storageKey = `pinned-images-chat-${chatId}`;
        localStorage.setItem(
          storageKey,
          JSON.stringify(Array.from(newPinned))
        );
      }
      return newPinned;
    });
  }
  const { videoFiles, pinnedImages, unpinnedImages } = useMemo(() => {
    const videos = [];
    const pinned = [];
    const unpinned = [];
    accumulatedFiles.forEach((file) => {
      if (file.type === "VIDEO") {
        videos.push(file);
      } else if (file.type === "IMAGE") {
        if (pinnedImageIds.has(file.id)) {
          pinned.push(file);
        } else {
          unpinned.push(file);
        }
      }
    });
    return {
      videoFiles: videos,
      pinnedImages: pinned,
      unpinnedImages: unpinned
    };
  }, [accumulatedFiles, pinnedImageIds]);
  useEffect(() => {
    if (!loadMoreTriggerRef.current || isFetching) {
      return;
    }
    const hasMorePages = filesData?.pagination && filesData.pagination.page < filesData.pagination.totalPages;
    if (!hasMorePages) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreTriggerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [isFetching, filesData]);
  function handleFileClick(file) {
    setSelectedFile(file);
  }
  async function handleDeleteFile(event, fileId) {
    event.stopPropagation();
    setAccumulatedFiles((prev) => prev.filter((f) => f.id !== fileId));
    try {
      await deleteFile(fileId).unwrap();
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u0430:", error);
    }
  }
  if (isLoading) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full min-h-0 w-[30%] shrink-0 flex-col border-l border-border bg-background", children: [
      /* @__PURE__ */ jsxDEV("div", { className: PANEL_HEADER_CLASSES, children: /* @__PURE__ */ jsxDEV("h2", { className: PANEL_HEADER_TITLE_CLASSES, children: "\u041C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u044B" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 319,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 318,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(ScrollArea, { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2 p-4", children: Array.from({ length: INITIAL_FILES_LIMIT }).map(
        (_, index) => /* @__PURE__ */ jsxDEV(
          Skeleton,
          {
            className: "aspect-square w-full rounded-xl"
          },
          `skeleton-${index}`,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
            lineNumber: 325,
            columnNumber: 33
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 322,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 321,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
      lineNumber: 317,
      columnNumber: 13
    }, this);
  }
  if (accumulatedFiles.length === 0) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full min-h-0 w-[30%] shrink-0 flex-col border-l border-border bg-background", children: [
      /* @__PURE__ */ jsxDEV("div", { className: PANEL_HEADER_CLASSES, children: /* @__PURE__ */ jsxDEV("h2", { className: PANEL_HEADER_TITLE_CLASSES, children: "\u041C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u044B" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 341,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 340,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-0 flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0435\u0442 \u043C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u043E\u0432" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 344,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 343,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
      lineNumber: 339,
      columnNumber: 13
    }, this);
  }
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex h-full min-h-0 w-[30%] shrink-0 flex-col border-l border-border bg-background", children: [
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: cn(
            PANEL_HEADER_CLASSES,
            "flex-row items-center justify-between bg-background"
          ),
          children: [
            /* @__PURE__ */ jsxDEV("h2", { className: PANEL_HEADER_TITLE_CLASSES, children: [
              "\u041C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u044B (",
              accumulatedFiles.length,
              ")"
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 362,
              columnNumber: 21
            }, this),
            totalCost > 0 && /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20", children: formatCost(totalCost) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 366,
              columnNumber: 25
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
          lineNumber: 356,
          columnNumber: 17
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(ScrollArea, { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-4", children: [
        pinnedImages.length > 0 && /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setIsPinnedExpanded(!isPinnedExpanded),
              className: "flex w-full items-center justify-between rounded-lg bg-transparent px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors",
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 items-center", children: [
                  /* @__PURE__ */ jsxDEV(Pin, { className: "h-4 w-4 text-yellow-400" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 385,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0417\u0430\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043D\u044B\u0435 (",
                    pinnedImages.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 386,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                  lineNumber: 384,
                  columnNumber: 37
                }, this),
                /* @__PURE__ */ jsxDEV(
                  ChevronDown,
                  {
                    className: `h-4 w-4 transition-transform ${isPinnedExpanded ? "rotate-180" : ""}`
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 390,
                    columnNumber: 37
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 378,
              columnNumber: 33
            },
            this
          ),
          isPinnedExpanded && /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2 mt-2", children: pinnedImages.map((file) => /* @__PURE__ */ jsxDEV(
            GalleryFileCard,
            {
              file,
              onClick: handleFileClick,
              onAttachFile,
              onRepeatRequest,
              onDeleteFile: handleDeleteFile,
              onTogglePin: togglePinImage,
              isDeleting,
              attachingFile,
              onLoadingEffect: loadingEffectForAttachFile,
              isPinned: true
            },
            file.id,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 399,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
            lineNumber: 397,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
          lineNumber: 377,
          columnNumber: 29
        }, this),
        unpinnedImages.length > 0 && /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setIsImageExpanded(!isImageExpanded),
              className: "flex w-full items-center justify-between rounded-lg bg-slate-700/0 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors",
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 items-center", children: [
                  /* @__PURE__ */ jsxDEV(ImageIcon, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 432,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F (",
                    unpinnedImages.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 433,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                  lineNumber: 431,
                  columnNumber: 37
                }, this),
                /* @__PURE__ */ jsxDEV(
                  ChevronDown,
                  {
                    className: `h-4 w-4 transition-transform ${isImageExpanded ? "rotate-180" : ""}`
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 438,
                    columnNumber: 37
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 425,
              columnNumber: 33
            },
            this
          ),
          isImageExpanded && /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2 mt-2", children: unpinnedImages.map((file) => /* @__PURE__ */ jsxDEV(
            GalleryFileCard,
            {
              file,
              onClick: handleFileClick,
              onAttachFile,
              onRepeatRequest,
              onDeleteFile: handleDeleteFile,
              onTogglePin: togglePinImage,
              isDeleting,
              attachingFile,
              onLoadingEffect: loadingEffectForAttachFile,
              isPinned: false
            },
            file.id,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 447,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
            lineNumber: 445,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
          lineNumber: 424,
          columnNumber: 29
        }, this),
        videoFiles.length > 0 && /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setIsVideoExpanded(!isVideoExpanded),
              className: "flex w-full items-center justify-between rounded-lg bg-slate-700/0 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors",
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 items-center", children: [
                  /* @__PURE__ */ jsxDEV(VideoIcon, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 480,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0412\u0438\u0434\u0435\u043E (",
                    videoFiles.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 481,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                  lineNumber: 479,
                  columnNumber: 37
                }, this),
                /* @__PURE__ */ jsxDEV(
                  ChevronDown,
                  {
                    className: `h-4 w-4 transition-transform ${isVideoExpanded ? "rotate-180" : ""}`
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 484,
                    columnNumber: 37
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 473,
              columnNumber: 33
            },
            this
          ),
          isVideoExpanded && /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2 mt-2", children: videoFiles.map((file) => /* @__PURE__ */ jsxDEV(
            GalleryFileCard,
            {
              file,
              onClick: handleFileClick,
              onAttachFile,
              onRepeatRequest,
              onDeleteFile: handleDeleteFile,
              isDeleting,
              attachingFile,
              onLoadingEffect: loadingEffectForAttachFile,
              isVideo: true
            },
            file.id,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 493,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
            lineNumber: 491,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
          lineNumber: 472,
          columnNumber: 29
        }, this),
        filesData?.pagination && filesData.pagination.page < filesData.pagination.totalPages && /* @__PURE__ */ jsxDEV(
          "div",
          {
            ref: loadMoreTriggerRef,
            className: "flex h-20 items-center justify-center",
            children: isFetching ? /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-400", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 524,
              columnNumber: 41
            }, this) : /* @__PURE__ */ jsxDEV("div", { className: "h-1 w-1 rounded-full bg-slate-600" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 528,
              columnNumber: 41
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
            lineNumber: 519,
            columnNumber: 33
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 374,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
        lineNumber: 373,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
      lineNumber: 354,
      columnNumber: 13
    }, this),
    selectedFile && /* @__PURE__ */ jsxDEV(Fragment, { children: [
      selectedFile.type === "VIDEO" && /* @__PURE__ */ jsxDEV(
        Dialog,
        {
          open: !!selectedFile,
          onOpenChange: (open) => !open && setSelectedFile(null),
          children: /* @__PURE__ */ jsxDEV(
            DialogContent,
            {
              showCloseButton: false,
              className: "max-h-[95vh] max-w-[95vw] overflow-hidden border-border bg-background p-0",
              children: [
                /* @__PURE__ */ jsxDEV(DialogTitle, { className: "sr-only", children: [
                  "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0432\u0438\u0434\u0435\u043E: ",
                  selectedFile.filename
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                  lineNumber: 551,
                  columnNumber: 33
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
                  /* @__PURE__ */ jsxDEV(
                    "video",
                    {
                      src: getOriginalFileUrl(selectedFile) || "",
                      controls: true,
                      autoPlay: true,
                      className: "max-h-[90vh] w-full"
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                      lineNumber: 555,
                      columnNumber: 37
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV("div", { className: "absolute right-2 top-2 flex gap-2", children: [
                    onRepeatRequest && /* @__PURE__ */ jsxDEV(
                      Button,
                      {
                        size: "icon",
                        variant: "secondary",
                        onClick: (e) => {
                          e.stopPropagation();
                          onRepeatRequest(
                            selectedFile.requestId
                          );
                        },
                        className: "h-9 w-9 text-slate-400 hover:text-primary focus:text-primary",
                        title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441",
                        children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-4 w-4" }, void 0, false, {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                          lineNumber: 578,
                          columnNumber: 49
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                        lineNumber: 566,
                        columnNumber: 45
                      },
                      this
                    ),
                    /* @__PURE__ */ jsxDEV(
                      Button,
                      {
                        size: "icon",
                        variant: "secondary",
                        onClick: () => {
                          const downloadUrl = getOriginalFileUrl(
                            selectedFile
                          );
                          if (!downloadUrl) {
                            console.warn(
                              "[MediaGallery] \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B: \u043D\u0435\u0442 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E URL",
                              selectedFile
                            );
                            return;
                          }
                          downloadFile(
                            downloadUrl,
                            selectedFile.filename
                          );
                        },
                        title: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B",
                        children: /* @__PURE__ */ jsxDEV(Download, { className: "h-4 w-4" }, void 0, false, {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                          lineNumber: 603,
                          columnNumber: 45
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                        lineNumber: 581,
                        columnNumber: 41
                      },
                      this
                    ),
                    /* @__PURE__ */ jsxDEV(
                      Button,
                      {
                        size: "icon",
                        variant: "secondary",
                        onClick: () => setSelectedFile(null),
                        children: /* @__PURE__ */ jsxDEV(X, { className: "h-4 w-4" }, void 0, false, {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                          lineNumber: 612,
                          columnNumber: 45
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                        lineNumber: 605,
                        columnNumber: 41
                      },
                      this
                    )
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                    lineNumber: 564,
                    columnNumber: 37
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
                  lineNumber: 554,
                  columnNumber: 33
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
              lineNumber: 547,
              columnNumber: 29
            },
            this
          )
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
          lineNumber: 541,
          columnNumber: 25
        },
        this
      ),
      selectedFile.type !== "VIDEO" && /* @__PURE__ */ jsxDEV(
        MediaFullscreenView,
        {
          file: selectedFile,
          onClose: () => setSelectedFile(null),
          onAttachFile,
          onRepeatRequest,
          isPinned: pinnedImageIds.has(selectedFile.id),
          onTogglePin: () => togglePinImage(selectedFile.id)
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
          lineNumber: 621,
          columnNumber: 25
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
      lineNumber: 538,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/components/media/media-gallery.tsx",
    lineNumber: 353,
    columnNumber: 9
  }, this);
}
const $$splitComponentImporter$1 = () => import('./_chatId-CiRaUhI_.mjs');
const Route$1 = createFileRoute("/media/$chatId")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
function MediaChatPage({
  appMode,
  routeBase
}) {
  const params = useParams({
    strict: false
  });
  const chatId = String(params.chatId ?? "");
  const chatIdNum = parseInt(chatId);
  const {
    data: chat,
    isLoading: isChatLoading,
    isFetching: isChatFetching,
    error: chatError,
    refetch
  } = useGetChatQuery({
    id: chatIdNum,
    limit: 10,
    appMode
  }, {
    // Всегда обновлять при монтировании или изменении аргументов
    refetchOnMountOrArgChange: true,
    skip: false
  });
  useEffect(() => {
    console.log("[Chat] \u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438:", {
      chatId: chatIdNum,
      isChatLoading,
      isChatFetching,
      hasChat: !!chat,
      requestsCount: chat?.requests?.length || 0,
      error: chatError
    });
  }, [chatIdNum, isChatLoading, isChatFetching, chat, chatError]);
  useEffect(() => {
    setPendingMessage(null);
    isInitialLoadRef.current = true;
  }, [chatIdNum]);
  const [updateChat] = useUpdateChatMutation();
  const [generateMedia] = useGenerateMediaMutation();
  const [getRequestTrigger] = useLazyGetRequestQuery();
  useTestMode();
  const [currentModel, setCurrentModel] = useState("NANO_BANANA_PRO_KIEAI");
  const [pendingMessage, setPendingMessage] = useState(null);
  const chatInputRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollToBottomRef = useRef(null);
  const {
    data: models
  } = useGetModelsQuery({
    appMode
  });
  useEffect(() => {
    if (!chat || chat.id !== chatIdNum) return;
    if (isInitialLoadRef.current) {
      setCurrentModel(chat.model);
      isInitialLoadRef.current = false;
    }
  }, [chat, chatIdNum]);
  async function handleModelChange(model) {
    if (model === currentModel) return;
    const previousModel = currentModel;
    setCurrentModel(model);
    const activeChatForUpdate = chat;
    if (activeChatForUpdate) {
      try {
        await updateChat({
          id: activeChatForUpdate.id,
          model
        }).unwrap();
      } catch (error) {
        setCurrentModel(previousModel);
        const errorMessage = error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object" && "error" in error.data && typeof error.data.error === "string" ? error.data.error : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437.";
        alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043C\u043E\u0434\u0435\u043B\u0438: ${errorMessage}`);
        console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043C\u043E\u0434\u0435\u043B\u0438:", error);
      }
    }
  }
  function handleAddPendingMessage(prompt) {
    const pending = {
      id: `pending-${Date.now()}`,
      prompt,
      model: currentModel,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "PENDING"
    };
    setPendingMessage(pending);
    console.log("[Chat] \u23F3 \u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E pending-\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435:", pending.id);
  }
  function handleSendError(errorMessage) {
    setPendingMessage((prev) => {
      if (!prev) return null;
      console.log("[Chat] \u274C Pending-\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043F\u043E\u043C\u0435\u0447\u0435\u043D\u043E \u043A\u0430\u043A FAILED");
      return {
        ...prev,
        status: "FAILED",
        errorMessage
      };
    });
  }
  function handleRequestCreated(requestId) {
    console.log("[Chat] \u2705 \u041D\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0441\u043E\u0437\u0434\u0430\u043D, SSE \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043E\u0431\u043D\u043E\u0432\u0438\u0442 UI:", {
      requestId
    });
    setPendingMessage((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        requestId
      };
    });
    refetch().catch((error) => {
      console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u0447\u0430\u0442\u0430:", error);
    });
  }
  useEffect(() => {
    if (appMode !== APP_MODES.AI_MODEL || !chatIdNum) return;
    const eventSource2 = new EventSource(`${API_BASE_URL}/sse/public?chatId=${chatIdNum}&appMode=${APP_MODES.AI_MODEL}`);
    eventSource2.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "REQUEST_COMPLETED" || payload.type === "REQUEST_FAILED") {
          refetch().catch(() => {
          });
        }
      } catch {
      }
    };
    eventSource2.onerror = () => {
      eventSource2.close();
    };
    return () => eventSource2.close();
  }, [appMode, chatIdNum, refetch]);
  const activeRequests = useMemo(() => chat && chat.id === chatIdNum ? chat.requests || [] : [], [chat, chatIdNum]);
  useEffect(() => {
    if (!pendingMessage?.requestId) return;
    const requestAppeared = activeRequests.some((r) => r.id === pendingMessage.requestId);
    if (requestAppeared) {
      console.log("[Chat] \u{1F504} \u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0430\u0439\u0434\u0435\u043D, \u0443\u0431\u0438\u0440\u0430\u0435\u043C pending-\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435");
      setPendingMessage(null);
    }
  }, [activeRequests, pendingMessage]);
  if (isChatLoading && !chat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full min-h-0 min-w-0 w-full bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 228,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-0 min-w-0 flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 230,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 229,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 227,
      columnNumber: 12
    }, this);
  }
  if (chatError && !chat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full min-h-0 min-w-0 w-full bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 238,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-destructive", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0447\u0430\u0442\u0430" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
          lineNumber: 240,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground mt-2", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0447\u0430\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C." }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
          lineNumber: 243,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 239,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 237,
      columnNumber: 12
    }, this);
  }
  if (!chat && !isChatLoading && !chatError) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full min-h-0 min-w-0 w-full bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 254,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-muted-foreground", children: "\u0427\u0430\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
          lineNumber: 256,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0447\u0430\u0442 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
          lineNumber: 259,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 255,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 253,
      columnNumber: 12
    }, this);
  }
  const activeChat = chat && chat.id === chatIdNum ? chat : null;
  if (!activeChat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full min-h-0 min-w-0 w-full bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 274,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-0 min-w-0 flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 276,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 275,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 273,
      columnNumber: 12
    }, this);
  }
  const sortedRequests = [...activeChat.requests || []].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const requests = sortedRequests;
  const hasPendingInList = pendingMessage && !requests.some((r) => pendingMessage.requestId ? r.id === pendingMessage.requestId : false);
  const pendingAsRequest = hasPendingInList && pendingMessage ? {
    id: -1,
    // Временный ID
    chatId: chatIdNum,
    prompt: pendingMessage.prompt,
    model: pendingMessage.model,
    status: pendingMessage.status,
    inputFiles: [],
    errorMessage: pendingMessage.errorMessage || null,
    createdAt: pendingMessage.createdAt,
    completedAt: null,
    seed: null,
    files: []
  } : null;
  const finalRequests = pendingAsRequest ? [...sortedRequests, pendingAsRequest] : sortedRequests;
  function handleEditPrompt(prompt) {
    chatInputRef.current?.setPrompt(prompt);
  }
  async function handleAttachFile(fileUrl, filename, imgbbUrl) {
    try {
      await chatInputRef.current?.addFileFromUrl(fileUrl, filename, imgbbUrl);
    } catch (error) {
      console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430:", error);
      const errorMessage = error instanceof Error ? error.message : "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430";
      alert(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u0430: ${errorMessage}`);
    }
  }
  async function handleRepeatRequest(request, model) {
    const selectedModel = model || request.model;
    if (selectedModel && selectedModel !== currentModel) {
      handleModelChange(selectedModel);
    }
    if (chatInputRef.current) {
      await chatInputRef.current.setRequestData(request);
      const inputElement = document.getElementById("chat-input");
      if (inputElement) {
        inputElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        });
      }
    }
  }
  async function handleRepeatRequestById(requestId) {
    try {
      const request = await getRequestTrigger({
        id: requestId,
        appMode
      }).unwrap();
      if (request) {
        await handleRepeatRequest(request);
      }
    } catch (error) {
      console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u0440\u043E\u0441\u0430:", error);
      alert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043B\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F");
    }
  }
  const showUpdatingIndicator = isChatFetching && !isChatLoading;
  return /* @__PURE__ */ jsxDEV("div", { className: cn("flex h-full min-h-0 min-w-0 w-full bg-background", appMode === APP_MODES.AI_MODEL && "ai-model-theme"), children: [
    /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 370,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "relative flex min-h-0 min-w-0 flex-1 flex-col", children: [
      /* @__PURE__ */ jsxDEV(ChatHeader, { name: activeChat.name, model: currentModel, showUpdating: showUpdatingIndicator, appMode }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 375,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageList, { requests: finalRequests, chatModel: currentModel, onEditPrompt: handleEditPrompt, onAttachFile: handleAttachFile, onRepeatRequest: handleRepeatRequest, onScrollStateChange: setShowScrollButton, onScrollToBottomRef: (scrollFn) => {
        scrollToBottomRef.current = scrollFn;
      }, appMode }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 378,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(ChatInput, { ref: chatInputRef, chatId: chatIdNum, currentModel, onModelChange: handleModelChange, onRequestCreated: handleRequestCreated, onPendingMessage: handleAddPendingMessage, onSendError: handleSendError, scrollToBottom: () => scrollToBottomRef.current?.(), showScrollButton, appMode }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 383,
        columnNumber: 17
      }, this)
    ] }, chatIdNum, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 373,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(MediaGallery, { chatId: chatIdNum, onAttachFile: handleAttachFile, onRepeatRequest: handleRepeatRequestById, appMode }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 387,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
    lineNumber: 368,
    columnNumber: 10
  }, this);
}
function ChatHeader({
  name,
  model,
  showUpdating,
  appMode
}) {
  const {
    data: models
  } = useGetModelsQuery({
    appMode
  });
  const modelInfo = models?.find((m) => m.key === model);
  return /* @__PURE__ */ jsxDEV("div", { className: cn(PANEL_HEADER_CLASSES, "bg-background"), children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsxDEV("span", { className: "text-2xl", children: getModelIcon(model) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 410,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("h1", { className: "font-semibold text-foreground", children: name }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
          lineNumber: 413,
          columnNumber: 25
        }, this),
        showUpdating && /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin text-muted-foreground" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
          lineNumber: 416,
          columnNumber: 42
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 412,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-muted-foreground", children: modelInfo?.name || model }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
        lineNumber: 418,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
      lineNumber: 411,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
    lineNumber: 409,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/media/$chatId.tsx",
    lineNumber: 408,
    columnNumber: 10
  }, this);
}
const $$splitComponentImporter = () => import('./_chatId-BtBnxoMp.mjs');
const Route = createFileRoute("/ai-model/$chatId")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const RegisterRoute = Route$6.update({
  id: "/register",
  path: "/register",
  getParentRoute: () => Route$7
});
const LoginRoute = Route$5.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$7
});
const IndexRoute = Route$4.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$7
});
const MediaIndexRoute = Route$3.update({
  id: "/media/",
  path: "/media/",
  getParentRoute: () => Route$7
});
const AiModelIndexRoute = Route$2.update({
  id: "/ai-model/",
  path: "/ai-model/",
  getParentRoute: () => Route$7
});
const MediaChatIdRoute = Route$1.update({
  id: "/media/$chatId",
  path: "/media/$chatId",
  getParentRoute: () => Route$7
});
const AiModelChatIdRoute = Route.update({
  id: "/ai-model/$chatId",
  path: "/ai-model/$chatId",
  getParentRoute: () => Route$7
});
const rootRouteChildren = {
  IndexRoute,
  LoginRoute,
  RegisterRoute,
  AiModelChatIdRoute,
  MediaChatIdRoute,
  AiModelIndexRoute,
  MediaIndexRoute
};
const routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const router2 = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));

export { APP_MODES as A, ChatSidebar as C, MessageList as M, PANEL_HEADER_CLASSES as P, useCreateChatMutation as a, useGetChatQuery as b, useUpdateChatMutation as c, useGenerateMediaMutation as d, useLazyGetRequestQuery as e, useTestMode as f, useGetModelsQuery as g, API_BASE_URL as h, cn as i, ChatInput as j, MediaGallery as k, getModelIcon as l, MediaChatPage as m, router as r, useGetChatsQuery as u };
//# sourceMappingURL=router-BDDdWGGd.mjs.map
