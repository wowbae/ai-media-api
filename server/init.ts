// express server
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { registerRoutes } from "./routes";
import { Bot } from "grammy";
import { handlers } from "./features/telegram/bot/handlers/export";
import { mediaRouter } from "./features/media/routes";
import { recoverUnfinishedTasks } from "./features/media/generation.service";
import { syncMediaFilesWithFileSystem } from "./features/media/database.service";

dotenv.config();

export const app = express();

// middleware
app.use(express.json({ limit: "50mb" })); // увеличиваем лимит для загрузки файлов
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

// Статическая раздача медиа-файлов
app.use("/media-files", express.static(path.join(process.cwd(), "ai-media")));

// Media API роуты
app.use("/api/media", mediaRouter);

// регистрация маршрутов, если будут сюда их добавлять
registerRoutes(app, []);

// запуск сервера
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);

  // Синхронизируем БД с файловой системой (удаляем записи о несуществующих файлах)
  // Запускается с задержкой 5 секунд, чтобы не блокировать старт
  syncMediaFilesWithFileSystem(5000);

  // Восстанавливаем незавершенные задачи после запуска сервера
  recoverUnfinishedTasks().catch((error) => {
    console.error("❌ Ошибка при восстановлении незавершенных задач:", error);
  });
});

// Обработка ошибок сервера
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error("Server error:", error);
    process.exit(1);
  }
});

// Telegram Bot (опционально - только если есть токен)
export let bot: Bot | null = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

  // регистрируем обработчики, ПОРЯДОК ВАЖЕН
  handlers.map((h) => bot!.use(h));

  bot
    .start({
      drop_pending_updates: true,
      onStart: (me) => {
        console.log(`✅ Telegram Bot @${me.username} is running`);
      },
    })
    .catch((err) => {
      console.warn("⚠️ Telegram Bot не запущен:", err.message);
    });
} else {
  console.log("ℹ️ TELEGRAM_BOT_TOKEN не указан - Telegram бот отключен");
}

// Обработка сигналов завершения для корректного освобождения порта
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(async () => {
    console.log("Server closed, port is now free");
    if (bot) {
      await bot.stop().catch(console.error);
    }
    process.exit(0);
  });

  // Принудительное завершение через 10 секунд, если сервер не закрылся
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
