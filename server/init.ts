// express server
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
import { recoverUnfinishedTasks } from "./features/media/generation.service";
import { syncMediaFilesWithFileSystem } from "./features/media/database.service";
import { getTelegramBotService, getBot } from "./features/telegram/bot/bot.service";
import { serverConfig } from "./config";

dotenv.config();

export const app = express();

// middleware
// Увеличиваем лимит для загрузки файлов (50mb)
app.use(express.json({ limit: serverConfig.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: serverConfig.bodyLimit }));
app.use(cors());

// Middleware для явной установки заголовков кеширования для медиа-файлов
// Файлы имеют уникальные имена и не изменяются, поэтому кешируем на неделю
app.use("/media-files", (req, res, next) => {
  // Устанавливаем кеширование для медиа-файлов на неделю
  // Файлы имеют уникальные имена и не изменяются, поэтому кешируем на неделю
  const oneWeekInSeconds = 604800; // 7 дней
  const oneWeekInMs = oneWeekInSeconds * 1000;

  res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  res.setHeader("Expires", new Date(Date.now() + oneWeekInMs).toUTCString());

  // CORS заголовки для медиа-файлов (не мешают кешированию)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "604800"); // Кешируем preflight на неделю

  // Важно: Vary заголовок должен быть минимальным для кеширования
  // Не добавляем Vary: Origin, чтобы кеш работал для всех источников

  // Обработка OPTIONS запросов для CORS preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Статическая раздача медиа-файлов с кешированием
// Файлы уже локальные, поэтому кешируем их на неделю
app.use(
  "/media-files",
  express.static(path.join(process.cwd(), "ai-media"), {
    maxAge: "7d", // Кешируем на неделю
    immutable: true, // Файлы не изменяются (имена уникальные)
    etag: true, // Используем ETag для валидации
    lastModified: true, // Используем Last-Modified
  }),
);

// Media API роуты
app.use("/api/media", mediaRouter);
app.use("/api/auth", authRouter);
app.use("/api/telegram", telegramRouter);

// регистрация маршрутов, если будут сюда их добавлять
registerRoutes(app, []);

// запуск сервера
const server = app.listen(serverConfig.port, () => {
  console.log(`🚀 Server is running on port ${serverConfig.port}`);

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
    console.error(`Port ${serverConfig.port} is already in use`);
    process.exit(1);
  } else {
    console.error("Server error:", error);
    process.exit(1);
  }
});

// Telegram Bot (опционально - только если есть токен)
const botService = getTelegramBotService();

if (process.env.TELEGRAM_BOT_TOKEN) {
  botService
    .initialize(process.env.TELEGRAM_BOT_TOKEN, (me) => {
      // регистрируем обработчики после инициализации
      const bot = botService.getBot();
      if (bot) {
        handlers.map((h) => bot.use(h));
      }
    })
    .catch((err) => {
      console.warn("⚠️ Telegram Bot не запущен:", err.message);
    });
} else {
  console.log("ℹ️ TELEGRAM_BOT_TOKEN не указан - Telegram бот отключен");
}

// Экспорт бота для совместимости
export function getBotInstance() {
  return getBot();
}

// Обработка сигналов завершения для корректного освобождения порта
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(async () => {
    console.log("Server closed, port is now free");
    await botService.stop().catch(console.error);
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
