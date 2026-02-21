// Сервис для управления Telegram ботом
// Централизованная инициализация и доступ к боту
// Используется singleton паттерн для обеспечения единого экземпляра
import { Bot } from 'grammy';

let botInstance: Bot | null = null;
let isInitialized = false;

export interface TelegramBotService {
  getBot(): Bot | null;
  isBotReady(): boolean;
  initialize(token: string, onStart?: (me: { username: string }) => void): Promise<void>;
  stop(): Promise<void>;
}

// Фабрика для создания сервиса бота
export function createTelegramBotService(): TelegramBotService {
  return {
    getBot(): Bot | null {
      return botInstance;
    },

    isBotReady(): boolean {
      return botInstance !== null && isInitialized;
    },

    async initialize(token: string, onStart?: (me: { username: string }) => void): Promise<void> {
      if (isInitialized) {
        return;
      }

      try {
        botInstance = new Bot(token);
        
        await botInstance.start({
          drop_pending_updates: true,
          onStart: (me) => {
            isInitialized = true;
            console.log(`✅ Telegram Bot @${me.username} is running`);
            onStart?.(me);
          },
        });
      } catch (error) {
        isInitialized = false;
        botInstance = null;
        console.warn('⚠️ Telegram Bot не запущен:', error instanceof Error ? error.message : error);
        throw error;
      }
    },

    async stop(): Promise<void> {
      if (botInstance) {
        await botInstance.stop().catch(console.error);
        botInstance = null;
        isInitialized = false;
      }
    },
  };
}

// Singleton экземпляр сервиса
let botServiceInstance: TelegramBotService | null = null;

export function getTelegramBotService(): TelegramBotService {
  if (!botServiceInstance) {
    botServiceInstance = createTelegramBotService();
  }
  return botServiceInstance;
}

// Экспорт для совместимости
export function getBot(): Bot | null {
  return getTelegramBotService().getBot();
}

export function isBotReady(): boolean {
  return getTelegramBotService().isBotReady();
}
