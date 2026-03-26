// Главный файл для регистрации всех роутов
import { Router } from "express";
import { initMediaStorage } from "../file.service";
import { createChatsRouter } from "./chats";
import { createGenerateRouter } from "./generate";
import { createFilesRouter } from "./files";
import { createRequestsRouter } from "./requests";
import { createModelsRouter } from "./models";
import { createPricingRouter } from "./pricing";
import { createKieCreditsRouter } from "./kie-credits";
import { createWavespeedBalanceRouter } from "./wavespeed-balance";
import { createSSERouter } from "./sse";
import { createCompletionRouter } from "./completion";
import { createPromptEnhanceRouter } from "./prompt-enhance";
import { createLorasRouter } from "./loras";

export const mediaRouter = Router();

// Инициализация при загрузке модуля
initMediaStorage().catch(console.error);

// Регистрируем все роуты
mediaRouter.use(createChatsRouter());
mediaRouter.use(createGenerateRouter());
mediaRouter.use(createFilesRouter());
mediaRouter.use(createRequestsRouter());
mediaRouter.use(createModelsRouter());
mediaRouter.use(createPricingRouter());
mediaRouter.use(createKieCreditsRouter());
mediaRouter.use(createWavespeedBalanceRouter());
mediaRouter.use(createPromptEnhanceRouter());
mediaRouter.use(createLorasRouter());
mediaRouter.use(createSSERouter());
mediaRouter.use(createCompletionRouter());
