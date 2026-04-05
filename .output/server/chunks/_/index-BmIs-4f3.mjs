import { jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { u as useGetChatsQuery, A as APP_MODES, a as useCreateChatMutation, C as ChatSidebar } from './router-DFPuOg5f.mjs';
import { Loader2, Sparkles } from 'lucide-react';
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

function AiModelIndexPage() {
  const navigate = useNavigate();
  const {
    data: chats,
    isLoading: isChatsLoading
  } = useGetChatsQuery({
    appMode: APP_MODES.AI_MODEL
  });
  const [createChat, {
    isLoading: isCreating
  }] = useCreateChatMutation();
  useEffect(() => {
    if (chats && chats.length > 0) {
      navigate({
        to: "/ai-model/$chatId",
        params: {
          chatId: chats[0].id.toString()
        }
      });
    }
  }, [chats, navigate]);
  async function handleCreateFirstChat() {
    try {
      const newChat = await createChat({
        name: "AI Model Chat",
        model: "NANO_BANANA_2_KIEAI",
        appMode: APP_MODES.AI_MODEL
      }).unwrap();
      navigate({
        to: "/ai-model/$chatId",
        params: {
          chatId: newChat.id.toString()
        }
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0447\u0430\u0442\u0430:", error);
    }
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "ai-model-theme flex h-screen bg-background", children: [
    /* @__PURE__ */ jsxDEV(ChatSidebar, { appMode: APP_MODES.AI_MODEL, routeBase: "/ai-model" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
      lineNumber: 46,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center", children: isChatsLoading ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4", children: [
      /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-emerald-400" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 49,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-slate-400", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 50,
        columnNumber: 25
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
      lineNumber: 48,
      columnNumber: 35
    }, this) : /* @__PURE__ */ jsxDEV("div", { className: "max-w-md text-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-6 flex justify-center", children: /* @__PURE__ */ jsxDEV("div", { className: "rounded-full bg-emerald-600 p-6", children: /* @__PURE__ */ jsxDEV(Sparkles, { className: "h-12 w-12 text-white" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 54,
        columnNumber: 33
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 53,
        columnNumber: 29
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 52,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "mb-3 text-3xl font-bold text-white", children: "AI Model Mode" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 58,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "mb-6 text-slate-400", children: "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 \u0441 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u043E\u0439 \u0438 \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435\u043C \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 61,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: handleCreateFirstChat, disabled: isCreating, className: "inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50", children: isCreating ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV(Loader2, { className: "h-5 w-5 animate-spin" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
          lineNumber: 67,
          columnNumber: 37
        }, this),
        "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435..."
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 66,
        columnNumber: 43
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV(Sparkles, { className: "h-5 w-5" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
          lineNumber: 70,
          columnNumber: 37
        }, this),
        "\u041E\u0442\u043A\u0440\u044B\u0442\u044C AI Model"
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 69,
        columnNumber: 39
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
        lineNumber: 65,
        columnNumber: 25
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
      lineNumber: 51,
      columnNumber: 30
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
      lineNumber: 47,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/frontend/routes/ai-model/index.tsx?tsr-split=component",
    lineNumber: 45,
    columnNumber: 10
  }, this);
}

export { AiModelIndexPage as component };
//# sourceMappingURL=index-BmIs-4f3.mjs.map
