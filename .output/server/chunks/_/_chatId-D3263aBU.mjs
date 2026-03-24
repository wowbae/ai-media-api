import { jsxDEV } from 'react/jsx-dev-runtime';
import { useParams } from '@tanstack/react-router';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { b as useGetChatQuery, c as useUpdateChatMutation, d as useGenerateMediaMutation, e as useLazyGetRequestQuery, f as useTestMode, g as useGetModelsQuery, A as APP_MODES, h as API_BASE_URL, C as ChatSidebar, i as cn, M as MessageList, j as ChatInput, k as MediaGallery, l as getModelIcon, P as PANEL_HEADER_CLASSES } from './router-v613AfRH.mjs';
import 'react-redux';
import '@reduxjs/toolkit';
import '@reduxjs/toolkit/query/react';
import '@reduxjs/toolkit/query';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import '@radix-ui/react-scroll-area';
import '@radix-ui/react-dropdown-menu';
import '@radix-ui/react-dialog';
import '@radix-ui/react-select';

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
    const eventSource = new EventSource(`${API_BASE_URL}/sse/public?chatId=${chatIdNum}&appMode=${APP_MODES.AI_MODEL}`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "REQUEST_COMPLETED" || payload.type === "REQUEST_FAILED") {
          refetch().catch(() => {
          });
        }
      } catch {
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => eventSource.close();
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
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 222,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 224,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 223,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 221,
      columnNumber: 12
    }, this);
  }
  if (chatError && !chat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 232,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-destructive", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0447\u0430\u0442\u0430" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 234,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground mt-2", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0447\u0430\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C." }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 237,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 233,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 231,
      columnNumber: 12
    }, this);
  }
  if (!chat && !isChatLoading && !chatError) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 248,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-muted-foreground", children: "\u0427\u0430\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 250,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0447\u0430\u0442 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 253,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 249,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 247,
      columnNumber: 12
    }, this);
  }
  const activeChat = chat && chat.id === chatIdNum ? chat : null;
  if (!activeChat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 268,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 270,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 269,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 267,
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
          behavior: "smooth"
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
  return /* @__PURE__ */ jsxDEV("div", { className: cn("flex h-[calc(100vh-3.5rem)] bg-background", appMode === APP_MODES.AI_MODEL && "ai-model-theme"), children: [
    /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode, routeBase }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 362,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "relative flex flex-1 flex-col", children: [
      /* @__PURE__ */ jsxDEV(ChatHeader, { name: activeChat.name, model: currentModel, showUpdating: showUpdatingIndicator, appMode }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 367,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageList, { requests: finalRequests, chatModel: currentModel, onEditPrompt: handleEditPrompt, onAttachFile: handleAttachFile, onRepeatRequest: handleRepeatRequest, onScrollStateChange: setShowScrollButton, onScrollToBottomRef: (scrollFn) => {
        scrollToBottomRef.current = scrollFn;
      }, appMode }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 370,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(ChatInput, { ref: chatInputRef, chatId: chatIdNum, currentModel, onModelChange: handleModelChange, onRequestCreated: handleRequestCreated, onPendingMessage: handleAddPendingMessage, onSendError: handleSendError, scrollToBottom: () => scrollToBottomRef.current?.(), showScrollButton, appMode }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 375,
        columnNumber: 17
      }, this)
    ] }, chatIdNum, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 365,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(MediaGallery, { chatId: chatIdNum, onAttachFile: handleAttachFile, onRepeatRequest: handleRepeatRequestById, appMode }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 379,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 360,
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 402,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("h1", { className: "font-semibold text-foreground", children: name }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 405,
          columnNumber: 25
        }, this),
        showUpdating && /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin text-muted-foreground" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 408,
          columnNumber: 42
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 404,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-muted-foreground", children: modelInfo?.name || model }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 410,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 403,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 401,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 400,
    columnNumber: 10
  }, this);
}
const SplitComponent = () => /* @__PURE__ */ jsxDEV(MediaChatPage, { appMode: APP_MODES.DEFAULT, routeBase: "/media" }, void 0, false, {
  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
  lineNumber: 417,
  columnNumber: 30
}, void 0);

export { MediaChatPage, SplitComponent as component };
//# sourceMappingURL=_chatId-D3263aBU.mjs.map
