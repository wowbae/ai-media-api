// Интерфейсы для Kie.ai API
// Документация: https://kie.ai/model-preview/features/mj-api

// Конфигурация Kie.ai провайдера
export interface KieAiConfig {
  apiKey: string;
  baseURL: string;
}

// Типы задач (согласно документации)
export type KieAiTaskType =
  | "mj_txt2img"
  | "mj_img2img"
  | "mj_video"
  | "mj_style_reference"
  | "mj_omni_reference";

// Скорость генерации
export type KieAiSpeed = "relaxed" | "fast" | "turbo";

// Версия Midjourney (согласно документации - без "Version")
export type KieAiVersion = "7" | "6.1" | "6" | "5.2" | "5.1" | "niji6";

// Соотношение сторон (согласно документации)
export type KieAiAspectRatio =
  | "1:2"
  | "9:16"
  | "2:3"
  | "3:4"
  | "5:6"
  | "6:5"
  | "4:3"
  | "3:2"
  | "1:1"
  | "16:9"
  | "2:1";

// Статусы задач Kie.ai
export type KieAiTaskStatus = "pending" | "processing" | "completed" | "failed";

// Запрос на создание задачи (согласно документации)
export interface KieAiCreateRequest {
  taskType: KieAiTaskType;
  speed?: KieAiSpeed;
  prompt: string;
  fileUrl?: string; // Для image-to-image и image-to-video
  fileUrls?: string[]; // Для image-to-image и image-to-video (рекомендуется)
  aspectRatio?: KieAiAspectRatio;
  version?: KieAiVersion;
  variety?: number; // 0-100, инкремент 5
  stylization?: number; // 0-1000, рекомендуется кратно 50
  weirdness?: number; // 0-3000, рекомендуется кратно 100
  ow?: number; // 1-1000, только для mj_omni_reference
  waterMark?: string;
  callBackUrl?: string;
}

// Ответ на создание задачи (согласно документации)
export interface KieAiApiResponse<T> {
  code: number;
  msg: string;
  data: T | null;
}

export interface KieAiCreateResponse {
  taskId: string;
  status?: KieAiTaskStatus;
}

// Структура результата из resultInfoJson
export interface KieAiResultInfo {
  resultUrls: Array<{
    resultUrl: string;
  }>;
}

// Ответ на проверку статуса задачи (унифицированный формат)
export interface KieAiStatusResponse {
  taskId: string;
  status: KieAiTaskStatus;
  resultUrls?: string[];
  error?: string;
  result?: {
    url?: string;
    urls?: string[];
  };
  // Для обратной совместимости
  resultInfoJson?: KieAiResultInfo;
  errorMessage?: string;
  errorCode?: string | null;
  successFlag?: number;
  // Для отладки
  taskType?: string;
  createTime?: number;
  completeTime?: number;
}

// Новая структура ответа API для получения статуса (согласно новой документации)
export interface KieAiTaskDetailResponse {
  taskId: string;
  model: string;
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  param: string; // JSON string с оригинальными параметрами
  resultJson: string; // JSON string с результатами
  failCode: string;
  failMsg: string;
  completeTime: number;
  createTime: number;
  updateTime: number;
}

// Структура resultJson
export interface KieAiResultJson {
  resultUrls: string[];
}

// Интерфейсы для Kling 2.6 API
// Документация: https://kie.ai/kling-2-6

// Соотношение сторон для Kling 2.6
export type KieAiKlingAspectRatio = "1:1" | "16:9" | "9:16";

// Длительность видео для Kling 2.6
export type KieAiKlingDuration = "5" | "10";

// Запрос на создание задачи Kling 2.6 (Text-to-Video)
export interface KieAiKlingTextToVideoRequest {
  prompt: string;
  sound: boolean;
  aspect_ratio: KieAiKlingAspectRatio;
  duration: KieAiKlingDuration;
}

// Запрос на создание задачи Kling 2.6 (Image-to-Video)
export interface KieAiKlingImageToVideoRequest {
  prompt: string;
  image_urls: string[]; // Массив URL изображений
  sound: boolean;
  duration: KieAiKlingDuration;
}
