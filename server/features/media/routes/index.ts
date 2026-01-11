// Главный файл для регистрации всех роутов
import { Router } from 'express';
import { initMediaStorage } from '../file.service';
import { initTelegramNotifier } from '../telegram.notifier';
import { createChatsRouter } from './chats';
import { createGenerateRouter } from './generate';
import { createFilesRouter } from './files';
import { createRequestsRouter } from './requests';
import { createModelsRouter } from './models';

export const mediaRouter = Router();

// Инициализация при загрузке модуля
initMediaStorage().catch(console.error);
initTelegramNotifier().catch(console.error);

// Регистрируем все роуты
mediaRouter.use(createChatsRouter());
mediaRouter.use(createGenerateRouter());
mediaRouter.use(createFilesRouter());
mediaRouter.use(createRequestsRouter());
mediaRouter.use(createModelsRouter());
