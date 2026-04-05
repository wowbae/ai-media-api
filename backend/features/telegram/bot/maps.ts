import { Actions_NewTask, Actions_ProjectList } from './handlers/callback';

interface IMapCallbackDataNewTask {
    action: Actions_NewTask;
    projectId?: string;
    groupId?: string;
    date?: string;
    repeats?: string;
    finish?: boolean;
}
interface IMapProjects {
    id: string;
    name: string;
    sortOrder: number;
    groupId: string;
    permission: string;
    kind: string;
}

interface IMapCallbackDataProjectList {
    action: Actions_ProjectList;
    projectId: string;
}

const callbackDataNewTaskMap = new Map<string, IMapCallbackDataNewTask>();
const callbackDataProjectListMap = new Map<
    string,
    IMapCallbackDataProjectList
>();

const projectListMap = new Map<string, IMapProjects[]>();

export {
    IMapCallbackDataNewTask,
    IMapProjects,
    projectListMap,
    callbackDataNewTaskMap,
    callbackDataProjectListMap,
};
