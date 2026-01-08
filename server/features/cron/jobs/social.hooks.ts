// пример cron задачи - временно отключена из-за удаления моделей User/AiChat
import type { ICronJob } from '../interfaces';

export const socialHooksCronJob: ICronJob = {
    name: 'social-hooks-job',
    // секунды, минуты, часы, день, месяц, день недели
    schedule: '0 0 10 */1 * *',
    enabled: false, // временно отключена
    handler: async () => {
        console.log('social-hooks-job временно отключена');
    },
};
