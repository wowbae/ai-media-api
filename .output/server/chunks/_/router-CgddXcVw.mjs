import { createRouter, createRootRoute, createFileRoute, lazyRouteComponent, useLocation, HeadContent, Scripts, useNavigate, Link } from '@tanstack/react-router';
import { jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useState, useEffect, useRef } from 'react';
import { Loader2, UserPlus, LogIn, LinkIcon, Zap, RefreshCw } from 'lucide-react';

const appCss = "/assets/styles-zzK5DvDm.css";
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
  refetchOnMountOrArgChange: 10,
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
    // Получить все чаты
    getChats: build.query({
      query: () => "/chats",
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
      query: ({ id, limit, includeInputFiles }) => {
        const url = `/chats/${id}`;
        const params = new URLSearchParams();
        if (limit !== void 0)
          params.append("limit", limit.toString());
        if (includeInputFiles)
          params.append("includeInputFiles", "true");
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
      query: (id) => `/requests/${id}`,
      transformResponse: (response) => {
        console.log("[RTK Query] getRequest response:", {
          id: response.data.id,
          status: response.data.status,
          filesCount: response.data.files.length,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        return response.data;
      },
      providesTags: (result, _error, id) => [
        { type: "Request", id },
        ...result?.files.map((f) => ({
          type: "File",
          id: f.id
        })) || []
      ]
    }),
    // ==================== Файлы ====================
    // Получить все файлы
    getFiles: build.query({
      query: ({ page = 1, limit = 20, chatId }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (chatId !== void 0) {
          params.append("chatId", chatId.toString());
        }
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
              requestId,
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
  useUploadUserMediaMutation
} = mediaEndpoints;
const modelsEndpoints = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Получить доступные модели
    getModels: build.query({
      query: () => "/models",
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
const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware)
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/KieCredits.tsx",
          lineNumber: 22,
          columnNumber: 13
        }, this),
        isLoading ? /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-slate-400", children: "\u2014" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/KieCredits.tsx",
          lineNumber: 24,
          columnNumber: 17
        }, this) : isError ? /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-red-400", title: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438", children: "\u2014" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/KieCredits.tsx",
          lineNumber: 26,
          columnNumber: 17
        }, this) : /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-medium text-white", children: credits ?? 0 }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/KieCredits.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/KieCredits.tsx",
              lineNumber: 38,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/KieCredits.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/KieCredits.tsx",
      lineNumber: 18,
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
const Header = () => {
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
  return /* @__PURE__ */ jsxDEV("header", { className: "fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60", children: /* @__PURE__ */ jsxDEV("div", { className: "flex h-14 w-full items-center justify-between px-4", children: [
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
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
        lineNumber: 49,
        columnNumber: 21
      },
      void 0
    ) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
      lineNumber: 48,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
              lineNumber: 62,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
              lineNumber: 68,
              columnNumber: 29
            },
            void 0
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
          lineNumber: 61,
          columnNumber: 25
        }, void 0) : isAuthenticated ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
          /* @__PURE__ */ jsxDEV(KieCredits, {}, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
            lineNumber: 77,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
              lineNumber: 79,
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
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
                  lineNumber: 91,
                  columnNumber: 33
                }, void 0),
                /* @__PURE__ */ jsxDEV("span", { className: "hidden sm:inline", children: "Telegram" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
                  lineNumber: 92,
                  columnNumber: 33
                }, void 0)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
              lineNumber: 86,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
              lineNumber: 96,
              columnNumber: 29
            },
            void 0
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
          lineNumber: 76,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
              lineNumber: 105,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
              lineNumber: 111,
              columnNumber: 29
            },
            void 0
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
          lineNumber: 104,
          columnNumber: 25
        }, void 0)
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
        lineNumber: 55,
        columnNumber: 17
      },
      void 0
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
    lineNumber: 47,
    columnNumber: 13
  }, void 0) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
    lineNumber: 46,
    columnNumber: 9
  }, void 0);
};
function useSSESubscription() {
  const dispatch = useDispatch();
  const eventSourceRef = useRef(null);
  useRef(null);
  useEffect(() => {
    {
      return;
    }
  }, [dispatch]);
  return {
    isConnected: false,
    readyState: eventSourceRef.current?.readyState
  };
}
function AuthInitializer() {
  const dispatch = useDispatch();
  const location = useLocation();
  const hasCheckedRef = useRef(false);
  const token = null;
  useSSESubscription();
  const isPublicRoute = location.pathname === "/login" || location.pathname === "/register";
  const { data: user, isSuccess, error } = useGetMeQuery(void 0, {
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
const Route$5 = createRootRoute({
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 54,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-muted-foreground mb-8", children: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 55,
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
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
        lineNumber: 56,
        columnNumber: 13
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
    lineNumber: 53,
    columnNumber: 9
  }, this);
}
function RootDocument({ children }) {
  useTheme();
  const location = useLocation();
  const shouldShowHeader = !location.pathname.startsWith("/login") && !location.pathname.startsWith("/register");
  return /* @__PURE__ */ jsxDEV(Provider, { store, children: /* @__PURE__ */ jsxDEV("html", { lang: "en", suppressHydrationWarning: true, children: [
    /* @__PURE__ */ jsxDEV("head", { children: /* @__PURE__ */ jsxDEV(HeadContent, {}, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 78,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 77,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("body", { suppressHydrationWarning: true, children: [
      /* @__PURE__ */ jsxDEV(AuthInitializer, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
        lineNumber: 81,
        columnNumber: 21
      }, this),
      shouldShowHeader && /* @__PURE__ */ jsxDEV(Header, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
        lineNumber: 82,
        columnNumber: 42
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: shouldShowHeader ? "pt-14" : "", children }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
        lineNumber: 83,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(Scripts, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
        lineNumber: 97,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 80,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
    lineNumber: 76,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
    lineNumber: 75,
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
          lineNumber: 40,
          columnNumber: 25
        },
        void 0
      ) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 39,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold text-white mb-2", children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 46,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("p", { className: "text-slate-400", children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0434\u043B\u044F \u043D\u0430\u0447\u0430\u043B\u0430 \u0440\u0430\u0431\u043E\u0442\u044B" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 49,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
      lineNumber: 38,
      columnNumber: 17
    }, void 0),
    /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "Email" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 58,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 54,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 71,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 67,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 84,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 80,
        columnNumber: 21
      }, void 0),
      passwordError && /* @__PURE__ */ jsxDEV("div", { className: "rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center", children: passwordError }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 94,
        columnNumber: 25
      }, void 0),
      error && /* @__PURE__ */ jsxDEV("div", { className: "rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
              lineNumber: 110,
              columnNumber: 33
            }, void 0),
            "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F..."
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 109,
            columnNumber: 29
          }, void 0) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(UserPlus, { className: "h-5 w-5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
              lineNumber: 115,
              columnNumber: 33
            }, void 0),
            "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F"
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 114,
            columnNumber: 29
          }, void 0)
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
          lineNumber: 103,
          columnNumber: 21
        },
        void 0
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center text-sm mt-6", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-slate-400", children: "\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442? " }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 122,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 120,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
      lineNumber: 53,
      columnNumber: 17
    }, void 0)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
    lineNumber: 37,
    columnNumber: 13
  }, void 0) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
    lineNumber: 36,
    columnNumber: 9
  }, void 0);
};
const Route$4 = createFileRoute("/register")({
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
          lineNumber: 31,
          columnNumber: 25
        },
        void 0
      ) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 30,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-bold text-white mb-2", children: "\u0412\u0445\u043E\u0434" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 37,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("p", { className: "text-slate-400", children: "\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 \u0441\u0432\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 38,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
      lineNumber: 29,
      columnNumber: 17
    }, void 0),
    /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "Email" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
            lineNumber: 45,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 41,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-2 text-white", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
            lineNumber: 58,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 54,
        columnNumber: 21
      }, void 0),
      error && /* @__PURE__ */ jsxDEV("div", { className: "rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-sm text-center", children: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 email \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
              lineNumber: 79,
              columnNumber: 33
            }, void 0),
            "\u0412\u0445\u043E\u0434..."
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
            lineNumber: 78,
            columnNumber: 29
          }, void 0) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(LogIn, { className: "h-5 w-5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
              lineNumber: 84,
              columnNumber: 33
            }, void 0),
            "\u0412\u043E\u0439\u0442\u0438"
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
            lineNumber: 83,
            columnNumber: 29
          }, void 0)
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
          lineNumber: 72,
          columnNumber: 21
        },
        void 0
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center text-sm mt-6", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-slate-400", children: "\u041D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430? " }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
            lineNumber: 91,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 89,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
      lineNumber: 40,
      columnNumber: 17
    }, void 0)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
    lineNumber: 28,
    columnNumber: 13
  }, void 0) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
    lineNumber: 27,
    columnNumber: 9
  }, void 0);
};
const Route$3 = createFileRoute("/login")({
  component: Login
});
const $$splitComponentImporter$2 = () => import('./index-vRGhebwl.mjs');
const Route$2 = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import('./index-DtHH9iF7.mjs');
const Route$1 = createFileRoute("/media/")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import('./_chatId-DkEsJPvp.mjs');
const Route = createFileRoute("/media/$chatId")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const RegisterRoute = Route$4.update({
  id: "/register",
  path: "/register",
  getParentRoute: () => Route$5
});
const LoginRoute = Route$3.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$5
});
const IndexRoute = Route$2.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$5
});
const MediaIndexRoute = Route$1.update({
  id: "/media/",
  path: "/media/",
  getParentRoute: () => Route$5
});
const MediaChatIdRoute = Route.update({
  id: "/media/$chatId",
  path: "/media/$chatId",
  getParentRoute: () => Route$5
});
const rootRouteChildren = {
  IndexRoute,
  LoginRoute,
  RegisterRoute,
  MediaChatIdRoute,
  MediaIndexRoute
};
const routeTree = Route$5._addFileChildren(rootRouteChildren)._addFileTypes();
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

export { Route as R, useCreateChatMutation as a, useDeleteFileMutation as b, useUploadThumbnailMutation as c, useGetModelsQuery as d, useGetFilesQuery as e, useGetChatQuery as f, useGetPricingQuery as g, useUpdateChatMutation as h, useGenerateMediaMutation as i, useLazyGetRequestQuery as j, useDeleteChatMutation as k, useUploadToImgbbMutation as l, useUploadUserMediaMutation as m, handleSessionTimeout as n, useGenerateMediaTestMutation as o, router as r, useGetChatsQuery as u };
//# sourceMappingURL=router-CgddXcVw.mjs.map
