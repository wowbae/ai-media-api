import { IMapCallbackDataNewTask } from '../../maps';

interface IButtonConfig {
    text: string;
    data: Record<string, unknown>;
}

interface INewTaskButtonConfig extends Omit<IButtonConfig, 'data'> {
    text: string;
    data: IMapCallbackDataNewTask;
}

// экспортируем весь файл
export { INewTaskButtonConfig };
