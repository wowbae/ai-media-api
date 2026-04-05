import { callbackDataNewTaskMap, callbackDataProjectListMap, IMapProjects, projectListMap } from '../../maps';
import { randomKey } from '../../utils/random';
import { InlineKeyboard } from 'grammy';
import * as Interfaces from './interfaces.keyboard';
import { Actions_NewTask, Actions_ProjectList } from '../../handlers/callback';

export function buildKeyboard_NewTask(
    buttons: Interfaces.INewTaskButtonConfig[]
) {
    const keyboard = new InlineKeyboard();
    for (const button of buttons) {
        const key = randomKey();
        keyboard.text(button.text, key);
        callbackDataNewTaskMap.set(key, button.data);
    }
    return keyboard;
}

export function buildKeyboard_ProjectList(projects: IMapProjects[]) {
    const keyboard = new InlineKeyboard();
    for (const project of projects) {
        const key = randomKey();
        keyboard.text(project.name, key);
        callbackDataProjectListMap.set(key, {
            action: Actions_ProjectList.select_project,
            projectId: project.id,
        });
    }

    return keyboard;
}

