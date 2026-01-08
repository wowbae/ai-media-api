import { IMapDataNewTask } from '../../maps';

interface IButtonConfig {
    text: string;
    data: Record<string, any>;
}

interface INewTaskButtonConfig extends IButtonConfig {
    text: string;
    data: IMapDataNewTask;
}

// экспортируем весь файл
export { INewTaskButtonConfig };
