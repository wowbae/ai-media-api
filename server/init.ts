// Главный файл инициализации сервера
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { registerRoutes } from "./routes";
import { handlers } from "./features/telegram/bot/handlers/export";
import { authRouter } from "./features/auth/routes";
import { mediaRouter } from "./features/media/routes/index";
import { telegramRouter } from "./features/telegram/routes";
import { syncMediaFilesWithFileSystem } from "./features/media/database.service";
import { getTelegramBotService, getBot } from "./features/telegram/bot/bot.service";
import { serverConfig } from "./config";

// Импортируем TaskTrackingService для запуска восстановления задач
import { getTaskTrackingService } from "./features/media/task-tracking.service";

dotenv.config();

export const app = express();

// Middleware
app.use(express.json({ limit: serverConfig.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: serverConfig.bodyLimit }));
app.use(cors());

// Middleware для кеширования медиа-файлов
app.use("/media-files", (req, res, next) => {
  const oneWeekInSeconds = 604800;
  const oneWeekInMs = oneWeekInSeconds * 1000;

  res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  res.setHeader("Expires", new Date(Date.now() + oneWeekInMs).toUTCString());
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "604800");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Статическая раздача медиа-файлов с кешированием
app.use(
  "/media-files",
  express.static(path.join(process.cwd(), "ai-media"), {
    maxAge: "7d",
    immutable: true,
    etag: true,
    lastModified: true,
  }),
);

// Media API роуты
app.use("/api/media", mediaRouter);
app.use("/api/auth", authRouter);
app.use("/api/telegram", telegramRouter);

// Регистрация маршрутов
registerRoutes(app, []);

// Запуск сервера
const server = app.listen(serverConfig.port, () => {
  console.log(`🚀 Server is running on port ${serverConfig.port}`);

  syncMediaFilesWithFileSystem(5000);
  
  // Инициализируем TaskTrackingService для восстановления задач
  getTaskTrackingService();
  console.log('✅ TaskTrackingService инициализирован');
});

// Обработка ошибок сервера
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${serverConfig.port} is already in use`);
    process.exit(1);
  } else {
    console.error("Server error:", error);
    process.exit(1);
  }
});

// Telegram Bot
const botService = getTelegramBotService();

if (process.env.TELEGRAM_BOT_TOKEN) {
  botService.initialize(process.env.TELEGRAM_BOT_TOKEN, (me) => {
    const bot = botService.getBot();
    if (bot) {
      handlers.map((h) => bot.use(h));
      console.log('✅ Telegram notifier готов к работе');
    }
  }).catch((err) => {
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
    await botService.stop().catch(console.error);
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
