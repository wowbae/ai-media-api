import { createRouter, createRootRoute, createFileRoute, lazyRouteComponent, HeadContent, Scripts, useNavigate, Link } from '@tanstack/react-router';
import { jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setupListeners } from '@reduxjs/toolkit/query';
import { Coins } from 'lucide-react';
import { useState } from 'react';

const appCss = "/assets/styles-cUhZYHd5.css";
const dataAPI = createApi({
  reducerPath: "userAPI",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:4000/",
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    }
  }),
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["User"],
  endpoints: (build) => ({
    getData: build.query({
      query: (path) => {
        return {
          url: `${path}`,
          method: "GET"
        };
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
      },
      providesTags: ["User"]
    }),
    postData: build.mutation({
      query: (data) => ({
        url: `${data.path}`,
        method: "POST",
        body: data.body
      }),
      invalidatesTags: ["User"]
    })
  })
});
const { useGetDataQuery, usePostDataMutation } = dataAPI;
const API_BASE_URL = "http://localhost:4000/api/media";
const baseApi = createApi({
  reducerPath: "mediaApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    }
  }),
  tagTypes: ["Chat", "Request", "File", "Model"],
  // Настройки для оптимистичного обновления
  keepUnusedDataFor: 60,
  // Хранить неиспользуемые данные 60 секунд
  // Показывать кешированные данные сразу, обновлять в фоне если старше 10 секунд
  refetchOnMountOrArgChange: 10,
  refetchOnFocus: true,
  // Обновлять при фокусе окна для актуальности данных
  refetchOnReconnect: true,
  // Обновлять при восстановлении соединения
  endpoints: () => ({})
});
const initialState = {
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token")
};
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, { payload: { user, token } }) => {
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
const store = configureStore({
  reducer: {
    [dataAPI.reducerPath]: dataAPI.reducer,
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(dataAPI.middleware).concat(baseApi.middleware)
});
setupListeners(store.dispatch);
const authEndpoints = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (credentials) => ({
        url: "../auth/login",
        method: "POST",
        body: credentials
      })
    }),
    register: build.mutation({
      query: (credentials) => ({
        url: "../auth/register",
        method: "POST",
        body: credentials
      })
    }),
    getMe: build.query({
      query: () => "../auth/me"
    })
  })
});
const { useLoginMutation, useRegisterMutation, useGetMeQuery } = authEndpoints;
const TokenBalance = () => {
  const user = useSelector(selectCurrentUser);
  const { data: me } = useGetMeQuery(void 0, { pollingInterval: 3e4, skip: !user });
  const balance = me?.balance ?? user?.balance ?? 0;
  if (!user) return null;
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700", children: [
    /* @__PURE__ */ jsxDEV(Coins, { className: "w-4 h-4 text-yellow-500" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/TokenBalance.tsx",
      lineNumber: 20,
      columnNumber: 13
    }, void 0),
    /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-medium text-white", children: balance }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/TokenBalance.tsx",
      lineNumber: 21,
      columnNumber: 13
    }, void 0)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/TokenBalance.tsx",
    lineNumber: 19,
    columnNumber: 9
  }, void 0);
};
const Header = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const handleLogout = () => {
    dispatch(logout());
    window.location.href = "/login";
  };
  return /* @__PURE__ */ jsxDEV("header", { className: "sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60", children: /* @__PURE__ */ jsxDEV("div", { className: "container flex h-14 max-w-screen-2xl items-center", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "mr-4 hidden md:flex", children: /* @__PURE__ */ jsxDEV(Link, { to: "/", className: "mr-6 flex items-center space-x-2", children: /* @__PURE__ */ jsxDEV("span", { className: "hidden font-bold text-white sm:inline-block", children: "AI Media" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
      lineNumber: 22,
      columnNumber: 26
    }, void 0) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
      lineNumber: 21,
      columnNumber: 21
    }, void 0) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
      lineNumber: 20,
      columnNumber: 17
    }, void 0),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 items-center justify-between space-x-2 md:justify-end", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-full flex-1 md:w-auto md:flex-none" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
        lineNumber: 26,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("nav", { className: "flex items-center gap-2", children: isAuthenticated ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV(TokenBalance, {}, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
          lineNumber: 32,
          columnNumber: 33
        }, void 0),
        /* @__PURE__ */ jsxDEV(Link, { to: "/media", className: "text-sm font-medium text-white hover:text-cyan-400 px-3", children: "Generate" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
          lineNumber: 33,
          columnNumber: 33
        }, void 0),
        /* @__PURE__ */ jsxDEV("button", { onClick: handleLogout, className: "text-sm font-medium text-gray-400 hover:text-white px-3", children: "Logout" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
          lineNumber: 36,
          columnNumber: 33
        }, void 0)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
        lineNumber: 31,
        columnNumber: 29
      }, void 0) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV(Link, { to: "/login", className: "text-sm font-medium text-white hover:text-cyan-400 px-3", children: "Login" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
          lineNumber: 42,
          columnNumber: 33
        }, void 0),
        /* @__PURE__ */ jsxDEV(Link, { to: "/register", className: "text-sm font-medium text-white hover:text-cyan-400 px-3", children: "Register" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
          lineNumber: 45,
          columnNumber: 33
        }, void 0)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
        lineNumber: 41,
        columnNumber: 29
      }, void 0) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
        lineNumber: 29,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
      lineNumber: 25,
      columnNumber: 17
    }, void 0)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
    lineNumber: 19,
    columnNumber: 13
  }, void 0) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/Header.tsx",
    lineNumber: 18,
    columnNumber: 9
  }, void 0);
};
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
                            var theme = localStorage.getItem('theme');
                            if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                document.documentElement.classList.add('dark');
                            }
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
  return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white", children: [
    /* @__PURE__ */ jsxDEV("h1", { className: "text-6xl font-bold mb-4", children: "404" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 53,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-gray-400 mb-8", children: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 54,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(
      "a",
      {
        href: "/",
        className: "px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors",
        children: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E"
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
        lineNumber: 55,
        columnNumber: 13
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
    lineNumber: 52,
    columnNumber: 9
  }, this);
}
function RootDocument({ children }) {
  return /* @__PURE__ */ jsxDEV(Provider, { store, children: /* @__PURE__ */ jsxDEV("html", { lang: "en", suppressHydrationWarning: true, children: [
    /* @__PURE__ */ jsxDEV("head", { children: /* @__PURE__ */ jsxDEV(HeadContent, {}, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 70,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 69,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("body", { suppressHydrationWarning: true, children: [
      /* @__PURE__ */ jsxDEV(Header, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
        lineNumber: 73,
        columnNumber: 21
      }, this),
      children,
      /* @__PURE__ */ jsxDEV(Scripts, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
        lineNumber: 86,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
      lineNumber: 72,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
    lineNumber: 68,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/__root.tsx",
    lineNumber: 67,
    columnNumber: 9
  }, this);
}
const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [register, { isLoading, error }] = useRegisterMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    try {
      const { token, user } = await register({ email, password }).unwrap();
      dispatch(setCredentials({ token, user }));
      navigate({ to: "/" });
    } catch (err) {
      console.error("Registration failed", err);
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-screen items-center justify-center bg-gray-900 text-white", children: /* @__PURE__ */ jsxDEV("div", { className: "w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg", children: [
    /* @__PURE__ */ jsxDEV("h2", { className: "text-2xl font-bold mb-6 text-center", children: "Register" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
      lineNumber: 36,
      columnNumber: 17
    }, void 0),
    /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-1", children: "Email" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
          lineNumber: 39,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            className: "w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 40,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 38,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-1", children: "Password" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
          lineNumber: 49,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            className: "w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 50,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 48,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-1", children: "Confirm Password" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
          lineNumber: 59,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "password",
            value: confirmPassword,
            onChange: (e) => setConfirmPassword(e.target.value),
            className: "w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
            lineNumber: 60,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 58,
        columnNumber: 21
      }, void 0),
      error && /* @__PURE__ */ jsxDEV("div", { className: "text-red-500 text-sm text-center", children: "Registration failed. Please try again." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 69,
        columnNumber: 25
      }, void 0),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "submit",
          disabled: isLoading,
          className: "w-full py-2 px-4 bg-green-600 hover:bg-green-700 rounded font-medium disabled:opacity-50",
          children: isLoading ? "Registering..." : "Register"
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
          lineNumber: 73,
          columnNumber: 21
        },
        void 0
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center text-sm mt-4", children: [
        "Already have an account?",
        " ",
        /* @__PURE__ */ jsxDEV(Link, { to: "/login", className: "text-blue-400 hover:underline", children: "Login" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
          lineNumber: 82,
          columnNumber: 25
        }, void 0)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
        lineNumber: 80,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
      lineNumber: 37,
      columnNumber: 17
    }, void 0)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
    lineNumber: 35,
    columnNumber: 13
  }, void 0) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/register.tsx",
    lineNumber: 34,
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
      navigate({ to: "/" });
    } catch (err) {
      console.error("Login failed", err);
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "flex min-h-screen items-center justify-center bg-gray-900 text-white", children: /* @__PURE__ */ jsxDEV("div", { className: "w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg", children: [
    /* @__PURE__ */ jsxDEV("h2", { className: "text-2xl font-bold mb-6 text-center", children: "Login" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
      lineNumber: 28,
      columnNumber: 17
    }, void 0),
    /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-1", children: "Email" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
          lineNumber: 31,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            className: "w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
            lineNumber: 32,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 30,
        columnNumber: 21
      }, void 0),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-sm font-medium mb-1", children: "Password" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
          lineNumber: 41,
          columnNumber: 25
        }, void 0),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            className: "w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500",
            required: true
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
            lineNumber: 42,
            columnNumber: 25
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 40,
        columnNumber: 21
      }, void 0),
      error && /* @__PURE__ */ jsxDEV("div", { className: "text-red-500 text-sm text-center", children: "Login failed. Please check credentials." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 51,
        columnNumber: 25
      }, void 0),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "submit",
          disabled: isLoading,
          className: "w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50",
          children: isLoading ? "Logging in..." : "Login"
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
          lineNumber: 55,
          columnNumber: 21
        },
        void 0
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center text-sm mt-4", children: [
        "Don't have an account?",
        " ",
        /* @__PURE__ */ jsxDEV(Link, { to: "/register", className: "text-blue-400 hover:underline", children: "Register" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
          lineNumber: 64,
          columnNumber: 25
        }, void 0)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
        lineNumber: 62,
        columnNumber: 21
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
      lineNumber: 29,
      columnNumber: 17
    }, void 0)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
    lineNumber: 27,
    columnNumber: 13
  }, void 0) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/login.tsx",
    lineNumber: 26,
    columnNumber: 9
  }, void 0);
};
const Route$3 = createFileRoute("/login")({
  component: Login
});
const $$splitComponentImporter$2 = () => import('./index-CCvDusVv.mjs');
const Route$2 = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import('./index-VU-lT-Ng.mjs');
const Route$1 = createFileRoute("/media/")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import('./_chatId-kac774j7.mjs');
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

export { Route as R, useGetChatsQuery as a, useCreateChatMutation as b, useDeleteFileMutation as c, useUploadThumbnailMutation as d, useGetModelsQuery as e, useGetFilesQuery as f, useGetChatQuery as g, useUpdateChatMutation as h, useGenerateMediaMutation as i, useLazyGetRequestQuery as j, useGetRequestQuery as k, useDeleteChatMutation as l, useUploadToImgbbMutation as m, useUploadUserMediaMutation as n, useGenerateMediaTestMutation as o, router as r, usePostDataMutation as u };
//# sourceMappingURL=router-ZQUnxrzB.mjs.map
