// DTO (Data Transfer Object) для параметров генерации медиа
// Используется для передачи параметров в generateMedia() вместо множества отдельных аргументов
import type { MediaModel } from './interfaces';

export interface GenerateMediaOptions {
  // Обязательные параметры
  requestId: number;
  prompt: string;
  model: MediaModel;

  // Опциональные параметры генерации
  inputFiles?: string[];
  format?: '1:1' | '9:16' | '16:9';
  quality?: '1k' | '2k' | '4k';
  videoQuality?: '480p' | '720p' | '1080p';
  duration?: number;
  ar?: '16:9' | '9:16';
  generationType?: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO' | 'EXTEND_VIDEO';
  originalTaskId?: string;
  sound?: boolean;
  fixedLens?: boolean;
  outputFormat?: 'png' | 'jpg';
  negativePrompt?: string;
  seed?: string | number;
  cfgScale?: number;
  tailImageUrl?: string;
  voice?: string;
  stability?: number;
  similarityBoost?: number;
  speed?: number;
  languageCode?: string;
}

// Опции для polling задач
export interface PollingOptions {
  requestId: number;
  taskId: string;
  providerName: string;
  prompt: string;
}

// Опции для восстановления задач после перезапуска
export interface TaskRecoveryOptions {
  requestId: number;
  taskId: string;
  providerName: string;
  model: MediaModel;
  prompt: string;
}
