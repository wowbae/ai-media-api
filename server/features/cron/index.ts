// экспорт всех cron задач и утилит
export { registerCronJobs } from './register';
export type { ICronJob } from './interfaces';

// импортируем все задачи
import { socialHooksCronJob } from './jobs/social.hooks';

// собираем все задачи в массив
export const cronJobs = [
	socialHooksCronJob,
];
