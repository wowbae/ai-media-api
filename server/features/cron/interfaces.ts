// интерфейсы для cron задач
export interface ICronJob {
    name: string;
    schedule: string; // cron выражение (например: '0 0 * * *' - каждый день в полночь)
    handler: () => Promise<void> | void;
    enabled?: boolean; // опционально, для включения/выключения задач
}

