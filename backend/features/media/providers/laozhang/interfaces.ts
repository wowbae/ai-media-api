// Интерфейсы для LaoZhang API
// Документация: https://docs.laozhang.ai/en

// Конфигурация LaoZhang провайдера
export interface LaoZhangConfig {
  apiKey: string;
  baseURL: string;
}

// Статусы задач для асинхронных моделей (Sora 2, Veo 3.1)
export type LaoZhangTaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// ==================== Image API (Nano Banana Pro) ====================

// Формат сообщения для chat completions
export interface LaoZhangMessage {
  role: "user" | "assistant" | "system";
  content: string | LaoZhangContent[];
}

// Контент сообщения (текст или изображение)
export interface LaoZhangContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

// Ответ на генерацию изображения (синхронный)
export interface LaoZhangImageResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      images?: Array<{
        image_url: {
          url: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ==================== Video API (Sora 2, Veo 3.1) ====================

// Запрос на создание видео (асинхронный)
export interface LaoZhangVideoRequest {
  model: string;
  prompt: string;
  image_url?: string; // Для image-to-video
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  duration?: number; // Длительность видео в секундах
}

// Ответ на создание задачи видео
export interface LaoZhangVideoCreateResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string; // Содержит task_id или статус
    };
  }>;
  task_id?: string;
  status?: LaoZhangTaskStatus;
}

// Ответ на проверку статуса видео задачи
export interface LaoZhangVideoStatusResponse {
  task_id: string;
  status: LaoZhangTaskStatus;
  result?: {
    url: string;
    duration?: number;
  };
  error?: string;
  progress?: number;
}

// Типы разрешений для генерации
export type AspectRatio = "1:1" | "9:16" | "16:9";
export type Quality = "1K" | "2K" | "4K"; // Важно: с большой буквы K для Google Native Format

// ==================== Google Native Format API (Nano Banana Pro) ====================

// Часть контента для Google Native Format
export interface GoogleNativePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}

// Контент для Google Native Format
export interface GoogleNativeContent {
  parts: GoogleNativePart[];
}

// Конфигурация генерации изображения
export interface GoogleNativeImageConfig {
  aspectRatio?:
    | "1:1"
    | "4:3"
    | "3:2"
    | "16:9"
    | "9:16"
    | "21:9"
    | "2:3"
    | "3:4";
  imageSize?: "1K" | "2K" | "4K"; // Важно: с большой буквы K
}

// Конфигурация генерации
export interface GoogleNativeGenerationConfig {
  responseModalities?: ("TEXT" | "IMAGE")[];
  imageConfig?: GoogleNativeImageConfig;
}

// Запрос в формате Google Native Format
export interface LaoZhangGoogleNativeRequest {
  contents: GoogleNativeContent[];
  generationConfig?: GoogleNativeGenerationConfig;
  tools?: Array<{ google_search?: Record<string, never> }>;
}

// Кандидат ответа от Google Native Format API
export interface GoogleNativeCandidate {
  content: {
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string; // base64
      };
    }>;
  };
  finishReason?: string;
}

// Ответ от Google Native Format API
export interface LaoZhangGoogleNativeResponse {
  candidates?: GoogleNativeCandidate[];
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}
