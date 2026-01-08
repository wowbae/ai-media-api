// регистрация cron задач
import cron, { type ScheduledTask } from 'node-cron';
import type { ICronJob } from './interfaces';
import { DateTime } from 'luxon';

export function registerCronJobs(jobs: ICronJob[]) {
    const registeredJobs: ScheduledTask[] = [];

    for (const job of jobs) {
        if (job.enabled === false) {
            console.log(`⏸️  Cron job "${job.name}" is disabled, skipping...`);
            continue;
        }

        // валидация cron выражения
        if (!cron.validate(job.schedule)) {
            console.error(
                `❌ Invalid cron schedule for job "${job.name}": ${job.schedule}`
            );
            continue;
        }

        const task = cron.schedule(job.schedule, async () => {
            try {
                console.log(
                    `🕐 ${DateTime.now().toFormat('HH:mm:ss')} Running cron job: ${job.name}`
                );
                await job.handler();
                console.log(`✅ Cron job "${job.name}" completed successfully in ${DateTime.now().diff(DateTime.now().minus({ seconds: 1 })).toFormat('ss')} seconds`);
            } catch (error) {
                console.error(`❌ Error in cron job "${job.name}":`, error);
            }
        });

        registeredJobs.push(task);
        console.log(
            `✅ Registered cron job: "${job.name}" with schedule: ${job.schedule}`
        );
    }

    return registeredJobs;
}
