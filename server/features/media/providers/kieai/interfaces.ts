export interface KieAiConfig {
    apiKey: string;
    baseURL: string;
}

export type KieAiTaskState =
    | "waiting"
    | "queuing"
    | "generating"
    | "success"
    | "fail";

export interface KieAiJobRequest {
    model?: string;
    taskType?: string;
    callBackUrl?: string;
    input?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface KieAiJobResponse {
    code: number;
    msg: string;
    data: {
        taskId?: string;
        id?: string;
        [key: string]: unknown;
    } | null;
}

export interface KieAiTaskDetail {
    taskId: string;
    model: string;
    state: KieAiTaskState;
    param?: string;
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
    completeTime?: number;
    createTime?: number;
    updateTime?: number;
    [key: string]: unknown;
}

export interface KieAiTaskResponse {
    code?: number;
    msg?: string;
    data?: KieAiTaskDetail;
    [key: string]: unknown;
}
