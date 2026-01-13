import { jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Loader2, ChevronDown, Pin, Paperclip, RefreshCcw, Trash2, ImageIcon, VideoIcon, Maximize2, Download, X, AlertCircle, CheckCircle2, FileIcon, Video, AudioLines } from 'lucide-react';
import { u as useTestMode, C as ChatSidebar, a as ChatInput, c as cn, g as getModelIcon, M as ModelBadge, S as ScrollArea, B as Button, b as createLoadingEffectForAttachFile, P as PANEL_HEADER_CLASSES, d as PANEL_HEADER_TITLE_CLASSES, e as Skeleton, D as Dialog, f as DialogContent, h as DialogTitle, i as downloadFile, j as getProviderDisplayName, k as isVideoDataUrl, l as formatTime, m as formatFileSize, n as Badge } from './chat-input-BHukpy2u.mjs';
import { R as Route, g as useGetChatQuery, h as useUpdateChatMutation, i as useGenerateMediaMutation, j as useLazyGetRequestQuery, k as useGetRequestQuery, e as useGetModelsQuery, c as useDeleteFileMutation, f as useGetFilesQuery, d as useUploadThumbnailMutation } from './router-ZQUnxrzB.mjs';
import { getMediaFileUrl } from './constants-SLUBuX75.mjs';
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
function MediaPreview({
  file,
  showDelete = false,
  className,
  onAttach
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
  const originalFileUrl = file.path ? getMediaFileUrl(file.path) : file.url || null;
  const imagePreviewUrl = file.previewUrl || (file.previewPath ? getMediaFileUrl(file.previewPath) : null) || file.url || originalFileUrl;
  async function handleDelete() {
    try {
      await deleteFile(file.id).unwrap();
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F:", error);
    }
  }
  function handleDownload() {
    if (originalFileUrl) {
      downloadFile(originalFileUrl, file.filename);
    } else {
      console.warn("[MediaPreview] \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B: \u043D\u0435\u0442 URL \u0438\u043B\u0438 path", file);
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
              alt: file.filename,
              onClick: () => setIsFullscreen(true)
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 86,
              columnNumber: 11
            },
            this
          ),
          file.type === "VIDEO" && /* @__PURE__ */ jsxDEV(
            VideoPreview,
            {
              fileId: file.id,
              previewUrl: file.previewUrl || file.previewPath,
              originalUrl: originalFileUrl || "",
              filename: file.filename
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 94,
              columnNumber: 11
            },
            this
          ),
          file.type === "AUDIO" && /* @__PURE__ */ jsxDEV(AudioPreview, { originalUrl: originalFileUrl || "", filename: file.filename }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 103,
            columnNumber: 11
          }, this),
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
                  lineNumber: 116,
                  columnNumber: 17
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 110,
                columnNumber: 15
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
                  lineNumber: 126,
                  columnNumber: 15
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 120,
                columnNumber: 13
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
                  lineNumber: 137,
                  columnNumber: 17
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 130,
                columnNumber: 15
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 108,
            columnNumber: 11
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
                lineNumber: 153,
                columnNumber: 15
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 146,
              columnNumber: 13
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 145,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxDEV(TypeIcon, { type: file.type }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 161,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-muted-foreground", children: formatFileSize(file.size || 0) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 162,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 160,
            columnNumber: 11
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 159,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
        lineNumber: 78,
        columnNumber: 7
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
            lineNumber: 176,
            columnNumber: 13
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
                lineNumber: 180,
                columnNumber: 15
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
                    lineNumber: 191,
                    columnNumber: 19
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                  lineNumber: 186,
                  columnNumber: 17
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
                    lineNumber: 198,
                    columnNumber: 19
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                  lineNumber: 193,
                  columnNumber: 17
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 185,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between text-white", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "font-medium text-foreground", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 203,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-muted-foreground", children: getImageDimensions(file.width, file.height) }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
                lineNumber: 204,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 202,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
              lineNumber: 201,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 179,
            columnNumber: 13
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
        lineNumber: 172,
        columnNumber: 11
      },
      this
    ) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 171,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
    lineNumber: 77,
    columnNumber: 5
  }, this);
}
function ImagePreview({ src, alt, onClick }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "relative aspect-square cursor-pointer overflow-hidden",
      onClick,
      children: [
        !isLoaded && !hasError && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center bg-secondary", children: /* @__PURE__ */ jsxDEV(ImageIcon, { className: "h-8 w-8 animate-pulse text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 235,
          columnNumber: 11
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 234,
          columnNumber: 9
        }, this),
        hasError ? /* @__PURE__ */ jsxDEV("div", { className: "flex h-full items-center justify-center bg-secondary", children: /* @__PURE__ */ jsxDEV(FileIcon, { className: "h-8 w-8 text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 240,
          columnNumber: 11
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 239,
          columnNumber: 9
        }, this) : /* @__PURE__ */ jsxDEV(
          "img",
          {
            src,
            alt,
            loading: "lazy",
            className: cn(
              "h-full w-full object-cover transition-opacity",
              isLoaded ? "opacity-100" : "opacity-0"
            ),
            onLoad: () => setIsLoaded(true),
            onError: () => setHasError(true)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 243,
            columnNumber: 9
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 229,
      columnNumber: 5
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
  const [uploadThumbnail] = useUploadThumbnailMutation();
  const isPendingPreview = previewUrl?.startsWith("__pending__") ?? false;
  const actualPreviewUrl = isPendingPreview && previewUrl ? previewUrl.replace("__pending__", "") : previewUrl;
  useEffect(() => {
    if (previewUrl || isGeneratingThumbnail || thumbnailGeneratedRef.current || isThumbnailPending(fileId)) {
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
        console.warn("[VideoPreview] \u041E\u0448\u0438\u0431\u043A\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 thumbnail:", error);
      } finally {
        setIsGeneratingThumbnail(false);
        unmarkThumbnailPending(fileId);
      }
    }
    generateThumbnail();
  }, [fileId, previewUrl, originalUrl, isGeneratingThumbnail, uploadThumbnail]);
  function handlePlay() {
    setShouldLoadOriginal(true);
  }
  const displayPreviewUrl = actualPreviewUrl ? actualPreviewUrl.startsWith("data:") ? actualPreviewUrl : actualPreviewUrl.startsWith("http://") || actualPreviewUrl.startsWith("https://") ? actualPreviewUrl : getMediaFileUrl(actualPreviewUrl) : localThumbnail;
  if (shouldLoadOriginal) {
    return /* @__PURE__ */ jsxDEV("div", { className: "group/video relative aspect-square", children: /* @__PURE__ */ jsxDEV(
      "video",
      {
        src: originalUrl,
        poster: displayPreviewUrl || void 0,
        controls: true,
        className: "h-full w-full object-cover video-controls-on-hover"
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
        lineNumber: 356,
        columnNumber: 9
      },
      this
    ) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 355,
      columnNumber: 7
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
            lineNumber: 373,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV("div", { className: "rounded-full bg-white/20 p-4 backdrop-blur-sm animate-pulse", children: /* @__PURE__ */ jsxDEV(Video, { className: "h-8 w-8 text-white" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 376,
            columnNumber: 13
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 375,
            columnNumber: 11
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 374,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
        lineNumber: 369,
        columnNumber: 7
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
            lineNumber: 392,
            columnNumber: 13
          }, this) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 391,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u044F" }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 394,
            columnNumber: 11
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 390,
          columnNumber: 9
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
        lineNumber: 386,
        columnNumber: 7
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
            onError: () => {
              setHasPreviewError(true);
            }
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
            lineNumber: 406,
            columnNumber: 7
          },
          this
        ),
        !isPreviewLoaded && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center bg-secondary", children: /* @__PURE__ */ jsxDEV(Video, { className: "h-8 w-8 animate-pulse text-muted-foreground/50" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 421,
          columnNumber: 11
        }, this) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 420,
          columnNumber: 9
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-black/0 transition-colors hover:bg-black/10" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
          lineNumber: 425,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 402,
      columnNumber: 5
    },
    this
  );
}
function AudioPreview({ originalUrl, filename }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "flex aspect-video flex-col items-center justify-center gap-3 bg-secondary p-4", children: [
    /* @__PURE__ */ jsxDEV(AudioLines, { className: "h-12 w-12 text-primary" }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 440,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-muted-foreground text-center max-w-full truncate", children: filename }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
      lineNumber: 441,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "audio",
      {
        src: originalUrl,
        controls: true,
        className: "w-full"
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
        lineNumber: 444,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-preview.tsx",
    lineNumber: 439,
    columnNumber: 5
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
    lineNumber: 467,
    columnNumber: 10
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
  const { icon: Icon, label, className } = config[status];
  const shouldSpin = status === "PROCESSING" || status === "PENDING";
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
        lineNumber: 39,
        columnNumber: 13
      },
      this
    ),
    label
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/status-badge.tsx",
    lineNumber: 38,
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
            children: /* @__PURE__ */ jsxDEV("span", { className: "text-lg", children: "\u2728" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 116,
              columnNumber: 29
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 108,
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
              lineNumber: 129,
              columnNumber: 29
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 121,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
        lineNumber: 105,
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
              lineNumber: 135,
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
              lineNumber: 144,
              columnNumber: 29
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 134,
          columnNumber: 21
        }, this),
        request.inputFiles && request.inputFiles.length > 0 && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 flex flex-wrap gap-2", children: request.inputFiles.map((fileUrl, index) => {
          if (!fileUrl) {
            return null;
          }
          const isDataUrl = fileUrl.startsWith("data:");
          const isHttpUrl = fileUrl.startsWith("http://") || fileUrl.startsWith("https://");
          if (!isDataUrl && !isHttpUrl) {
            return null;
          }
          const isVideo = isDataUrl ? isVideoDataUrl(fileUrl) : false;
          return /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "h-16 w-16 overflow-hidden rounded-lg border border-primary-foreground/20",
              children: isVideo ? /* @__PURE__ */ jsxDEV(
                "video",
                {
                  src: fileUrl,
                  className: "h-full w-full object-cover"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                  lineNumber: 185,
                  columnNumber: 45
                },
                this
              ) : /* @__PURE__ */ jsxDEV(
                "img",
                {
                  src: fileUrl,
                  alt: `\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043D\u044B\u0439 \u0444\u0430\u0439\u043B ${index + 1}`,
                  className: "h-full w-full object-cover",
                  crossOrigin: "anonymous"
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                  lineNumber: 191,
                  columnNumber: 45
                },
                this
              )
            },
            index,
            false,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 180,
              columnNumber: 37
            },
            this
          );
        }) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 154,
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
              lineNumber: 208,
              columnNumber: 37
            }, this),
            request.seed && /* @__PURE__ */ jsxDEV("span", { className: "text-primary-foreground/50", children: [
              "\u2022 Seed: ",
              request.seed
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 213,
              columnNumber: 37
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 205,
            columnNumber: 29
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: formatTime(request.createdAt) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 219,
            columnNumber: 25
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 203,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
        lineNumber: 133,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
      lineNumber: 103,
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
              lineNumber: 235,
              columnNumber: 29
            }, this),
            request.status === "FAILED" && request.errorMessage && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive", children: [
              /* @__PURE__ */ jsxDEV(AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 241,
                columnNumber: 41
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "min-w-0 flex-1 text-xs whitespace-pre-wrap break-all overflow-x-auto", children: request.errorMessage }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 242,
                columnNumber: 41
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 240,
              columnNumber: 37
            }, this),
            (request.status === "PENDING" || request.status === "PROCESSING") && /* @__PURE__ */ jsxDEV("div", { className: "mt-3 space-y-3", children: [
              /* @__PURE__ */ jsxDEV(Skeleton, { className: "aspect-square w-48 rounded-xl" }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 253,
                columnNumber: 37
              }, this),
              /* @__PURE__ */ jsxDEV(
                "div",
                {
                  hidden: true,
                  className: "flex items-center gap-2 text-slate-400",
                  children: [
                    /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 258,
                      columnNumber: 41
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-sm", children: request.status === "PENDING" ? "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430" : "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 259,
                      columnNumber: 41
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                  lineNumber: 254,
                  columnNumber: 37
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 251,
              columnNumber: 33
            }, this),
            request.status === "COMPLETED" && request.files.length === 0 && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 rounded-lg bg-primary/10 p-3 text-primary", children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm", children: "\u26A0\uFE0F \u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430, \u043D\u043E \u0444\u0430\u0439\u043B\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 272,
              columnNumber: 41
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 271,
              columnNumber: 37
            }, this),
            request.completedAt && /* @__PURE__ */ jsxDEV("p", { className: "mt-2 text-xs text-slate-500", children: [
              "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E: ",
              formatTime(request.completedAt)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 281,
              columnNumber: 33
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 231,
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
                        lineNumber: 302,
                        columnNumber: 53
                      },
                      this
                    )
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                    lineNumber: 299,
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
                        if (!file.path)
                          return;
                        loadingEffectForAttachFile();
                        const fileUrl = getMediaFileUrl(
                          file.path
                        );
                        onAttachFile(
                          fileUrl,
                          file.filename
                        );
                      },
                      title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
                      children: attachingFile ? /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 335,
                        columnNumber: 69
                      }, this) : /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 337,
                        columnNumber: 69
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 312,
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
                        lineNumber: 356,
                        columnNumber: 57
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 342,
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
                        lineNumber: 372,
                        columnNumber: 61
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 360,
                      columnNumber: 57
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                  lineNumber: 308,
                  columnNumber: 49
                }, this)
              ]
            },
            file.id,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
              lineNumber: 295,
              columnNumber: 45
            },
            this
          );
        }) }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 292,
          columnNumber: 33
        }, this),
        request.completedAt && /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-500", children: [
          "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E:",
          " ",
          formatTime(request.completedAt)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
          lineNumber: 382,
          columnNumber: 37
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
        lineNumber: 291,
        columnNumber: 29
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
      lineNumber: 226,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
      lineNumber: 225,
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
                lineNumber: 402,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
                /* @__PURE__ */ jsxDEV(
                  "video",
                  {
                    src: fullscreenVideo.path ? getMediaFileUrl(fullscreenVideo.path) : "",
                    controls: true,
                    autoPlay: true,
                    className: "max-h-[90vh] w-full"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                    lineNumber: 406,
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
                        if (!fullscreenVideo.path) return;
                        downloadFile(
                          getMediaFileUrl(
                            fullscreenVideo.path
                          ),
                          fullscreenVideo.filename
                        );
                      },
                      children: /* @__PURE__ */ jsxDEV(Download, { className: "h-4 w-4" }, void 0, false, {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                        lineNumber: 431,
                        columnNumber: 37
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 418,
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
                        lineNumber: 438,
                        columnNumber: 37
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                      lineNumber: 433,
                      columnNumber: 33
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                  lineNumber: 417,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
                lineNumber: 405,
                columnNumber: 25
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
            lineNumber: 398,
            columnNumber: 21
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
        lineNumber: 394,
        columnNumber: 17
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-item.tsx",
    lineNumber: 101,
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
  onRepeatRequest
}) {
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const requestsStatusKey = useMemo(
    () => requests.map((r) => `${r.id}-${r.status}`).join("|"),
    [requests]
  );
  const [showScrollButton, setShowScrollButton] = useState(false);
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: "smooth"
          });
        }
      });
    });
  }, [requests.length, requestsStatusKey]);
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex-1 p-4", children: [
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 84,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 85,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageSkeleton, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 86,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
      lineNumber: 83,
      columnNumber: 13
    }, this);
  }
  if (requests.length === 0) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center p-8 text-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-4 rounded-full bg-secondary p-6", children: /* @__PURE__ */ jsxDEV("span", { className: "text-4xl", children: "\u{1F3A8}" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 95,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 94,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "mb-2 text-xl font-semibold text-white", children: "\u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 97,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "max-w-md text-slate-400", children: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0440\u043E\u043C\u043F\u0442 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C, \u0447\u0442\u043E\u0431\u044B \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435, \u0432\u0438\u0434\u0435\u043E \u0438\u043B\u0438 \u0430\u0443\u0434\u0438\u043E \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E AI" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 100,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mt-4", children: /* @__PURE__ */ jsxDEV(ModelBadge, { model: chatModel }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 105,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 104,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
      lineNumber: 93,
      columnNumber: 13
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "relative flex-1 overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV(ScrollArea, { className: "h-full bg-background", ref: scrollRef, children: /* @__PURE__ */ jsxDEV("div", { className: "space-y-6 p-4", children: [
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
          lineNumber: 116,
          columnNumber: 25
        },
        this
      )),
      /* @__PURE__ */ jsxDEV("div", { ref: messagesEndRef }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 125,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
      lineNumber: 114,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
      lineNumber: 113,
      columnNumber: 13
    }, this),
    showScrollButton && /* @__PURE__ */ jsxDEV(
      Button,
      {
        size: "icon",
        variant: "secondary",
        className: "absolute bottom-4 right-8 z-10 h-10 w-10 rounded-full bg-secondary/80 text-foreground shadow-lg backdrop-blur-sm hover:bg-secondary",
        onClick: scrollToBottom,
        children: /* @__PURE__ */ jsxDEV(ChevronDown, { className: "h-6 w-6" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
          lineNumber: 136,
          columnNumber: 21
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
        lineNumber: 130,
        columnNumber: 17
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/message-list.tsx",
    lineNumber: 112,
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
  if (file.type === "VIDEO" && !file.path) return null;
  if (file.type === "IMAGE" && !file.path && !file.url) return null;
  const fileUrl = file.type === "VIDEO" ? getMediaFileUrl(file.path) : file.path ? getMediaFileUrl(file.path) : file.url || "";
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
    downloadFile(fileUrl, file.filename);
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
                lineNumber: 66,
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
                lineNumber: 75,
                columnNumber: 25
              },
              this
            ) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 74,
              columnNumber: 21
            }, this),
            file.type === "AUDIO" && /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4 rounded-xl bg-secondary p-8 shadow-2xl border border-border", children: [
              /* @__PURE__ */ jsxDEV("audio", { src: fileUrl, controls: true }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 86,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-foreground font-medium", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 87,
                columnNumber: 25
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 85,
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
                    onAttachFile(fileUrl, file.filename);
                  },
                  className: "h-8 w-8 hover:bg-primary hover:text-primary-foreground",
                  title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
                  children: /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                    lineNumber: 105,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                  lineNumber: 95,
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
                    lineNumber: 120,
                    columnNumber: 29
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                  lineNumber: 110,
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
                    lineNumber: 133,
                    columnNumber: 25
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                  lineNumber: 123,
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
                      lineNumber: 151,
                      columnNumber: 29
                    },
                    this
                  )
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                  lineNumber: 137,
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
                    lineNumber: 168,
                    columnNumber: 25
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                  lineNumber: 158,
                  columnNumber: 21
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 92,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between text-white", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "font-medium", children: file.filename }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 175,
                columnNumber: 25
              }, this),
              file.size && /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-slate-300", children: formatFileSize(file.size) }, void 0, false, {
                fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
                lineNumber: 177,
                columnNumber: 29
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 174,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
              lineNumber: 173,
              columnNumber: 17
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
          lineNumber: 61,
          columnNumber: 13
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-fullscreen-view.tsx",
      lineNumber: 57,
      columnNumber: 9
    },
    this
  );
}
const MODEL_RATES = {
  "NANO_BANANA_OPENROUTER": 0.05,
  "NANO_BANANA_PRO_KIEAI": 0.09,
  "NANO_BANANA_PRO_LAOZHANG": 0.05,
  "IMAGEN4_KIEAI": 0.02,
  "IMAGEN4_ULTRA_KIEAI": 0.06,
  "SEEDREAM_4_5": 0.0325,
  "SEEDREAM_4_5_EDIT": 0.0325,
  "KLING_2_5_TURBO_PRO": 0.42,
  "KLING_2_6": 0.55,
  "VEO_3_1_FAST": 0.3,
  // kie.ai
  "VEO_3_1": 1.25,
  "ELEVENLABS_MULTILINGUAL_V2": 0.05,
  "MIDJOURNEY": 0.5,
  "SORA_2": 0.3
};
function calculateRequestCost(request) {
  if (!request.model || request.status === "FAILED") {
    return 0;
  }
  const rate = MODEL_RATES[request.model] || 0;
  return rate;
}
function calculateTotalChatCost(requests) {
  return requests.reduce((total, request) => {
    return total + calculateRequestCost(request);
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
  const pinnedImageIdsRef = useRef(/* @__PURE__ */ new Set());
  const loadingEffectForAttachFile = useMemo(
    () => createLoadingEffectForAttachFile(setAttachingFile),
    []
  );
  useEffect(() => {
    pinnedImageIdsRef.current = pinnedImageIds;
  }, [pinnedImageIds]);
  useEffect(() => {
    if (chatId === void 0) return;
    const storageKey = `pinned-images-chat-${chatId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        const newSet = new Set(ids);
        setPinnedImageIds(newSet);
        pinnedImageIdsRef.current = newSet;
      } catch (error) {
        console.error("Error loading pinned images:", error);
      }
    } else {
      const newSet = /* @__PURE__ */ new Set();
      setPinnedImageIds(newSet);
      pinnedImageIdsRef.current = newSet;
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
    { skip: chatId === void 0 }
  );
  const totalCost = useMemo(() => {
    if (!chatData?.requests) return 0;
    return calculateTotalChatCost(chatData.requests);
  }, [chatData?.requests]);
  useEffect(() => {
    if (!filesData?.data) {
      return;
    }
    if (page === 1) {
      setAccumulatedFiles((prev) => {
        const newFilesIds = new Set(filesData.data.map((f) => f.id));
        const currentPinnedIds = pinnedImageIdsRef.current;
        const preservedPinnedFiles = prev.filter(
          (f) => currentPinnedIds.has(f.id) && !newFilesIds.has(f.id)
        );
        return [...preservedPinnedFiles, ...filesData.data];
      });
    } else {
      setAccumulatedFiles((prev) => {
        const existingIds = new Set(prev.map((f) => f.id));
        const newFiles = filesData.data.filter(
          (f) => !existingIds.has(f.id)
        );
        return [...prev, ...newFiles];
      });
    }
  }, [filesData, page]);
  useEffect(() => {
    if (!chatData?.requests || pinnedImageIds.size === 0) return;
    setAccumulatedFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id));
      const currentPinnedIds = pinnedImageIdsRef.current;
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
  const allFiles = useMemo(() => accumulatedFiles, [accumulatedFiles]);
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
    allFiles.forEach((file) => {
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
  }, [allFiles, pinnedImageIds]);
  const visibleVideoFiles = useMemo(() => videoFiles, [videoFiles]);
  const visiblePinnedImages = useMemo(() => pinnedImages, [pinnedImages]);
  const visibleUnpinnedImages = useMemo(
    () => unpinnedImages,
    [unpinnedImages]
  );
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
        lineNumber: 306,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 305,
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
            lineNumber: 312,
            columnNumber: 33
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 309,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 308,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
      lineNumber: 304,
      columnNumber: 13
    }, this);
  }
  if (allFiles.length === 0) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-full w-[30%] flex-col border-l border-border bg-background", children: [
      /* @__PURE__ */ jsxDEV("div", { className: PANEL_HEADER_CLASSES, children: /* @__PURE__ */ jsxDEV("h2", { className: PANEL_HEADER_TITLE_CLASSES, children: "\u041C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u044B" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 328,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 327,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0435\u0442 \u043C\u0435\u0434\u0438\u0430\u0444\u0430\u0439\u043B\u043E\u0432" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 331,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 330,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
      lineNumber: 326,
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
              allFiles.length,
              ")"
            ] }, void 0, true, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 347,
              columnNumber: 21
            }, this),
            totalCost > 0 && /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20", children: formatCost(totalCost) }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 351,
              columnNumber: 25
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 341,
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
                    lineNumber: 370,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0417\u0430\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043D\u044B\u0435 (",
                    pinnedImages.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 371,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 369,
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
                    lineNumber: 375,
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
              lineNumber: 363,
              columnNumber: 33
            },
            this
          ),
          isPinnedExpanded && /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2 mt-2", children: visiblePinnedImages.map((file) => /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "group relative cursor-pointer transition-transform hover:scale-105",
              onClick: (e) => {
                e.stopPropagation();
                handleFileClick(file);
              },
              role: "button",
              tabIndex: 0,
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleFileClick(file);
                }
              },
              children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    onClick: (e) => e.stopPropagation(),
                    children: /* @__PURE__ */ jsxDEV(
                      MediaPreview,
                      {
                        file,
                        className: "h-full w-full"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 408,
                        columnNumber: 53
                      },
                      this
                    )
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 403,
                    columnNumber: 49
                  },
                  this
                ),
                onAttachFile && /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100",
                    onClick: (e) => {
                      e.stopPropagation();
                      if (!file.path)
                        return;
                      loadingEffectForAttachFile();
                      const fileUrl = getMediaFileUrl(
                        file.path
                      );
                      onAttachFile(
                        fileUrl,
                        file.filename
                      );
                    },
                    title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
                    children: attachingFile ? /* @__PURE__ */ jsxDEV(Loader2, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 436,
                      columnNumber: 61
                    }, this) : /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 438,
                      columnNumber: 61
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 415,
                    columnNumber: 53
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
                      onRepeatRequest(
                        file.requestId
                      );
                    },
                    title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441",
                    children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 456,
                      columnNumber: 57
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 444,
                    columnNumber: 53
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute right-7 top-1 h-6 w-6 text-yellow-400 opacity-0 transition-opacity hover:text-yellow-300 hover:bg-yellow-600/20 group-hover:opacity-100",
                    onClick: (e) => {
                      e.stopPropagation();
                      togglePinImage(file.id);
                    },
                    title: "\u041E\u0442\u043A\u0440\u0435\u043F\u0438\u0442\u044C",
                    children: /* @__PURE__ */ jsxDEV(Pin, { className: "h-3.5 w-3.5 fill-current" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 470,
                      columnNumber: 53
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 460,
                    columnNumber: 49
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100",
                    onClick: (e) => handleDeleteFile(
                      e,
                      file.id
                    ),
                    disabled: isDeleting,
                    title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u0430\u0439\u043B",
                    children: /* @__PURE__ */ jsxDEV(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 486,
                      columnNumber: 53
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 473,
                    columnNumber: 49
                  },
                  this
                )
              ]
            },
            file.id,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 384,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 382,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 362,
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
                    lineNumber: 505,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F (",
                    unpinnedImages.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 506,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 504,
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
                    lineNumber: 511,
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
              lineNumber: 498,
              columnNumber: 33
            },
            this
          ),
          isImageExpanded && /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2 mt-2", children: visibleUnpinnedImages.map((file) => /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "group relative cursor-pointer transition-transform hover:scale-105",
              onClick: (e) => {
                e.stopPropagation();
                handleFileClick(file);
              },
              role: "button",
              tabIndex: 0,
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleFileClick(file);
                }
              },
              children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    onClick: (e) => e.stopPropagation(),
                    children: /* @__PURE__ */ jsxDEV(
                      MediaPreview,
                      {
                        file,
                        className: "h-full w-full"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 544,
                        columnNumber: 53
                      },
                      this
                    )
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 539,
                    columnNumber: 49
                  },
                  this
                ),
                onAttachFile && /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100",
                    onClick: (e) => {
                      e.stopPropagation();
                      if (!file.path)
                        return;
                      loadingEffectForAttachFile();
                      const fileUrl = getMediaFileUrl(
                        file.path
                      );
                      onAttachFile(
                        fileUrl,
                        file.filename
                      );
                    },
                    title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
                    children: attachingFile ? /* @__PURE__ */ jsxDEV(Loader2, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 572,
                      columnNumber: 61
                    }, this) : /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 574,
                      columnNumber: 61
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 551,
                    columnNumber: 53
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
                      onRepeatRequest(
                        file.requestId
                      );
                    },
                    title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441",
                    children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 592,
                      columnNumber: 57
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 580,
                    columnNumber: 53
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute right-7 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-yellow-400 hover:bg-yellow-600/20 group-hover:opacity-100",
                    onClick: (e) => {
                      e.stopPropagation();
                      togglePinImage(file.id);
                    },
                    title: "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C",
                    children: /* @__PURE__ */ jsxDEV(Pin, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 606,
                      columnNumber: 53
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 596,
                    columnNumber: 49
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100",
                    onClick: (e) => handleDeleteFile(
                      e,
                      file.id
                    ),
                    disabled: isDeleting,
                    title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u0430\u0439\u043B",
                    children: /* @__PURE__ */ jsxDEV(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 622,
                      columnNumber: 53
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 609,
                    columnNumber: 49
                  },
                  this
                )
              ]
            },
            file.id,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 520,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 518,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 497,
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
                    lineNumber: 641,
                    columnNumber: 41
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "\u0412\u0438\u0434\u0435\u043E (",
                    videoFiles.length,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 642,
                    columnNumber: 41
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 640,
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
                    lineNumber: 645,
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
              lineNumber: 634,
              columnNumber: 33
            },
            this
          ),
          isVideoExpanded && /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-2 mt-2", children: visibleVideoFiles.map((file) => /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "group relative cursor-pointer transition-transform hover:scale-105",
              onClick: (e) => {
                e.stopPropagation();
                handleFileClick(file);
              },
              role: "button",
              tabIndex: 0,
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleFileClick(file);
                }
              },
              children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    onClick: (e) => e.stopPropagation(),
                    children: /* @__PURE__ */ jsxDEV(
                      MediaPreview,
                      {
                        file,
                        className: "h-full w-full"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 678,
                        columnNumber: 53
                      },
                      this
                    )
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 673,
                    columnNumber: 49
                  },
                  this
                ),
                onAttachFile && /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100",
                    onClick: (e) => {
                      e.stopPropagation();
                      if (!file.path)
                        return;
                      const fileUrl = getMediaFileUrl(
                        file.path
                      );
                      onAttachFile(
                        fileUrl,
                        file.filename
                      );
                    },
                    title: "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0443",
                    children: /* @__PURE__ */ jsxDEV(Paperclip, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 704,
                      columnNumber: 57
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 685,
                    columnNumber: 53
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute left-1 top-8 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-blue-400 hover:bg-blue-600/20 group-hover:opacity-100",
                    onClick: (e) => {
                      e.stopPropagation();
                      handleFileClick(file);
                    },
                    title: "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0438\u0434\u0435\u043E",
                    children: /* @__PURE__ */ jsxDEV(Maximize2, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 718,
                      columnNumber: 53
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 708,
                    columnNumber: 49
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
                      onRepeatRequest(
                        file.requestId
                      );
                    },
                    title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441",
                    children: /* @__PURE__ */ jsxDEV(RefreshCcw, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 734,
                      columnNumber: 57
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 722,
                    columnNumber: 53
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    size: "icon",
                    variant: "ghost",
                    className: "absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100",
                    onClick: (e) => handleDeleteFile(
                      e,
                      file.id
                    ),
                    disabled: isDeleting,
                    title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u0430\u0439\u043B",
                    children: /* @__PURE__ */ jsxDEV(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 751,
                      columnNumber: 53
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 738,
                    columnNumber: 49
                  },
                  this
                )
              ]
            },
            file.id,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 654,
              columnNumber: 45
            },
            this
          )) }, void 0, false, {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 652,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 633,
          columnNumber: 29
        }, this),
        filesData?.pagination && filesData.pagination.page < filesData.pagination.totalPages && /* @__PURE__ */ jsxDEV(
          "div",
          {
            ref: loadMoreTriggerRef,
            className: "flex h-20 items-center justify-center",
            children: isFetching ? /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-400", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 769,
              columnNumber: 41
            }, this) : /* @__PURE__ */ jsxDEV("div", { className: "h-1 w-1 rounded-full bg-slate-600" }, void 0, false, {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 773,
              columnNumber: 41
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
            lineNumber: 764,
            columnNumber: 33
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 359,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
        lineNumber: 358,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
      lineNumber: 339,
      columnNumber: 13
    }, this),
    selectedFile && /* @__PURE__ */ jsxDEV(Fragment, { children: [
      selectedFile.type === "VIDEO" && selectedFile.path && /* @__PURE__ */ jsxDEV(
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
                  lineNumber: 796,
                  columnNumber: 33
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
                  /* @__PURE__ */ jsxDEV(
                    "video",
                    {
                      src: getMediaFileUrl(selectedFile.path),
                      controls: true,
                      autoPlay: true,
                      className: "max-h-[90vh] w-full"
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                      lineNumber: 800,
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
                          lineNumber: 820,
                          columnNumber: 49
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 808,
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
                          if (!selectedFile.path) return;
                          downloadFile(
                            getMediaFileUrl(
                              selectedFile.path
                            ),
                            selectedFile.filename
                          );
                        },
                        title: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B",
                        children: /* @__PURE__ */ jsxDEV(Download, { className: "h-4 w-4" }, void 0, false, {
                          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                          lineNumber: 837,
                          columnNumber: 45
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 823,
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
                          lineNumber: 846,
                          columnNumber: 45
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                        lineNumber: 839,
                        columnNumber: 41
                      },
                      this
                    )
                  ] }, void 0, true, {
                    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                    lineNumber: 806,
                    columnNumber: 37
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
                  lineNumber: 799,
                  columnNumber: 33
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
              lineNumber: 792,
              columnNumber: 29
            },
            this
          )
        },
        void 0,
        false,
        {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
          lineNumber: 786,
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
          lineNumber: 855,
          columnNumber: 25
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
      lineNumber: 783,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/components/media/media-gallery.tsx",
    lineNumber: 338,
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
    // Это критично для правильной работы при смене чата
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
  const [updateChat] = useUpdateChatMutation();
  const [generateMedia] = useGenerateMediaMutation();
  const [getRequestTrigger] = useLazyGetRequestQuery();
  const {
    isTestMode
  } = useTestMode();
  const [currentModel, setCurrentModel] = useState("NANO_BANANA_PRO_KIEAI");
  const [pollingRequestId, setPollingRequestId] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const chatInputRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const previousChatIdRef = useRef(chatIdNum);
  useEffect(() => {
    if (previousChatIdRef.current !== chatIdNum) {
      console.log("[Chat] \u0421\u043C\u0435\u043D\u0430 \u0447\u0430\u0442\u0430:", {
        previous: previousChatIdRef.current,
        current: chatIdNum
      });
      isInitialLoadRef.current = true;
      previousChatIdRef.current = chatIdNum;
      setPollingRequestId(null);
      setPendingMessage(null);
      refetch();
    }
  }, [chatIdNum, refetch]);
  useEffect(() => {
    const handleFocus = () => {
      console.log("[Chat] \u{1F504} \u041E\u043A\u043D\u043E \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E \u0444\u043E\u043A\u0443\u0441, \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u0434\u0430\u043D\u043D\u044B\u0435 \u0447\u0430\u0442\u0430");
      refetch().catch((error) => {
        console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u0447\u0430\u0442\u0430 \u043F\u043E\u0441\u043B\u0435 \u0444\u043E\u043A\u0443\u0441\u0430:", error);
      });
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch]);
  useEffect(() => {
    const activeChatForSync = chat;
    if (!activeChatForSync) return;
    if (isInitialLoadRef.current) {
      setCurrentModel(activeChatForSync.model);
      isInitialLoadRef.current = false;
      return;
    }
  }, [chat]);
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
  const shouldSkipPolling = !pollingRequestId || isTestMode;
  const {
    data: pollingRequest
  } = useGetRequestQuery(pollingRequestId, {
    skip: shouldSkipPolling,
    // Не опрашиваем в тестовом режиме
    pollingInterval: isTestMode ? 0 : 3e3,
    // Опрос каждые 3 секунды (увеличено с 1.5 для снижения нагрузки на память)
    // Принудительно обновляем данные при каждом запросе
    refetchOnMountOrArgChange: true
  });
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
    console.log("[Chat] \u2705 \u041D\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0441\u043E\u0437\u0434\u0430\u043D, \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u0447\u0430\u0442 \u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u043C polling:", {
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
    if (isTestMode) {
      console.log("[Chat] \u{1F9EA} \u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C: polling \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D \u0434\u043B\u044F \u043D\u043E\u0432\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430");
      return;
    }
    setPollingRequestId(requestId);
  }
  useEffect(() => {
    if (isTestMode && pollingRequestId !== null) {
      console.log("[Chat] \u{1F9EA} \u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0432\u043A\u043B\u044E\u0447\u0435\u043D: \u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C polling");
      setPollingRequestId(null);
    }
  }, [isTestMode, pollingRequestId]);
  const previousStatusRef = useRef(null);
  const previousFilesCountRef = useRef(null);
  const pollingStartTimeRef = useRef(null);
  const maxPollingTime = 5 * 60 * 1e3;
  useEffect(() => {
    if (pollingRequestId && !pollingStartTimeRef.current) {
      pollingStartTimeRef.current = Date.now();
    }
  }, [pollingRequestId]);
  useEffect(() => {
    if (pollingRequest) {
      if (pollingRequest.id !== pollingRequestId) {
        console.log("[Chat] \u26A0\uFE0F pollingRequest.id \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 pollingRequestId, \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u0435\u043C:", {
          pollingRequestId: pollingRequest.id,
          expectedId: pollingRequestId
        });
        return;
      }
      const currentStatus = pollingRequest.status;
      const previousStatus = previousStatusRef.current;
      const currentFilesCount = pollingRequest.files?.length || 0;
      const previousFilesCount = previousFilesCountRef.current;
      if (pollingStartTimeRef.current) {
        const pollingDuration = Date.now() - pollingStartTimeRef.current;
        if (pollingDuration > maxPollingTime) {
          console.warn("[Chat] \u26A0\uFE0F Polling \u043F\u0440\u0435\u0432\u044B\u0441\u0438\u043B \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F, \u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C");
          setPollingRequestId(null);
          pollingStartTimeRef.current = null;
          previousStatusRef.current = null;
          previousFilesCountRef.current = null;
          refetch();
          return;
        }
      }
      const statusChanged = previousStatus !== currentStatus;
      const filesCountChanged = previousFilesCount !== null && previousFilesCount !== currentFilesCount;
      const isFirstRequest = previousStatus === null;
      console.log("[Chat] Polling request \u0441\u0442\u0430\u0442\u0443\u0441:", {
        id: pollingRequest.id,
        status: currentStatus,
        previousStatus,
        statusChanged,
        filesCount: currentFilesCount,
        previousFilesCount,
        filesCountChanged,
        isFirstRequest,
        errorMessage: pollingRequest.errorMessage || null
      });
      setPendingMessage((prev) => {
        if (!prev) return prev;
        if (!pollingRequestId || prev.requestId !== pollingRequestId) {
          return prev;
        }
        const isProcessing = currentStatus === "PROCESSING";
        const isFailed = currentStatus === "FAILED";
        const nextStatus = isProcessing ? "PROCESSING" : isFailed ? "FAILED" : prev.status;
        const nextError = isFailed && (pollingRequest.errorMessage || true) ? pollingRequest.errorMessage || "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C. \u0414\u0435\u0442\u0430\u043B\u0438 \u043E\u0448\u0438\u0431\u043A\u0438 \u043D\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u044B \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u043C." : prev.errorMessage;
        if (nextStatus === prev.status && nextError === prev.errorMessage) {
          return prev;
        }
        return {
          ...prev,
          status: nextStatus,
          errorMessage: nextError
        };
      });
      const shouldUpdate = isFirstRequest || statusChanged || filesCountChanged || currentStatus === "PROCESSING" && previousStatus === "PROCESSING" && Date.now() % 3e3 < 1500;
      if (shouldUpdate) {
        console.log("[Chat] \u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u0447\u0430\u0442");
        refetch().catch((error) => {
          console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u0447\u0430\u0442\u0430:", error);
        });
      }
      if (currentStatus === "COMPLETED" || currentStatus === "FAILED") {
        console.log("[Chat] \u0417\u0430\u043F\u0440\u043E\u0441 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D, \u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C polling");
        setPollingRequestId(null);
        pollingStartTimeRef.current = null;
        previousStatusRef.current = null;
        previousFilesCountRef.current = null;
        setTimeout(() => {
          refetch().catch((error) => {
            console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0444\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u043C \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u0447\u0430\u0442\u0430:", error);
          });
        }, 500);
        setTimeout(() => {
          refetch().catch((error) => {
            console.error("[Chat] \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u043C \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438 \u0447\u0430\u0442\u0430:", error);
          });
        }, 1500);
      } else {
        previousStatusRef.current = currentStatus;
        previousFilesCountRef.current = currentFilesCount;
      }
    }
  }, [pollingRequest, pollingRequestId, refetch, maxPollingTime]);
  const activeRequests = useMemo(() => chat?.requests || [], [chat?.requests]);
  useEffect(() => {
    if (!pendingMessage?.requestId) return;
    const requestAppeared = activeRequests.some((r) => r.id === pendingMessage.requestId);
    const pollingMatched = pollingRequest && pollingRequest.id === pendingMessage.requestId;
    pollingMatched && (pollingRequest.status === "COMPLETED" || pollingRequest.status === "FAILED");
    if (requestAppeared) {
      console.log("[Chat] \u{1F504} \u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0430\u0439\u0434\u0435\u043D, \u0443\u0431\u0438\u0440\u0430\u0435\u043C pending-\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435");
      setPendingMessage(null);
    }
  }, [activeRequests, pendingMessage, pollingRequest]);
  if (isChatLoading && !chat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 378,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxDEV(Loader2, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 380,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 379,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 377,
      columnNumber: 12
    }, this);
  }
  if (chatError && !chat) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 388,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-destructive", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0447\u0430\u0442\u0430" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 390,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground mt-2", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0447\u0430\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C." }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 391,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 389,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 387,
      columnNumber: 12
    }, this);
  }
  if (!chat && !isChatLoading && !chatError) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
      /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 402,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col items-center justify-center text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xl text-muted-foreground", children: "\u0427\u0430\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 404,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-muted-foreground", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0447\u0430\u0442 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 405,
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
      columnNumber: 12
    }, this);
  }
  if (!chat) {
    return null;
  }
  const activeChat = chat;
  const sortedRequests = [...activeChat.requests || []].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const requestsWithPolling = sortedRequests.map((request) => {
    if (pollingRequest && pollingRequestId && request.id === pollingRequest.id && request.id === pollingRequestId) {
      return pollingRequest;
    }
    return request;
  });
  const hasPendingInList = pendingMessage && !requestsWithPolling.some(
    (r) => pendingMessage.requestId ? r.id === pendingMessage.requestId : false
    // Пока нет requestId - реального запроса точно нет в списке
  );
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
  const finalRequests = pendingAsRequest ? [...requestsWithPolling, pendingAsRequest] : requestsWithPolling;
  function handleEditPrompt(prompt) {
    chatInputRef.current?.setPrompt(prompt);
  }
  async function handleAttachFile(fileUrl, filename) {
    await chatInputRef.current?.addFileFromUrl(fileUrl, filename);
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
  return /* @__PURE__ */ jsxDEV("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsxDEV(ChatSidebar, {}, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 517,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-1 flex-col", children: [
      /* @__PURE__ */ jsxDEV(ChatHeader, { name: activeChat.name, model: currentModel, showUpdating: showUpdatingIndicator }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 522,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(MessageList, { requests: finalRequests, chatModel: currentModel, onEditPrompt: handleEditPrompt, onAttachFile: handleAttachFile, onRepeatRequest: handleRepeatRequest }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 525,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(ChatInput, { ref: chatInputRef, chatId: chatIdNum, currentModel, onModelChange: handleModelChange, onRequestCreated: handleRequestCreated, onPendingMessage: handleAddPendingMessage, onSendError: handleSendError }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 528,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 520,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(MediaGallery, { chatId: chatIdNum, onAttachFile: handleAttachFile, onRepeatRequest: handleRepeatRequestById }, void 0, false, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 532,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 515,
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
      lineNumber: 551,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("h1", { className: "font-semibold text-foreground", children: name }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 554,
          columnNumber: 25
        }, this),
        showUpdating && /* @__PURE__ */ jsxDEV(Loader2, { className: "h-4 w-4 animate-spin text-muted-foreground" }, void 0, false, {
          fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
          lineNumber: 555,
          columnNumber: 42
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 553,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-muted-foreground", children: modelInfo?.name || model }, void 0, false, {
        fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
        lineNumber: 557,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
      lineNumber: 552,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 550,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "/Users/wowbae/Desktop/IT/JS/\u041F\u0440\u043E\u0435\u043A\u0442\u044B/ai-media-api/src/routes/media/$chatId.tsx?tsr-split=component",
    lineNumber: 549,
    columnNumber: 10
  }, this);
}

export { MediaChatPage as component };
//# sourceMappingURL=_chatId-kac774j7.mjs.map
