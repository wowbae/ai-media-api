import { jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import * as React from 'react';
import React__default, { forwardRef, useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { FlaskConical, Plus, MessageSquare, X, Loader2, Paperclip, Lock, Unlock, Send, MoreVertical, Pencil, Trash2, XIcon, Sparkles, ImageIcon, Video, Music, ChevronUp, ChevronDown, ChevronDownIcon, CheckIcon, ChevronUpIcon } from 'lucide-react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { a as useGetChatsQuery, b as useCreateChatMutation, l as useDeleteChatMutation, h as useUpdateChatMutation, i as useGenerateMediaMutation, o as useGenerateMediaTestMutation, e as useGetModelsQuery, m as useUploadToImgbbMutation, n as useUploadUserMediaMutation } from './router-ZQUnxrzB.mjs';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as SelectPrimitive from '@radix-ui/react-select';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/button.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/scroll-area.tsx",
            lineNumber: 18,
            columnNumber: 7
          },
          void 0
        ),
        /* @__PURE__ */ jsxDEV(ScrollBar, {}, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/scroll-area.tsx",
          lineNumber: 25,
          columnNumber: 7
        }, void 0),
        /* @__PURE__ */ jsxDEV(ScrollAreaPrimitive.Corner, { className: "hidden" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/scroll-area.tsx",
          lineNumber: 26,
          columnNumber: 7
        }, void 0)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/scroll-area.tsx",
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
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
        orientation === "horizontal" && "h-2.5 w-full flex-col border-t border-t-transparent p-[1px]",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxDEV(
        ScrollAreaPrimitive.ScrollAreaThumb,
        {
          "data-slot": "scroll-area-thumb",
          className: "relative flex-1 rounded-full bg-slate-600/50 hover:bg-slate-500/50"
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/scroll-area.tsx",
          lineNumber: 51,
          columnNumber: 7
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/scroll-area.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/skeleton.tsx",
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
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dropdown-menu.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dropdown-menu.tsx",
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
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
        className
      ),
      ...props
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dropdown-menu.tsx",
      lineNumber: 41,
      columnNumber: 7
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dropdown-menu.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dropdown-menu.tsx",
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
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
    lineNumber: 12,
    columnNumber: 10
  }, this);
}
function DialogPortal({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(DialogPrimitive.Portal, { "data-slot": "dialog-portal", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
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
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
                  lineNumber: 76,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "sr-only", children: "Close" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
                  lineNumber: 77,
                  columnNumber: 13
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
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
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
        lineNumber: 61,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/dialog.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/input.tsx",
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
function ChatSidebar() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const currentChatId = params.chatId ? parseInt(params.chatId) : null;
  const { data: chats, isLoading: isChatsLoading } = useGetChatsQuery();
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
      const newChat = await createChat({ name: newChatName.trim() }).unwrap();
      setNewChatName("");
      setIsNewChatDialogOpen(false);
      navigate({
        to: "/media/$chatId",
        params: { chatId: newChat.id.toString() }
      });
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
        navigate({ to: "/media" });
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
  return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full w-64 flex-col border-r border-border bg-background", children: [
    /* @__PURE__ */ jsxDEV("div", { className: PANEL_HEADER_CLASSES, children: [
      /* @__PURE__ */ jsxDEV("h2", { className: PANEL_HEADER_TITLE_CLASSES, children: "AI Media" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 137,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
              lineNumber: 155,
              columnNumber: 25
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 139,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
              lineNumber: 163,
              columnNumber: 25
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 157,
            columnNumber: 21
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 138,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
      lineNumber: 136,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(ScrollArea, { className: "flex-1", children: /* @__PURE__ */ jsxDEV("div", { className: "p-2 w-64 truncate", children: isChatsLoading ? (
      // Skeleton loader
      Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "mb-2 flex items-center gap-2 p-2",
          children: [
            /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-4 w-4 rounded" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
              lineNumber: 178,
              columnNumber: 33
            }, this),
            /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-4 flex-1" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
              lineNumber: 179,
              columnNumber: 33
            }, this)
          ]
        },
        i,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
          lineNumber: 174,
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
        onEdit: () => openEditDialog(chat)
      },
      chat.id,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 184,
        columnNumber: 29
      },
      this
    )) : /* @__PURE__ */ jsxDEV("div", { className: "py-8 text-center text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxDEV(MessageSquare, { className: "mx-auto mb-2 h-8 w-8 opacity-50" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 194,
        columnNumber: 29
      }, this),
      /* @__PURE__ */ jsxDEV("p", { children: "\u041D\u0435\u0442 \u0447\u0430\u0442\u043E\u0432" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 195,
        columnNumber: 29
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs", children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 196,
        columnNumber: 29
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
      lineNumber: 193,
      columnNumber: 25
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
      lineNumber: 170,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
      lineNumber: 169,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(
      Dialog,
      {
        open: isNewChatDialogOpen,
        onOpenChange: setIsNewChatDialogOpen,
        children: /* @__PURE__ */ jsxDEV(DialogContent, { className: "border-border bg-card", children: [
          /* @__PURE__ */ jsxDEV(DialogHeader, { children: /* @__PURE__ */ jsxDEV(DialogTitle, { className: "text-foreground", children: "\u041D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 209,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 208,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
              lineNumber: 213,
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                lineNumber: 223,
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                lineNumber: 230,
                columnNumber: 25
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 222,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
          lineNumber: 207,
          columnNumber: 17
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 203,
        columnNumber: 13
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(Dialog, { open: isEditDialogOpen, onOpenChange: setIsEditDialogOpen, children: /* @__PURE__ */ jsxDEV(DialogContent, { className: "border-border bg-card", children: [
      /* @__PURE__ */ jsxDEV(DialogHeader, { children: /* @__PURE__ */ jsxDEV(DialogTitle, { className: "text-foreground", children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0447\u0430\u0442" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 245,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 244,
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
          lineNumber: 249,
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 257,
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 264,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
        lineNumber: 256,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
      lineNumber: 243,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
      lineNumber: 242,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
    lineNumber: 134,
    columnNumber: 9
  }, this);
}
function ChatItem({ chat, isActive, onDelete, onEdit }) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: cn(
        "group flex items-center gap-2 rounded-lg p-2 transition-colors",
        isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      ),
      children: [
        /* @__PURE__ */ jsxDEV(
          Link,
          {
            to: "/media/$chatId",
            params: { chatId: chat.id.toString() },
            className: "flex min-w-0 flex-1 items-center gap-2",
            children: [
              /* @__PURE__ */ jsxDEV(MessageSquare, { className: "h-4 w-4 shrink-0" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                lineNumber: 300,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "min-w-0 truncate text-sm", children: chat.name }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                lineNumber: 301,
                columnNumber: 17
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 295,
            columnNumber: 13
          },
          this
        ),
        chat._count && chat._count.files > 0 && /* @__PURE__ */ jsxDEV(
          "span",
          {
            className: cn(
              "shrink-0 text-xs",
              isActive ? "text-primary" : "text-muted-foreground"
            ),
            children: chat._count.files
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 305,
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
              className: "h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100",
              children: /* @__PURE__ */ jsxDEV(MoreVertical, { className: "h-4 w-4" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                lineNumber: 322,
                columnNumber: 25
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
              lineNumber: 317,
              columnNumber: 21
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
            lineNumber: 316,
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
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                        lineNumber: 333,
                        columnNumber: 25
                      }, this),
                      "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C"
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                    lineNumber: 329,
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
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                        lineNumber: 340,
                        columnNumber: 25
                      }, this),
                      "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
                    lineNumber: 336,
                    columnNumber: 21
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
              lineNumber: 325,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
          lineNumber: 315,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-sidebar.tsx",
      lineNumber: 287,
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/textarea.tsx",
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/number-input.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/number-input.tsx",
              lineNumber: 107,
              columnNumber: 25
            }, void 0)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/number-input.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/number-input.tsx",
              lineNumber: 119,
              columnNumber: 25
            }, void 0)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/number-input.tsx",
            lineNumber: 109,
            columnNumber: 21
          },
          void 0
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/number-input.tsx",
        lineNumber: 96,
        columnNumber: 17
      }, void 0)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/number-input.tsx",
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
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
    lineNumber: 10,
    columnNumber: 10
  }, this);
}
function SelectGroup({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(SelectPrimitive.Group, { "data-slot": "select-group", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
    lineNumber: 16,
    columnNumber: 10
  }, this);
}
function SelectValue({
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(SelectPrimitive.Value, { "data-slot": "select-value", ...props }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
          lineNumber: 45,
          columnNumber: 9
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
          lineNumber: 44,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
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
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      ),
      position,
      align,
      ...props,
      children: [
        /* @__PURE__ */ jsxDEV(SelectScrollUpButton, {}, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
          lineNumber: 72,
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
            lineNumber: 73,
            columnNumber: 9
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectScrollDownButton, {}, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
          lineNumber: 82,
          columnNumber: 9
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
      lineNumber: 60,
      columnNumber: 7
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
      lineNumber: 93,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
              lineNumber: 120,
              columnNumber: 11
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
              lineNumber: 119,
              columnNumber: 9
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
            lineNumber: 115,
            columnNumber: 7
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectPrimitive.ItemText, { children }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
          lineNumber: 123,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
      lineNumber: 107,
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
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
        lineNumber: 154,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
      lineNumber: 146,
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
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
        lineNumber: 172,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/select.tsx",
      lineNumber: 164,
      columnNumber: 5
    },
    this
  );
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
function loadLockButtonState() {
  {
    return false;
  }
}
function savePrompt(prompt, images, chatId, model) {
  return;
}
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
    openrouter: "OpenRouter",
    gptunnel: "GPTunnel",
    laozhang: "LaoZhang",
    kieai: "Kie.ai"
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/ui/badge.tsx",
      lineNumber: 38,
      columnNumber: 5
    },
    this
  );
}
const MODEL_ICONS = {
  NANO_BANANA_OPENROUTER: "\u{1F34C}",
  MIDJOURNEY: "\u{1F3A8}",
  VEO_3_1_FAST: "\u{1F3A5}",
  NANO_BANANA_PRO_LAOZHANG: "\u{1F34C}",
  SORA_2: "\u{1F30A}",
  VEO_3_1: "\u{1F3A5}",
  KLING_2_6: "\u{1F3AC}",
  KLING_2_5_TURBO_PRO: "\u{1F3AC}",
  IMAGEN4_KIEAI: "\u{1F5BC}\uFE0F",
  IMAGEN4_ULTRA_KIEAI: "\u{1F48E}",
  SEEDREAM_4_5: "\u{1F30C}",
  SEEDREAM_4_5_EDIT: "\u{1FA84}",
  ELEVENLABS_MULTILINGUAL_V2: "\u{1F3A4}"
};
const DEFAULT_ICON = "\u2728";
function getModelIcon(model) {
  return MODEL_ICONS[model] || DEFAULT_ICON;
}
const PROVIDER_BADGE_CONFIG = {
  gptunnel: {
    label: "GPTunnel",
    className: "bg-emerald-900/50 text-emerald-400 border-emerald-700/50"
  },
  openrouter: {
    label: "OpenRouter",
    className: "bg-violet-900/50 text-violet-400 border-violet-700/50"
  },
  laozhang: {
    label: "LaoZhang",
    className: "bg-orange-900/50 text-orange-400 border-orange-700/50"
  },
  kieai: {
    label: "Kie.ai",
    className: "bg-blue-900/50 text-blue-400 border-blue-700/50"
  }
};
function ProviderBadge({ provider, className }) {
  const config = PROVIDER_BADGE_CONFIG[provider];
  if (!config) {
    return null;
  }
  return /* @__PURE__ */ jsxDEV(
    Badge,
    {
      variant: "outline",
      className: `ml-auto text-[10px] px-1.5 py-0 h-4 font-normal ${config.className} ${className || ""}`,
      children: config.label
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
      lineNumber: 65,
      columnNumber: 9
    },
    this
  );
}
function ModelSelector({
  value,
  onChange,
  disabled
}) {
  const { data: models, isLoading } = useGetModelsQuery();
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
            lineNumber: 148,
            columnNumber: 25
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "truncate", children: currentModel?.name || value }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
            lineNumber: 149,
            columnNumber: 25
          }, this),
          currentModel?.provider && currentModel.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
            ProviderBadge,
            {
              provider: currentModel.provider
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
              lineNumber: 154,
              columnNumber: 33
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
          lineNumber: 147,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
          lineNumber: 146,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
          lineNumber: 145,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(SelectContent, { className: "border-border bg-card", children: isLoading ? /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 p-2 text-slate-400", children: [
          /* @__PURE__ */ jsxDEV(Sparkles, { className: "h-4 w-4 animate-pulse" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
            lineNumber: 167,
            columnNumber: 25
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439..." }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
            lineNumber: 168,
            columnNumber: 25
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
          lineNumber: 166,
          columnNumber: 21
        }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
          imageModels.length > 0 && /* @__PURE__ */ jsxDEV(SelectGroup, { children: [
            /* @__PURE__ */ jsxDEV(SelectLabel, { className: "flex items-center gap-2 text-muted-foreground", children: [
              /* @__PURE__ */ jsxDEV(ImageIcon, { className: "h-4 w-4" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 176,
                columnNumber: 37
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 177,
                columnNumber: 37
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
              lineNumber: 175,
              columnNumber: 33
            }, this),
            imageModels.map((model) => /* @__PURE__ */ jsxDEV(
              SelectItem,
              {
                value: model.key,
                className: "text-muted-foreground focus:bg-secondary focus:text-foreground",
                children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 w-full min-w-[200px]", children: [
                  /* @__PURE__ */ jsxDEV("span", { children: getModelIcon(model.key) }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                    lineNumber: 186,
                    columnNumber: 45
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: model.name }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                    lineNumber: 189,
                    columnNumber: 45
                  }, this),
                  model.provider && model.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
                    ProviderBadge,
                    {
                      provider: model.provider
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                      lineNumber: 193,
                      columnNumber: 53
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                  lineNumber: 185,
                  columnNumber: 41
                }, this)
              },
              model.key,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 180,
                columnNumber: 37
              },
              this
            ))
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
            lineNumber: 174,
            columnNumber: 29
          }, this),
          videoModels.length > 0 && /* @__PURE__ */ jsxDEV(SelectGroup, { children: [
            /* @__PURE__ */ jsxDEV(SelectLabel, { className: "flex items-center gap-2 text-muted-foreground", children: [
              /* @__PURE__ */ jsxDEV(Video, { className: "h-4 w-4" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 209,
                columnNumber: 37
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "\u0412\u0438\u0434\u0435\u043E" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 210,
                columnNumber: 37
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
              lineNumber: 208,
              columnNumber: 33
            }, this),
            videoModels.map((model) => /* @__PURE__ */ jsxDEV(
              SelectItem,
              {
                value: model.key,
                className: "text-muted-foreground focus:bg-secondary focus:text-foreground",
                children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 w-full min-w-[200px]", children: [
                  /* @__PURE__ */ jsxDEV("span", { children: getModelIcon(model.key) }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                    lineNumber: 219,
                    columnNumber: 45
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: model.name }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                    lineNumber: 222,
                    columnNumber: 45
                  }, this),
                  model.provider && model.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
                    ProviderBadge,
                    {
                      provider: model.provider
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                      lineNumber: 226,
                      columnNumber: 53
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                  lineNumber: 218,
                  columnNumber: 41
                }, this)
              },
              model.key,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 213,
                columnNumber: 37
              },
              this
            ))
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
            lineNumber: 207,
            columnNumber: 29
          }, this),
          audioModels.length > 0 && /* @__PURE__ */ jsxDEV(SelectGroup, { children: [
            /* @__PURE__ */ jsxDEV(SelectLabel, { className: "flex items-center gap-2 text-muted-foreground", children: [
              /* @__PURE__ */ jsxDEV(Music, { className: "h-4 w-4" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 242,
                columnNumber: 37
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "\u0410\u0443\u0434\u0438\u043E" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 243,
                columnNumber: 37
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
              lineNumber: 241,
              columnNumber: 33
            }, this),
            audioModels.map((model) => /* @__PURE__ */ jsxDEV(
              SelectItem,
              {
                value: model.key,
                className: "text-muted-foreground focus:bg-secondary focus:text-foreground",
                children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 w-full min-w-[200px]", children: [
                  /* @__PURE__ */ jsxDEV("span", { children: getModelIcon(model.key) }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                    lineNumber: 252,
                    columnNumber: 45
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: model.name }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                    lineNumber: 255,
                    columnNumber: 45
                  }, this),
                  model.provider && model.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
                    ProviderBadge,
                    {
                      provider: model.provider
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                      lineNumber: 259,
                      columnNumber: 53
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                  lineNumber: 251,
                  columnNumber: 41
                }, this)
              },
              model.key,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
                lineNumber: 246,
                columnNumber: 37
              },
              this
            ))
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
            lineNumber: 240,
            columnNumber: 29
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
          lineNumber: 171,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
          lineNumber: 163,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
      lineNumber: 140,
      columnNumber: 9
    },
    this
  );
}
function ModelBadge({ model, showProvider = false }) {
  const { data: models } = useGetModelsQuery();
  const modelInfo = models?.find((m) => m.key === model);
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
    /* @__PURE__ */ jsxDEV(Badge, { variant: "secondary", className: "bg-secondary text-muted-foreground", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "mr-1", children: getModelIcon(model) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
        lineNumber: 290,
        columnNumber: 17
      }, this),
      modelInfo?.name || model
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
      lineNumber: 289,
      columnNumber: 13
    }, this),
    showProvider && modelInfo?.provider && modelInfo.provider in PROVIDER_BADGE_CONFIG && /* @__PURE__ */ jsxDEV(
      ProviderBadge,
      {
        provider: modelInfo.provider
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
        lineNumber: 296,
        columnNumber: 21
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/model-selector.tsx",
    lineNumber: 288,
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
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTestMode = loadTestMode();
      setIsTestMode((prev) => {
        if (prev !== currentTestMode) {
          return currentTestMode;
        }
        return prev;
      });
    }, 3e3);
    return () => clearInterval(interval);
  }, []);
  function setTestMode(enabled) {
    setIsTestMode(enabled);
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
  NANO_BANANA_OPENROUTER: {
    isNanoBanana: true,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false
  },
  MIDJOURNEY: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false
  },
  VEO_3_1_FAST: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: true,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
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
    supportsElevenLabsParams: false
  },
  NANO_BANANA_PRO_LAOZHANG: {
    isNanoBanana: false,
    isNanoBananaPro: true,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false
  },
  SORA_2: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false
  },
  VEO_3_1: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: true,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
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
    supportsElevenLabsParams: false
  },
  KLING_2_6: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: true,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
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
    supportsElevenLabsParams: false
  },
  KLING_2_5_TURBO_PRO: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: true,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: true,
    // klingAspectRatio
    supportsQuality: false,
    supportsDuration: true,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: true,
    supportsSeed: false,
    supportsCfgScale: true,
    supportsTailImageUrl: true,
    supportsElevenLabsParams: false
  },
  NANO_BANANA_PRO_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: true,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false
  },
  IMAGEN4_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: true,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false
  },
  IMAGEN4_ULTRA_KIEAI: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: true,
    isImagen4Ultra: true,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: true,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: true,
    supportsSeed: true,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false
  },
  SEEDREAM_4_5: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: true,
    isSeedream4_5_Edit: false,
    isElevenLabs: false,
    supportsFormat: true,
    supportsQuality: true,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: false
  },
  SEEDREAM_4_5_EDIT: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: true,
    isElevenLabs: false,
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
    maxInputFiles: 14
  },
  ELEVENLABS_MULTILINGUAL_V2: {
    isNanoBanana: false,
    isNanoBananaPro: false,
    isNanoBananaProKieai: false,
    isVeo: false,
    isKling: false,
    isKling25: false,
    isImagen4: false,
    isImagen4Ultra: false,
    isSeedream4_5: false,
    isSeedream4_5_Edit: false,
    isElevenLabs: true,
    supportsFormat: false,
    supportsQuality: false,
    supportsDuration: false,
    supportsSound: false,
    supportsVeoGenerationType: false,
    supportsNegativePrompt: false,
    supportsSeed: false,
    supportsCfgScale: false,
    supportsTailImageUrl: false,
    supportsElevenLabsParams: true
  }
};
function getModelConfig(model) {
  return MODEL_CONFIGS[model];
}
function useModelType(model) {
  return useMemo(() => {
    const config = getModelConfig(model);
    return {
      model,
      ...config
    };
  }, [model]);
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}
function useChatInputFiles(chatId) {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadToImgbb] = useUploadToImgbbMutation();
  const [uploadUserMedia] = useUploadUserMediaMutation();
  const previewUrlsRef = useRef(/* @__PURE__ */ new Set());
  const processFiles = useCallback(
    async (files, shouldUpload = false) => {
      const newFiles = [];
      const imageFiles = [];
      const videoFiles = [];
      for (const file of files) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          console.warn(
            "[ChatInput] \u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D \u0444\u0430\u0439\u043B \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0433\u043E \u0442\u0438\u043F\u0430:",
            file.type
          );
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          alert(
            `\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 "${file.name}" \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0442\u044C 10MB`
          );
          continue;
        }
        if (file.type.startsWith("image/")) {
          imageFiles.push(file);
        } else {
          videoFiles.push(file);
        }
      }
      for (const file of [...imageFiles, ...videoFiles]) {
        try {
          const preview = URL.createObjectURL(file);
          previewUrlsRef.current.add(preview);
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
          console.error(
            "[ChatInput] \u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u043D\u0430 imgbb:",
            error
          );
        }
      }
      if (shouldUpload && chatId && newFiles.length > 0) {
        try {
          const uploadFiles = await Promise.all(
            newFiles.map(async (f) => ({
              base64: await fileToBase64(f.file),
              mimeType: f.file.type,
              filename: f.file.name
            }))
          );
          console.log(`[ChatInput] \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 ${uploadFiles.length} \u0444\u0430\u0439\u043B\u043E\u0432 \u0432 \u0411\u0414 (ai-media)...`);
          const result = await uploadUserMedia({
            chatId,
            files: uploadFiles
          }).unwrap();
          console.log("[ChatInput] \u2705 \u0424\u0430\u0439\u043B\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B \u0432 \u0411\u0414 \u0438 ai-media");
          if (result && result.files) {
            setAttachedFiles((prev) => {
              const updated = [...prev];
              result.files.forEach((serverFile) => {
                const localFileIndex = updated.findIndex(
                  (f) => f.file.name === serverFile.filename && !f.imgbbUrl
                );
                if (localFileIndex !== -1 && serverFile.url) {
                  updated[localFileIndex] = {
                    ...updated[localFileIndex],
                    imgbbUrl: serverFile.url
                  };
                }
              });
              return updated;
            });
          }
        } catch (error) {
          console.error("[ChatInput] \u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u043E\u0432 \u0432 \u0411\u0414:", error);
        }
      }
      return newFiles;
    },
    [uploadToImgbb, uploadUserMedia, chatId]
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
      const newFiles = await processFiles(Array.from(files), true);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
      if (event.target) {
        event.target.value = "";
      }
    },
    [processFiles]
  );
  const addFileFromUrl = useCallback(
    async (url, filename) => {
      try {
        const file = await urlToFile(url, filename);
        const processedFiles = await processFiles([file], false);
        setAttachedFiles((prev) => [...prev, ...processedFiles]);
      } catch (error) {
        console.error(
          "[ChatInput] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u0430:",
          error
        );
        alert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u0430\u0439\u043B");
      }
    },
    [urlToFile, processFiles]
  );
  const removeFile = useCallback((fileId) => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.preview);
        previewUrlsRef.current.delete(file.preview);
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
      const newFiles = await processFiles(files, true);
      if (newFiles.length > 0) {
        setAttachedFiles((prev) => [...prev, ...newFiles]);
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
      const newFiles = await processFiles(files, true);
      if (newFiles.length > 0) {
        setAttachedFiles((prev) => [...prev, ...newFiles]);
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
        URL.revokeObjectURL(f.preview);
        previewUrlsRef.current.delete(f.preview);
      });
      return [];
    });
  }, []);
  const getFileAsBase64 = useCallback(
    async (file) => {
      return fileToBase64(file);
    },
    []
  );
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
function useChatInputSubmit({
  chatId,
  currentModel,
  generateMedia,
  generateMediaTest,
  isTestMode,
  onRequestCreated,
  onPendingMessage,
  onSendError,
  getFileAsBase64
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInProgressRef = useRef(false);
  const [uploadToImgbb] = useUploadToImgbbMutation();
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
              inputFilesCount: params.attachedFiles.length,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          );
          const imageFiles = params.attachedFiles.filter(
            (f) => f.file.type.startsWith("image/")
          );
          const inputFilesUrls = [];
          let tailImageUrl;
          if (params.modelType.isKling25 && imageFiles.length > 0) {
            const firstImage = imageFiles[0];
            if (firstImage.imgbbUrl) {
              inputFilesUrls.push(firstImage.imgbbUrl);
            } else {
              const base64 = await getFileAsBase64(firstImage.file);
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
                const base64 = await getFileAsBase64(secondImage.file);
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
          result = await generateMedia({
            chatId,
            prompt: finalPrompt,
            model: currentModel,
            inputFiles: inputFilesUrls.length > 0 ? inputFilesUrls : void 0,
            ...params.modelType.supportsFormat && params.format && { format: params.format },
            ...params.modelType.supportsQuality && params.quality && { quality: params.quality },
            ...params.modelType.isVeo && params.videoFormat && { ar: params.videoFormat },
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
              ...params.languageCode && { languageCode: params.languageCode }
            }
          }).unwrap();
          console.log(
            "[ChatInput] \u2705 \u041E\u0431\u044B\u0447\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C: \u0437\u0430\u043F\u0440\u043E\u0441 \u0432 \u043D\u0435\u0439\u0440\u043E\u043D\u043A\u0443 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D, requestId:",
            result.requestId
          );
        }
        if (onRequestCreated && result.requestId) {
          onRequestCreated(result.requestId);
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
      uploadToImgbb
    ]
  );
  return {
    handleSubmit,
    isSubmitting,
    submitInProgressRef
  };
}
const FORMAT_OPTIONS_1_1_16_9_9_16 = [
  { value: "1:1", label: "1:1 (\u041A\u0432\u0430\u0434\u0440\u0430\u0442)" },
  { value: "16:9", label: "16:9 (\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0439)" },
  { value: "9:16", label: "9:16 (\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439)" }
];
const FORMAT_OPTIONS_16_9_9_16 = [
  { value: "16:9", label: "16:9 (\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0439)" },
  { value: "9:16", label: "9:16 (\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439)" }
];
const FORMAT_OPTIONS_WITH_DEFAULT = [
  { value: "default", label: "\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E" },
  { value: "16:9", label: "16:9 (\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0439)" },
  { value: "9:16", label: "9:16 (\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439)" }
];
const FORMAT_OPTIONS_SEEDREAM = [
  { value: "1:1", label: "1:1 (\u041A\u0432\u0430\u0434\u0440\u0430\u0442)" },
  { value: "4:3", label: "4:3 (\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0439)" },
  { value: "3:4", label: "3:4 (\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439)" },
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
const QUALITY_OPTIONS_WITH_DEFAULT = [
  { value: "default", label: "\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E" },
  { value: "1k", label: "1K" },
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
const SOUND_OPTIONS = [
  { value: "true", label: "\u0437\u0432\u0443\u043A on" },
  { value: "false", label: "\u0437\u0432\u0443\u043A off" }
];
const GENERATION_TYPE_OPTIONS = [
  { value: "TEXT_2_VIDEO", label: "\u0422\u0435\u043A\u0441\u0442 \u2192 \u0412\u0438\u0434\u0435\u043E" },
  { value: "FIRST_AND_LAST_FRAMES_2_VIDEO", label: "\u041A\u0430\u0434\u0440\u044B \u2192 \u0412\u0438\u0434\u0435\u043E" },
  { value: "REFERENCE_2_VIDEO", label: "\u0420\u0435\u0444\u0435\u0440\u0435\u043D\u0441 \u2192 \u0412\u0438\u0434\u0435\u043E" }
];
const MODEL_SETTINGS_CONFIG = {
  NANO_BANANA_OPENROUTER: {
    format: {
      options: FORMAT_OPTIONS_WITH_DEFAULT,
      allowDefault: true
    },
    quality: {
      options: QUALITY_OPTIONS_WITH_DEFAULT,
      allowDefault: true
    }
  },
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
  VEO_3_1_FAST: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    generationType: {
      options: GENERATION_TYPE_OPTIONS,
      defaultValue: "TEXT_2_VIDEO"
    }
  },
  VEO_3_1: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    generationType: {
      options: GENERATION_TYPE_OPTIONS,
      defaultValue: "TEXT_2_VIDEO"
    }
  },
  KLING_2_6: {
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
  KLING_2_5_TURBO_PRO: {
    format: {
      options: FORMAT_OPTIONS_16_9_9_16,
      defaultValue: "9:16"
    },
    duration: {
      options: DURATION_OPTIONS,
      defaultValue: 5
    }
  },
  SEEDREAM_4_5: {
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
  SEEDREAM_4_5_EDIT: {
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
  MIDJOURNEY: {},
  SORA_2: {},
  ELEVENLABS_MULTILINGUAL_V2: {}
  // Настройки через отдельные поля в UI
};
function getModelSettingsConfig(model) {
  return MODEL_SETTINGS_CONFIG[model] || {};
}
function FormatSelect({
  value,
  config,
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
  const displayValue = value || config.defaultValue || (config.allowDefault ? "default" : config.defaultValue || "");
  const placeholder = config.defaultValue || "\u0424\u043E\u0440\u043C\u0430\u0442";
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
              lineNumber: 72,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 69,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectContent, { className: "border-border bg-card", children: config.options.map((option) => /* @__PURE__ */ jsxDEV(
          SelectItem,
          {
            value: option.value,
            className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
            children: option.label
          },
          option.value,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 78,
            columnNumber: 21
          },
          this
        )) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
          lineNumber: 76,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
      lineNumber: 64,
      columnNumber: 9
    },
    this
  );
}
function QualitySelect({
  value,
  config,
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
  const displayValue = value || config.defaultValue || (config.allowDefault ? "default" : config.defaultValue || "");
  const placeholder = config.defaultValue ? config.defaultValue.toUpperCase() : "\u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E";
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
              lineNumber: 132,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 129,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectContent, { className: "border-border bg-card", children: config.options.map((option) => /* @__PURE__ */ jsxDEV(
          SelectItem,
          {
            value: option.value,
            className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
            children: option.label
          },
          option.value,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 138,
            columnNumber: 21
          },
          this
        )) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
          lineNumber: 136,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
      lineNumber: 124,
      columnNumber: 9
    },
    this
  );
}
function DurationSelect({
  value,
  config,
  onValueChange,
  disabled,
  className = "w-[100px]"
}) {
  const handleChange = (newValue) => {
    const duration = parseInt(newValue);
    onValueChange(duration);
  };
  const displayValue = (value || config.defaultValue).toString();
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
              value || config.defaultValue,
              " \u0441\u0435\u043A"
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
              lineNumber: 184,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 181,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectContent, { className: "border-border bg-card", children: config.options.map((option) => /* @__PURE__ */ jsxDEV(
          SelectItem,
          {
            value: option.value,
            className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
            children: option.label
          },
          option.value,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 190,
            columnNumber: 21
          },
          this
        )) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
          lineNumber: 188,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
      lineNumber: 176,
      columnNumber: 9
    },
    this
  );
}
function SoundSelect({
  value,
  config,
  onValueChange,
  disabled,
  className = "w-[100px]"
}) {
  const handleChange = (newValue) => {
    const sound = newValue === "true";
    onValueChange(sound);
  };
  const displayValue = value === void 0 ? config.defaultValue.toString() : value.toString();
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
              lineNumber: 237,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 234,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectContent, { className: "border-border bg-card", children: config.options.map((option) => /* @__PURE__ */ jsxDEV(
          SelectItem,
          {
            value: option.value,
            className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
            children: option.label
          },
          option.value,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 243,
            columnNumber: 21
          },
          this
        )) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
          lineNumber: 241,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
      lineNumber: 229,
      columnNumber: 9
    },
    this
  );
}
function GenerationTypeSelect({
  value,
  config,
  onValueChange,
  disabled,
  className = "w-[160px]"
}) {
  const handleChange = (newValue) => {
    onValueChange(
      newValue
    );
  };
  const displayValue = value || config.defaultValue;
  const selectedOption = config.options.find((o) => o.value === displayValue);
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
              lineNumber: 303,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 300,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(SelectContent, { className: "border-border bg-card focus:bg-accent focus:text-accent-foreground", children: config.options.map((option) => /* @__PURE__ */ jsxDEV(
          SelectItem,
          {
            value: option.value,
            className: "text-muted-foreground focus:bg-accent focus:text-accent-foreground",
            children: option.label
          },
          option.value,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
            lineNumber: 309,
            columnNumber: 21
          },
          this
        )) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
          lineNumber: 307,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
      lineNumber: 295,
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
  const config = getModelSettingsConfig(model);
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    config.format && /* @__PURE__ */ jsxDEV(
      FormatSelect,
      {
        value: format,
        config: config.format,
        onValueChange: onFormatChange,
        disabled,
        className: config.format.options.some((o) => o.value === "1:1") ? "w-[140px]" : "w-[120px]"
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
        lineNumber: 366,
        columnNumber: 17
      },
      this
    ),
    config.quality && /* @__PURE__ */ jsxDEV(
      QualitySelect,
      {
        value: quality,
        config: config.quality,
        onValueChange: onQualityChange,
        disabled
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
        lineNumber: 380,
        columnNumber: 17
      },
      this
    ),
    config.duration && /* @__PURE__ */ jsxDEV(
      DurationSelect,
      {
        value: duration,
        config: config.duration,
        onValueChange: onDurationChange,
        disabled
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
        lineNumber: 389,
        columnNumber: 17
      },
      this
    ),
    config.sound && /* @__PURE__ */ jsxDEV(
      SoundSelect,
      {
        value: sound,
        config: config.sound,
        onValueChange: onSoundChange,
        disabled
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
        lineNumber: 398,
        columnNumber: 17
      },
      this
    ),
    config.generationType && onVeoGenerationTypeChange && /* @__PURE__ */ jsxDEV(
      GenerationTypeSelect,
      {
        value: veoGenerationType,
        config: config.generationType,
        onValueChange: onVeoGenerationTypeChange,
        disabled
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
        lineNumber: 407,
        columnNumber: 17
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input/model-settings.tsx",
    lineNumber: 364,
    columnNumber: 9
  }, this);
}
const ChatInput = forwardRef(
  function ChatInput2({
    chatId,
    currentModel,
    onModelChange,
    onRequestCreated,
    onPendingMessage,
    onSendError,
    disabled
  }, ref) {
    const [prompt, setPrompt] = useState("");
    const [format, setFormat] = useState(void 0);
    const [quality, setQuality] = useState(
      void 0
    );
    const [duration, setDuration] = useState(void 0);
    const [veoGenerationType, setVeoGenerationType] = useState(void 0);
    const [sound, setSound] = useState(void 0);
    const [negativePrompt, setNegativePrompt] = useState("");
    const [seed, setSeed] = useState(
      void 0
    );
    const [cfgScale, setCfgScale] = useState(void 0);
    const [voice, setVoice] = useState("Rachel");
    const [stability, setStability] = useState(0.5);
    const [similarityBoost, setSimilarityBoost] = useState(0.75);
    const [speed, setSpeed] = useState(1);
    const [languageCode, setLanguageCode] = useState("");
    const [isLockEnabled, setIsLockEnabled] = useState(false);
    const elevenLabsVoices = [
      "Rachel",
      "Aria",
      "Roger",
      "Sarah",
      "Laura",
      "Charlie",
      "George",
      "Callum",
      "River",
      "Liam",
      "Charlotte",
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
    const [needsScrollbar, setNeedsScrollbar] = useState(false);
    const [attachingFile, setAttachingFile] = useState(false);
    const { isTestMode } = useTestMode();
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const [generateMedia] = useGenerateMediaMutation();
    const [generateMediaTest] = useGenerateMediaTestMutation();
    const isDisabled = disabled ?? false;
    const modelType = useModelType(currentModel);
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
    } = useChatInputFiles(chatId);
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
      getFileAsBase64
    });
    const MAX_PROMPT_LENGTH = 5e3;
    const adjustTextareaHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = window.innerHeight * 0.2;
      const newHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      const needsScroll = scrollHeight > newHeight + 1;
      setNeedsScrollbar(needsScroll);
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
    }, [prompt, adjustTextareaHeight]);
    useEffect(() => {
      const handleResize = () => {
        adjustTextareaHeight();
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [adjustTextareaHeight]);
    useImperativeHandle(ref, () => ({
      setPrompt: (newPrompt) => {
        setPrompt(newPrompt);
        setTimeout(() => {
          const textarea = document.querySelector(
            'textarea[placeholder*="\u041E\u043F\u0438\u0448\u0438\u0442\u0435"]'
          );
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
        const settings = request.settings || {};
        if (settings.format) setFormat(settings.format);
        if (settings.quality) setQuality(settings.quality);
        if (settings.duration) setDuration(settings.duration);
        if (settings.veoGenerationType)
          setVeoGenerationType(settings.veoGenerationType);
        if (settings.sound !== void 0)
          setSound(settings.sound);
        if (settings.negativePrompt)
          setNegativePrompt(settings.negativePrompt);
        if (settings.seed || request.seed)
          setSeed(settings.seed || request.seed);
        if (settings.cfgScale) setCfgScale(settings.cfgScale);
        if (settings.voice) setVoice(settings.voice);
        if (settings.stability !== void 0)
          setStability(settings.stability);
        if (settings.similarityBoost !== void 0)
          setSimilarityBoost(settings.similarityBoost);
        if (settings.speed !== void 0)
          setSpeed(settings.speed);
        if (settings.languageCode)
          setLanguageCode(settings.languageCode);
        clearFiles();
        if (request.inputFiles && request.inputFiles.length > 0) {
          const { getMediaFileUrl } = await import('./constants-SLUBuX75.mjs');
          for (const filePath of request.inputFiles) {
            const url = filePath.startsWith("http") ? filePath : getMediaFileUrl(filePath);
            const filename = filePath.split("/").pop() || "file";
            await addFileFromUrl(url, filename);
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
      const settings = loadMediaSettings();
      const config = getModelSettingsConfig(currentModel);
      if (settings.format) {
        setFormat(settings.format);
      } else if (modelType.isVeo && settings.videoFormat) {
        setFormat(settings.videoFormat);
      } else if ((modelType.isKling || modelType.isKling25) && settings.klingAspectRatio) {
        setFormat(settings.klingAspectRatio);
      } else if (config.format?.defaultValue) {
        setFormat(config.format.defaultValue);
      }
      if (settings.quality) {
        setQuality(settings.quality);
      } else if (config.quality?.defaultValue) {
        setQuality(config.quality.defaultValue);
      }
      if (modelType.isVeo && settings.veoGenerationType) {
        setVeoGenerationType(settings.veoGenerationType);
      } else if (config.generationType?.defaultValue) {
        setVeoGenerationType(config.generationType.defaultValue);
      }
      if (settings.klingDuration) {
        setDuration(settings.klingDuration);
      } else if (config.duration?.defaultValue) {
        setDuration(config.duration.defaultValue);
      }
      if (settings.klingSound !== void 0) {
        setSound(settings.klingSound);
      } else if (config.sound?.defaultValue !== void 0) {
        setSound(config.sound.defaultValue);
      }
      const lockState = loadLockButtonState();
      setIsLockEnabled(lockState);
    }, [currentModel]);
    const isInitialMount = useRef(true);
    useEffect(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      if (modelType.isVeo) ; else if (modelType.isKling || modelType.isKling25) {
        saveMediaSettings({
          klingSound: modelType.isKling ? sound : void 0
        });
      } else ;
    }, [format, quality, duration, sound, veoGenerationType, modelType]);
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
        handleSubmit(event, {
          prompt,
          attachedFiles,
          format,
          quality,
          videoFormat,
          veoGenerationType,
          klingAspectRatio,
          klingDuration: duration,
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
            if (modelType.isVeo || modelType.isImagen4) {
              setSeed(void 0);
            }
            if (modelType.isImagen4) {
              setNegativePrompt("");
            }
            if (modelType.isKling25) {
              setNegativePrompt("");
              setCfgScale(void 0);
            }
            clearFiles();
          }
        });
      },
      [
        isDisabled,
        handleSubmit,
        prompt,
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
        clearFiles
      ]
    );
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
    return /* @__PURE__ */ jsxDEV("div", { id: "chat-input", className: "border-t border-border bg-background p-4", children: [
      attachedFiles.length > 0 ? /* @__PURE__ */ jsxDEV("div", { className: "mb-3 flex flex-wrap gap-2 items-center", children: [
        attachedFiles.map((file) => {
          const isVideo = file.file.type.startsWith("video/");
          return /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "group relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-secondary shadow-sm",
              children: [
                isVideo ? /* @__PURE__ */ jsxDEV(
                  "video",
                  {
                    src: file.preview,
                    className: "h-full w-full object-cover"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                    lineNumber: 568,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                    lineNumber: 574,
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
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                      lineNumber: 584,
                      columnNumber: 41
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                    lineNumber: 580,
                    columnNumber: 37
                  },
                  this
                )
              ]
            },
            file.id,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
              lineNumber: 563,
              columnNumber: 33
            },
            this
          );
        }),
        attachingFile && /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 ml-2 animate-spin" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
          lineNumber: 590,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 559,
        columnNumber: 21
      }, this) : attachingFile && /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 mb-4 mx-4 animate-spin" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 595,
        columnNumber: 25
      }, this),
      modelType.isKling25 && /* @__PURE__ */ jsxDEV("p", { className: "mb-2 text-xs text-muted-foreground", children: "\u0414\u043B\u044F image-to-video: \u043F\u0435\u0440\u0432\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u2014 \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u0430\u0434\u0440, \u0432\u0442\u043E\u0440\u043E\u0435 \u2014 \u0444\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u0430\u0434\u0440 (tail)" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 601,
        columnNumber: 21
      }, this),
      modelType.isSeedream4_5_Edit && /* @__PURE__ */ jsxDEV("p", { className: "mb-2 text-xs text-muted-foreground", children: "Seedream 4.5 Edit \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0434\u043E 14 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0434\u043B\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 609,
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
            disabled: isDisabled
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 617,
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 627,
            columnNumber: 21
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 616,
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
          lineNumber: 659,
          columnNumber: 29
        },
        this
      ) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 658,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 657,
        columnNumber: 21
      }, this),
      modelType.isImagen4 && /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 mb-2", children: [
        /* @__PURE__ */ jsxDEV(
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 675,
            columnNumber: 25
          },
          this
        ),
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 683,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 674,
        columnNumber: 21
      }, this),
      modelType.isKling25 && /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 mb-2", children: [
        /* @__PURE__ */ jsxDEV(
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 696,
            columnNumber: 25
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 704,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 695,
        columnNumber: 21
      }, this),
      modelType.isElevenLabs && /* @__PURE__ */ jsxDEV("div", { className: "mb-2 space-y-2", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-muted-foreground", children: "\u0413\u043E\u043B\u043E\u0441" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 721,
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
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                  lineNumber: 730,
                  columnNumber: 41
                }, this) }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                  lineNumber: 729,
                  columnNumber: 37
                }, this),
                /* @__PURE__ */ jsxDEV(SelectContent, { className: "border-border bg-card", children: elevenLabsVoices.map((voiceOption) => /* @__PURE__ */ jsxDEV(
                  SelectItem,
                  {
                    value: voiceOption,
                    className: "text-foreground focus:bg-secondary focus:text-foreground",
                    children: voiceOption
                  },
                  voiceOption,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                    lineNumber: 734,
                    columnNumber: 45
                  },
                  this
                )) }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                  lineNumber: 732,
                  columnNumber: 37
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
              lineNumber: 724,
              columnNumber: 33
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
          lineNumber: 720,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-muted-foreground", children: "\u0421\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C (0-1)" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 746,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
              lineNumber: 749,
              columnNumber: 33
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
          lineNumber: 745,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-muted-foreground", children: "\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u0430 (0-1)" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 763,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
              lineNumber: 766,
              columnNumber: 33
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
          lineNumber: 762,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-muted-foreground", children: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C (0.5-2)" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 780,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
              lineNumber: 783,
              columnNumber: 33
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
          lineNumber: 779,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "mb-1 text-xs text-slate-400", children: "\u041A\u043E\u0434 \u044F\u0437\u044B\u043A\u0430 (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E)" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
            lineNumber: 797,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
              lineNumber: 800,
              columnNumber: 33
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
          lineNumber: 796,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 719,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 718,
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
                accept: "image/*,video/*",
                multiple: true,
                onChange: handleFileSelect,
                className: "hidden"
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                lineNumber: 826,
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
                  "min-h-[76px] max-h-[20vh] resize-none border-border bg-secondary pb-10 pl-4 pr-12 text-foreground placeholder:text-muted-foreground rounded-xl transition-all",
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                lineNumber: 834,
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                lineNumber: 858,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                    lineNumber: 883,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                  lineNumber: 870,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                    lineNumber: 906,
                    columnNumber: 33
                  }, this) : /* @__PURE__ */ jsxDEV(Unlock, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                    lineNumber: 908,
                    columnNumber: 33
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                  lineNumber: 887,
                  columnNumber: 25
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
              lineNumber: 869,
              columnNumber: 21
            }, this),
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
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                  lineNumber: 933,
                  columnNumber: 29
                }, this) : /* @__PURE__ */ jsxDEV(Send, { className: "h-4 w-4" }, void 0, false, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                  lineNumber: 935,
                  columnNumber: 29
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
                lineNumber: 914,
                columnNumber: 21
              },
              this
            )
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
          lineNumber: 816,
          columnNumber: 17
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("p", { className: "mt-2 text-xs text-muted-foreground", children: "Enter \u2014 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C, Shift+Enter \u2014 \u043D\u043E\u0432\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430. \u041C\u043E\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u0442\u044C \u0444\u0430\u0439\u043B\u044B \u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u044C \u0438\u0437 \u0431\u0443\u0444\u0435\u0440\u0430 \u043E\u0431\u043C\u0435\u043D\u0430 (Ctrl+V/Cmd+V)" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
        lineNumber: 941,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/chat-input.tsx",
      lineNumber: 556,
      columnNumber: 13
    }, this);
  }
);

export { Button as B, ChatSidebar as C, Dialog as D, ModelBadge as M, PANEL_HEADER_CLASSES as P, ScrollArea as S, ChatInput as a, createLoadingEffectForAttachFile as b, cn as c, PANEL_HEADER_TITLE_CLASSES as d, Skeleton as e, DialogContent as f, getModelIcon as g, DialogTitle as h, downloadFile as i, getProviderDisplayName as j, isVideoDataUrl as k, formatTime as l, formatFileSize as m, Badge as n, useTestMode as u };
//# sourceMappingURL=chat-input-BHukpy2u.mjs.map
