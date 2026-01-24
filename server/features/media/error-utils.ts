// Утилиты для форматирования ошибок
import type { MediaModel } from "./interfaces";
import { getProviderManager } from "./providers";

/**
 * Форматирует сообщение об ошибке с информацией о модели и провайдере
 */
export function formatErrorMessage(
  errorMessage: string,
  model: MediaModel | null,
  providerName?: string,
): string {
  if (!model) return errorMessage;

  const providerManager = getProviderManager();
  const modelConfig = providerManager.getModelConfig(model);
  const displayProviderName =
    providerName || modelConfig?.provider || "unknown";

  return `[${modelConfig?.name || model} (${displayProviderName})] ${errorMessage}`;
}
