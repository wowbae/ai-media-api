import { jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Loader2, Pin, ChevronDown, ImageIcon, VideoIcon, RefreshCcw, Download, X, Copy, AlertCircle, Paperclip, Trash2, Maximize2, CheckCircle2, FileIcon, Video, AudioLines } from 'lucide-react';
import { u as useTestMode, C as ChatSidebar, a as ChatInput, c as cn, g as getModelIcon, M as ModelBadge, S as ScrollArea, b as createLoadingEffectForAttachFile, P as PANEL_HEADER_CLASSES, d as PANEL_HEADER_TITLE_CLASSES, e as Skeleton, D as Dialog, f as DialogContent, h as DialogTitle, i as getOriginalFileUrl, B as Button, j as downloadFile, k as getProviderDisplayName, l as getMediaFileUrl, t as toDirectImageUrl, m as isVideoDataUrl, n as formatTime, o as formatFileSize, p as Badge } from './chat-input-zdWjKpr9.mjs';
import { R as Route, f as useGetChatQuery, h as useUpdateChatMutation, i as useGenerateMediaMutation, j as useLazyGetRequestQuery, d as useGetModelsQuery, b as useDeleteFileMutation, e as useGetFilesQuery, g as useGetPricingQuery, c as useUploadThumbnailMutation } from './router-CBoM9UO_.mjs';
import '@tanstack/react-router';
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                  lineNumber: 138,
                  columnNumber: 33
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                  lineNumber: 148,
                  columnNumber: 29
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                  lineNumber: 159,
                  columnNumber: 33
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 152,
                columnNumber: 29
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 175,
                columnNumber: 29
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 168,
              columnNumber: 25
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 167,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxDEV(TypeIcon, { type: file.type }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 183,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-muted-foreground", children: formatFileSize(file.size || 0) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 184,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 182,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 181,
            columnNumber: 17
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                    lineNumber: 213,
                    columnNumber: 37
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                    lineNumber: 220,
                    columnNumber: 37
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                  lineNumber: 215,
                  columnNumber: 33
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 207,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between text-white", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "font-medium text-foreground", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 225,
                columnNumber: 37
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-muted-foreground", children: getImageDimensions(
                file.width,
                file.height
              ) }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 228,
                columnNumber: 37
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 224,
              columnNumber: 33
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 223,
              columnNumber: 29
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 201,
            columnNumber: 25
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
        lineNumber: 194,
        columnNumber: 21
      },
      this
    ) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 193,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 309,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 308,
          columnNumber: 17
        }, this),
        hasError ? /* @__PURE__ */ jsxDEV("div", { className: "flex h-full items-center justify-center bg-secondary", children: /* @__PURE__ */ jsxDEV(FileIcon, { className: "h-8 w-8 text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 314,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 508,
          columnNumber: 29
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-muted-foreground", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0432\u0438\u0434\u0435\u043E..." }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 509,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
        lineNumber: 507,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 515,
          columnNumber: 17
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 532,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV("div", { className: "rounded-full bg-white/20 p-4 backdrop-blur-sm animate-pulse", children: /* @__PURE__ */ jsxDEV(Video, { className: "h-8 w-8 text-white" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 535,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 534,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 533,
            columnNumber: 17
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 551,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 550,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u044F" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 553,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 549,
          columnNumber: 17
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 567,
            columnNumber: 13
          },
          this
        ),
        !isPreviewLoaded && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center bg-secondary", children: /* @__PURE__ */ jsxDEV(Video, { className: "h-8 w-8 animate-pulse text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 588,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 587,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-black/0 transition-colors hover:bg-black/10" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 592,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 563,
      columnNumber: 9
    },
    this
  );
}
function AudioPreview({ originalUrl, filename }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "flex aspect-video flex-col items-center justify-center gap-3 bg-secondary p-4", children: [
    /* @__PURE__ */ jsxDEV(AudioLines, { className: "h-12 w-12 text-primary" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 607,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-muted-foreground text-center max-w-full truncate", children: filename }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 608,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("audio", { src: originalUrl, controls: true, className: "w-full" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 611,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
    lineNumber: 606,
    columnNumber: 9
  }, this);
}
function TypeIcon({ type }) {
  const config = {
    IMAGE: { icon: ImageIcon },
    VIDEO: { icon: Video },
    AUDIO: { icon: AudioLines }
  };
  const { icon: Icon } = config[type];
  return /* @__PURE__ */ jsxDEV(Icon, { className: "h-4 w-4 text-muted-foreground" }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
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
  const config = {
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
  const { icon: Icon, label, className } = config[status] ?? config.PROCESSING;
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
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/status-badge.tsx",
        lineNumber: 44,
        columnNumber: 13
      },
      this
    ),
    label
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/status-badge.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
      lineNumber: 60,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
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
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
      lineNumber: 74,
      columnNumber: 17
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 172,
              columnNumber: 29
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 186,
              columnNumber: 29
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 178,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 201,
              columnNumber: 29
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 191,
          columnNumber: 21
        }, this),
        (request.inputFiles && request.inputFiles.length > 0 || request.files && request.files.length > 0 && (!request.inputFiles || request.inputFiles.length === 0)) && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 flex flex-wrap gap-2", children: [
          request.inputFiles?.map((fileUrl, index) => {
            if (!fileUrl) return null;
            const isDataUrl = fileUrl.startsWith("data:");
            const isHttpUrl = fileUrl.startsWith("http://") || fileUrl.startsWith("https://");
            const fallbackFile = request.files?.[index];
            const localUrls = [];
            const externalUrls = [];
            if (fallbackFile) {
              if (fallbackFile.path) localUrls.push(getMediaFileUrl(fallbackFile.path));
              if (fallbackFile.previewPath) localUrls.push(getMediaFileUrl(fallbackFile.previewPath));
              if (fallbackFile.url) externalUrls.push(toDirectImageUrl(fallbackFile.url));
            }
            if (isDataUrl) {
              localUrls.unshift(fileUrl);
            } else if (!isHttpUrl && fileUrl) {
              const localUrl = getMediaFileUrl(fileUrl);
              if (!localUrls.includes(localUrl)) localUrls.unshift(localUrl);
            } else if (isHttpUrl) {
              externalUrls.push(toDirectImageUrl(fileUrl));
            } else {
              return null;
            }
            const allUrls = [.../* @__PURE__ */ new Set([...localUrls, ...externalUrls])];
            const isVideo = isDataUrl ? isVideoDataUrl(fileUrl) : fileUrl.match(/\.(mp4|webm|mov)$/i) !== null;
            return /* @__PURE__ */ jsxDEV(
              AttachedFileThumbnail,
              {
                urls: allUrls,
                alt: `\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043D\u044B\u0439 \u0444\u0430\u0439\u043B ${index + 1}`,
                isVideo
              },
              index,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 251,
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 272,
                columnNumber: 41
              },
              this
            );
          })
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 287,
              columnNumber: 37
            }, this),
            request.seed && /* @__PURE__ */ jsxDEV("span", { className: "text-primary-foreground/50", children: [
              "\u2022 Seed: ",
              request.seed
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 292,
              columnNumber: 37
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 284,
            columnNumber: 29
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: formatTime(request.createdAt) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 298,
            columnNumber: 25
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 282,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
        lineNumber: 190,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 314,
              columnNumber: 29
            }, this),
            request.status === "FAILED" && request.errorMessage && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive", children: [
              /* @__PURE__ */ jsxDEV(AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 320,
                columnNumber: 41
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "min-w-0 flex-1 text-xs whitespace-pre-wrap break-all overflow-x-auto", children: request.errorMessage }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 321,
                columnNumber: 41
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 319,
              columnNumber: 37
            }, this),
            (request.status === "PENDING" || request.status === "PROCESSING" || request.status === "COMPLETING") && /* @__PURE__ */ jsxDEV("div", { className: "mt-3 space-y-3", children: /* @__PURE__ */ jsxDEV(Skeleton, { className: "aspect-square w-48 rounded-xl" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 333,
              columnNumber: 37
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 331,
              columnNumber: 33
            }, this),
            request.status === "COMPLETED" && request.files.length === 0 && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 rounded-lg bg-primary/10 p-3 text-primary", children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm", children: "\u26A0\uFE0F \u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430, \u043D\u043E \u0444\u0430\u0439\u043B\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 341,
              columnNumber: 41
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 340,
              columnNumber: 37
            }, this),
            request.completedAt && /* @__PURE__ */ jsxDEV("p", { className: "mt-2 text-xs text-slate-500", children: [
              "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E: ",
              formatTime(request.completedAt)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 350,
              columnNumber: 33
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 310,
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
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 371,
                        columnNumber: 53
                      },
                      this
                    )
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                    lineNumber: 368,
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
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 417,
                        columnNumber: 69
                      }, this) : /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 419,
                        columnNumber: 69
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 381,
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
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 438,
                        columnNumber: 57
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 424,
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
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 454,
                        columnNumber: 61
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 442,
                      columnNumber: 57
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                  lineNumber: 377,
                  columnNumber: 49
                }, this)
              ]
            },
            file.id,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 364,
              columnNumber: 45
            },
            this
          );
        }) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 361,
          columnNumber: 33
        }, this),
        request.completedAt && /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-500", children: [
          "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E:",
          " ",
          formatTime(request.completedAt)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 464,
          columnNumber: 37
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
        lineNumber: 360,
        columnNumber: 29
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
      lineNumber: 305,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
      lineNumber: 304,
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 484,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                    lineNumber: 488,
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
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 515,
                        columnNumber: 37
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 495,
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
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 522,
                        columnNumber: 37
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 517,
                      columnNumber: 33
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                  lineNumber: 494,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 487,
                columnNumber: 25
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 480,
            columnNumber: 21
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
        lineNumber: 476,
        columnNumber: 17
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
    lineNumber: 157,
    columnNumber: 9
  }, this);
}
function MessageSkeleton() {
  return /* @__PURE__ */ jsxDEV("div", { className: "mb-6 space-y-3", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-16 w-64 rounded-2xl" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-skeleton.tsx",
      lineNumber: 8,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-skeleton.tsx",
      lineNumber: 7,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex justify-start", children: /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-48 w-80 rounded-2xl" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-skeleton.tsx",
      lineNumber: 11,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-skeleton.tsx",
      lineNumber: 10,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-skeleton.tsx",
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
  onScrollToBottomRef
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
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
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
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [requests.length, requestsStatusKey]);
  if (isLoading) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex-1 p-4", children: [
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 119,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 120,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 121,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
      lineNumber: 118,
      columnNumber: 13
    }, this);
  }
  if (requests.length === 0) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center p-8 text-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-4 rounded-full bg-secondary p-6", children: /* @__PURE__ */ jsxDEV("span", { className: "text-4xl", children: "\u{1F3A8}" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 130,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 129,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "mb-2 text-xl font-semibold text-white", children: "\u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 132,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "max-w-md text-slate-400", children: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0440\u043E\u043C\u043F\u0442 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C, \u0447\u0442\u043E\u0431\u044B \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435, \u0432\u0438\u0434\u0435\u043E \u0438\u043B\u0438 \u0430\u0443\u0434\u0438\u043E \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E AI" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 135,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mt-4", children: /* @__PURE__ */ jsxDEV(ModelBadge, { model: chatModel }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 140,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 139,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
      lineNumber: 128,
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
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
            lineNumber: 160,
            columnNumber: 25
          },
          this
        )),
        /* @__PURE__ */ jsxDEV("div", { ref: messagesEndRef }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
          lineNumber: 169,
          columnNumber: 21
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
      lineNumber: 155,
      columnNumber: 17
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
    lineNumber: 154,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
    lineNumber: 153,
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
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
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 80,
                columnNumber: 25
              },
              this
            ) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 79,
              columnNumber: 21
            }, this),
            file.type === "AUDIO" && /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4 rounded-xl bg-secondary p-8 shadow-2xl border border-border", children: [
              /* @__PURE__ */ jsxDEV("audio", { src: fileUrl, controls: true }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 91,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-foreground font-medium", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 92,
                columnNumber: 25
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                    lineNumber: 117,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                    lineNumber: 132,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                    lineNumber: 145,
                    columnNumber: 25
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
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
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                      lineNumber: 163,
                      columnNumber: 29
                    },
                    this
                  )
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                    lineNumber: 180,
                    columnNumber: 25
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                  lineNumber: 170,
                  columnNumber: 21
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 99,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between text-white", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "font-medium", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 187,
                columnNumber: 25
              }, this),
              file.size && /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-slate-300", children: formatFileSize(file.size) }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 189,
                columnNumber: 29
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 186,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 185,
              columnNumber: 17
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
          lineNumber: 66,
          columnNumber: 13
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
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
      alert("\u041E\u0448\u0438\u0431\u043A\u0430: \u0443 \u0444\u0430\u0439\u043B\u0430 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u0443\u0442\u044C \u0438\u043B\u0438 URL. \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u0430\u0439\u043B.");
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
        /* @__PURE__ */ jsxDEV("div", { onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxDEV(
          MediaPreview,
          {
            file,
            className: "h-full w-full"
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
            lineNumber: 85,
            columnNumber: 17
          },
          this
        ) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
          lineNumber: 84,
          columnNumber: 13
        }, this),
        onAttachFile && /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: "absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100",
            onClick: handleAttach,
            title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
            children: attachingFile ? /* @__PURE__ */ jsxDEV(Loader2, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
              lineNumber: 101,
              columnNumber: 25
            }, this) : /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-3.5 w-3.5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
              lineNumber: 103,
              columnNumber: 25
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
            lineNumber: 93,
            columnNumber: 17
          },
          this
        ),
        onRepeatRequest && /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "icon",
            variant: "ghost",
            className: "absolute left-8 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 focus:text-cyan-400 focus:bg-cyan-600/20 group-hover:opacity-100",
            onClick: (e) => {
              e.stopPropagation();
              onRepeatRequest(file.requestId);
            },
            title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441",
            children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-3.5 w-3.5" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
              lineNumber: 120,
              columnNumber: 21
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
            lineNumber: 110,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
              lineNumber: 136,
              columnNumber: 21
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
            lineNumber: 126,
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
            children: /* @__PURE__ */ jsxDEV(Pin, { className: `h-3.5 w-3.5 ${isPinned ? "fill-current" : ""}` }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
              lineNumber: 156,
              columnNumber: 21
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
            lineNumber: 142,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
              lineNumber: 169,
              columnNumber: 17
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
            lineNumber: 161,
            columnNumber: 13
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/gallery-file-card.tsx",
      lineNumber: 69,
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
  onRepeatRequest
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
      chatId
      // Передаем chatId для фильтрации
    },
    {
      // Пропускаем запрос, если chatId не указан
      skip: chatId === void 0
    }
  );
  const { data: chatData } = useGetChatQuery(
    { id: chatId, limit: 1e3 },
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
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full w-[30%] flex-col border-l border-border bg-background", children: [
      /* @__PURE__ */ jsxDEV("div", { className: PANEL_HEADER_CLASSES, children: /* @__PURE__ */ jsxDEV("h2", { className: PANEL_HEADER_TITLE_CLASSES, children: "\u041C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u044B" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 310,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 309,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(ScrollArea, { className: "flex-1", children: /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2 p-4", children: Array.from({ length: INITIAL_FILES_LIMIT }).map(
        (_, index) => /* @__PURE__ */ jsxDEV(
          Skeleton,
          {
            className: "aspect-square w-full rounded-xl"
          },
          `skeleton-${index}`,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 316,
            columnNumber: 33
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 313,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 312,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
      lineNumber: 308,
      columnNumber: 13
    }, this);
  }
  if (accumulatedFiles.length === 0) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full w-[30%] flex-col border-l border-border bg-background", children: [
      /* @__PURE__ */ jsxDEV("div", { className: PANEL_HEADER_CLASSES, children: /* @__PURE__ */ jsxDEV("h2", { className: PANEL_HEADER_TITLE_CLASSES, children: "\u041C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u044B" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 332,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 331,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0435\u0442 \u043C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u043E\u0432" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 335,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 334,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
      lineNumber: 330,
      columnNumber: 13
    }, this);
  }
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex h-full w-[30%] flex-col border-l border-border bg-background", children: [
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 351,
              columnNumber: 21
            }, this),
            totalCost > 0 && /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20", children: formatCost(totalCost) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 355,
              columnNumber: 25
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 345,
          columnNumber: 17
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(ScrollArea, { className: "flex-1", children: /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-4", children: [
        pinnedImages.length > 0 && /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setIsPinnedExpanded(!isPinnedExpanded),
              className: "flex w-full items-center justify-between rounded-lg bg-transparent px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors",
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 items-center", children: [
                  /* @__PURE__ */ jsxDEV(Pin, { className: "h-4 w-4 text-yellow-400" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 374,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0417\u0430\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043D\u044B\u0435 (",
                    pinnedImages.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 375,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 373,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 379,
                    columnNumber: 37
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 367,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 388,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 386,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 366,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 417,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F (",
                    unpinnedImages.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 418,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 416,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 423,
                    columnNumber: 37
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 410,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 432,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 430,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 409,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 461,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0412\u0438\u0434\u0435\u043E (",
                    videoFiles.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 462,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 460,
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
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 465,
                    columnNumber: 37
                  },
                  this
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 454,
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
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 474,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 472,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 453,
          columnNumber: 29
        }, this),
        filesData?.pagination && filesData.pagination.page < filesData.pagination.totalPages && /* @__PURE__ */ jsxDEV(
          "div",
          {
            ref: loadMoreTriggerRef,
            className: "flex h-20 items-center justify-center",
            children: isFetching ? /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-400", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 501,
              columnNumber: 41
            }, this) : /* @__PURE__ */ jsxDEV("div", { className: "h-1 w-1 rounded-full bg-slate-600" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 505,
              columnNumber: 41
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 496,
            columnNumber: 33
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 363,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 362,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
      lineNumber: 343,
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
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 528,
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
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 532,
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
                        className: "h-9 w-9 text-slate-400 hover:text-cyan-400 focus:text-cyan-400",
                        title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441",
                        children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-4 w-4" }, void 0, false, {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                          lineNumber: 552,
                          columnNumber: 49
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 540,
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
                          const downloadUrl = getOriginalFileUrl(selectedFile);
                          if (!downloadUrl) {
                            console.warn("[MediaGallery] \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B: \u043D\u0435\u0442 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E URL", selectedFile);
                            return;
                          }
                          downloadFile(downloadUrl, selectedFile.filename);
                        },
                        title: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B",
                        children: /* @__PURE__ */ jsxDEV(Download, { className: "h-4 w-4" }, void 0, false, {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                          lineNumber: 568,
                          columnNumber: 45
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 555,
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
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                          lineNumber: 577,
                          columnNumber: 45
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 570,
                        columnNumber: 41
                      },
                      this
                    )
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 538,
                    columnNumber: 37
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 531,
                  columnNumber: 33
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 524,
              columnNumber: 29
            },
            this
          )
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 518,
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
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 586,
          columnNumber: 25
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
      lineNumber: 515,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
    lineNumber: 342,
    columnNumber: 9
  }, this);
}
function MediaChatPage() {
  const {
    chatId
  } = Route.useParams();
  const chatIdNum = parseInt(chatId);
  const {
    data: chat,
    isLoading: isChatLoading,
    isFetching: isChatFetching,
    error: chatError,
    refetch
  } = useGetChatQuery({
    id: chatIdNum,
    limit: 10
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
  } = useGetModelsQuery();
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
      /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 189,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 191,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 190,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 188,
      columnNumber: 12
    }, this);
  }
  if (chatError && !chat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 199,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-destructive", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0447\u0430\u0442\u0430" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 201,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground mt-2", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0447\u0430\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C." }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 204,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 200,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 198,
      columnNumber: 12
    }, this);
  }
  if (!chat && !isChatLoading && !chatError) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 215,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-muted-foreground", children: "\u0427\u0430\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 217,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0447\u0430\u0442 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 220,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 216,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 214,
      columnNumber: 12
    }, this);
  }
  const activeChat = chat && chat.id === chatIdNum ? chat : null;
  if (!activeChat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 235,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 237,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 236,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 234,
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
      const request = await getRequestTrigger(requestId).unwrap();
      if (request) {
        await handleRepeatRequest(request);
      }
    } catch (error) {
      console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u0440\u043E\u0441\u0430:", error);
      alert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u0434\u043B\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F");
    }
  }
  const showUpdatingIndicator = isChatFetching && !isChatLoading;
  return /* @__PURE__ */ jsxDEV("div", { className: "flex h-[calc(100vh-3.5rem)] bg-background", children: [
    /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 326,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "relative flex flex-1 flex-col", children: [
      /* @__PURE__ */ jsxDEV(ChatHeader, { name: activeChat.name, model: currentModel, showUpdating: showUpdatingIndicator }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 331,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageList, { requests: finalRequests, chatModel: currentModel, onEditPrompt: handleEditPrompt, onAttachFile: handleAttachFile, onRepeatRequest: handleRepeatRequest, onScrollStateChange: setShowScrollButton, onScrollToBottomRef: (scrollFn) => {
        scrollToBottomRef.current = scrollFn;
      } }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 334,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(ChatInput, { ref: chatInputRef, chatId: chatIdNum, currentModel, onModelChange: handleModelChange, onRequestCreated: handleRequestCreated, onPendingMessage: handleAddPendingMessage, onSendError: handleSendError, scrollToBottom: () => scrollToBottomRef.current?.(), showScrollButton }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 339,
        columnNumber: 17
      }, this)
    ] }, chatIdNum, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 329,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(MediaGallery, { chatId: chatIdNum, onAttachFile: handleAttachFile, onRepeatRequest: handleRepeatRequestById }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 343,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 324,
    columnNumber: 10
  }, this);
}
function ChatHeader({
  name,
  model,
  showUpdating
}) {
  const {
    data: models
  } = useGetModelsQuery();
  const modelInfo = models?.find((m) => m.key === model);
  return /* @__PURE__ */ jsxDEV("div", { className: cn(PANEL_HEADER_CLASSES, "bg-background"), children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsxDEV("span", { className: "text-2xl", children: getModelIcon(model) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 362,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("h1", { className: "font-semibold text-foreground", children: name }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 365,
          columnNumber: 25
        }, this),
        showUpdating && /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin text-muted-foreground" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 368,
          columnNumber: 42
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 364,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-muted-foreground", children: modelInfo?.name || model }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 370,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 363,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 361,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 360,
    columnNumber: 10
  }, this);
}

export { MediaChatPage as component };
//# sourceMappingURL=_chatId-DcPX6vRp.mjs.map
