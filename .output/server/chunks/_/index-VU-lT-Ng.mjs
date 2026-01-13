import { jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { C as ChatSidebar } from './chat-input-BHukpy2u.mjs';
import { Loader2, Sparkles } from 'lucide-react';
import { a as useGetChatsQuery, b as useCreateChatMutation } from './router-ZQUnxrzB.mjs';
import '@radix-ui/react-scroll-area';
import '@radix-ui/react-dropdown-menu';
import '@radix-ui/react-dialog';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-select';
import 'react-redux';
import '@reduxjs/toolkit';
import '@reduxjs/toolkit/query/react';
import '@reduxjs/toolkit/query';

function MediaIndexPage() {
  const navigate = useNavigate();
  const {
    data: chats,
    isLoading: isChatsLoading
  } = useGetChatsQuery();
  const [createChat, {
    isLoading: isCreating
  }] = useCreateChatMutation();
  useEffect(() => {
    if (chats && chats.length > 0) {
      navigate({
        to: "/media/$chatId",
        params: {
          chatId: chats[0].id.toString()
        }
      });
    }
  }, [chats, navigate]);
  async function handleCreateFirstChat() {
    try {
      const newChat = await createChat({
        name: "\u041D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442"
      }).unwrap();
      navigate({
        to: "/media/$chatId",
        params: {
          chatId: newChat.id.toString()
        }
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0447\u0430\u0442\u0430:", error);
    }
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-slate-900", children: [
    /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
      lineNumber: 45,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center", children: isChatsLoading ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4", children: [
      /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-cyan-400" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 50,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-slate-400", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 51,
        columnNumber: 25
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
      lineNumber: 49,
      columnNumber: 35
    }, this) : /* @__PURE__ */ jsxDEV("div", { className: "max-w-md text-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-6 flex justify-center", children: /* @__PURE__ */ jsxDEV("div", { className: "rounded-full bg-linear-to-br from-cyan-500 to-purple-600 p-6", children: /* @__PURE__ */ jsxDEV(Sparkles, { className: "h-12 w-12 text-white" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 55,
        columnNumber: 33
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 54,
        columnNumber: 29
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 53,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "mb-3 text-3xl font-bold text-white", children: "AI Media Generator" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 59,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "mb-6 text-slate-400", children: "\u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F, \u0432\u0438\u0434\u0435\u043E \u0438 \u0430\u0443\u0434\u0438\u043E \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u043D\u0435\u0439\u0440\u043E\u0441\u0435\u0442\u0435\u0439. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u043E\u0434\u0435\u043B\u044C \u0438 \u043E\u043F\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0441\u043E\u0437\u0434\u0430\u0442\u044C." }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 63,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mb-8 flex flex-wrap justify-center gap-3", children: [
        /* @__PURE__ */ jsxDEV(ModelCard, { emoji: "\u{1F34C}", name: "Nano Banana Pro", description: "Gemini 3 Pro" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
          lineNumber: 70,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV(ModelCard, { emoji: "\u{1F3A8}", name: "Midjourney", description: "\u0421\u043A\u043E\u0440\u043E", disabled: true }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
          lineNumber: 71,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 69,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: handleCreateFirstChat, disabled: isCreating, className: "inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50", children: isCreating ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV(Loader2, { className: "h-5 w-5 animate-spin" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
          lineNumber: 76,
          columnNumber: 37
        }, this),
        "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435..."
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 75,
        columnNumber: 43
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV(Sparkles, { className: "h-5 w-5" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
          lineNumber: 79,
          columnNumber: 37
        }, this),
        "\u041D\u0430\u0447\u0430\u0442\u044C \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E"
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 78,
        columnNumber: 39
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 74,
        columnNumber: 25
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
      lineNumber: 52,
      columnNumber: 30
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
      lineNumber: 48,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
    lineNumber: 43,
    columnNumber: 10
  }, this);
}
function ModelCard({
  emoji,
  name,
  description,
  disabled
}) {
  return /* @__PURE__ */ jsxDEV("div", { className: `rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-left ${disabled ? "opacity-50" : ""}`, children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsxDEV("span", { className: "text-xl", children: emoji }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
      lineNumber: 101,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("p", { className: "font-medium text-white", children: name }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 103,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-400", children: description }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
        lineNumber: 104,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
      lineNumber: 102,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
    lineNumber: 100,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/index.tsx?tsr-split=component",
    lineNumber: 99,
    columnNumber: 10
  }, this);
}

export { MediaIndexPage as component };
//# sourceMappingURL=index-VU-lT-Ng.mjs.map
