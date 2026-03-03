// Kling 2.6 Motion Control провайдер через Kie.ai API
// Документация: https://kie.ai/kling-2.6-motion-control
import type {
  MediaProvider,
  GenerateParams,
  TaskCreatedResult,
  TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import { uploadToImgbb } from "../../imgbb.service";
import { getMediaPublicBaseUrl } from "../../config";
import type {
  KieAiConfig,
  KieAiKlingMotionControlRequest,
  KieAiKlingMotionCharacterOrientation,
  KieAiKlingMotionMode,
  KieAiStatusResponse,
} from "./interfaces";

const KIEAI_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
  waiting: "pending",
  queuing: "pending",
  generating: "processing",
  success: "done",
  completed: "done",
  fail: "failed",
  failed: "failed",
};

function mapMode(videoQuality?: "480p" | "720p" | "1080p"): KieAiKlingMotionMode {
  if (videoQuality === "1080p") return "pro";
  return "std"; // 720p по умолчанию
}

function mapCharacterOrientation(
  orientation?: "image" | "video"
): KieAiKlingMotionCharacterOrientation {
  if (orientation === "video") return "video";
  return "image"; // По умолчанию — ориентация как на изображении (макс 10с)
}

/** Преобразует путь в полный публичный URL для доступа к видео */
function toPublicVideoUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const baseUrl = getMediaPublicBaseUrl();
  const cleanPath = pathOrUrl.replace(/^\/+/, "");
  return `${baseUrl}/media-files/${cleanPath}`;
}

export function createKieAiKlingMotionControlProvider(
  config: KieAiConfig
): MediaProvider {
  const { apiKey, baseURL } = config;

  async function createTask(
    params: GenerateParams
  ): Promise<{ taskId: string }> {
    const hasImage = params.inputFiles && params.inputFiles.length > 0;
    const hasVideo =
      params.inputVideoFiles && params.inputVideoFiles.length > 0;

    if (!hasImage || !hasVideo) {
      throw new Error(
        "Kling Motion Control требует 1 изображение (персонаж) и 1 видео (референс движения). Загрузите оба файла."
      );
    }

    const inputImage = params.inputFiles![0];
    const inputVideo = params.inputVideoFiles![0];

    let imageUrl: string;
    if (inputImage.startsWith("data:")) {
      imageUrl = await uploadToImgbb(inputImage);
    } else {
      imageUrl = inputImage;
    }

    const videoUrl = toPublicVideoUrl(inputVideo);

    const mode = mapMode(params.videoQuality);
    const characterOrientation = mapCharacterOrientation(
      params.characterOrientation
    );

    const requestBody: KieAiKlingMotionControlRequest = {
      model: "kling-2.6/motion-control",
      input: {
        prompt: params.prompt,
        input_urls: [imageUrl],
        video_urls: [videoUrl],
        character_orientation: characterOrientation,
        mode,
      },
    };

    const response = await fetch(`${baseURL}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Kie.ai Kling Motion Control API error: ${response.status} - ${errorText}`
      );
    }

    const responseData = (await response.json()) as {
      code: number;
      msg: string;
      data: { taskId: string };
    };

    if (responseData.code !== 200) {
      throw new Error(
        `Kie.ai API error: ${responseData.code} - ${responseData.msg}`
      );
    }

    if (!responseData.data?.taskId) {
      throw new Error(
        `Не удалось получить taskId. Ответ: ${JSON.stringify(responseData)}`
      );
    }

    return { taskId: responseData.data.taskId };
  }

  async function getTaskResultFromAPI(
    taskId: string
  ): Promise<KieAiStatusResponse> {
    const url = `${baseURL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Kie.ai API error: ${response.status} - ${await response.text()}`
      );
    }

    const apiResponse = (await response.json()) as {
      code: number;
      data: {
        taskId: string;
        state: "waiting" | "queuing" | "generating" | "success" | "fail";
        resultJson: string;
        failMsg: string;
      };
    };

    if (apiResponse.code !== 200) {
      throw new Error(`Kie.ai API error: ${apiResponse.code}`);
    }

    const taskData = apiResponse.data;
    let status: KieAiStatusResponse["status"];
    switch (taskData.state) {
      case "waiting":
      case "queuing":
        status = "pending";
        break;
      case "generating":
        status = "processing";
        break;
      case "success":
        status = "completed";
        break;
      case "fail":
        status = "failed";
        break;
      default:
        status = "pending";
    }

    let resultUrls: string[] = [];
    if (taskData.state === "success" && taskData.resultJson) {
      try {
        const parsed = JSON.parse(taskData.resultJson) as {
          resultUrls?: string[];
        };
        resultUrls = parsed.resultUrls ?? [];
      } catch {
        // игнорируем ошибку парсинга
      }
    }

    return {
      taskId: taskData.taskId,
      status,
      resultUrls,
      error: taskData.state === "fail" ? taskData.failMsg : undefined,
      result:
        resultUrls.length > 0
          ? { url: resultUrls[0], urls: resultUrls }
          : undefined,
    };
  }

  return {
    name: "kieai-kling-motion-control",
    isAsync: true,

    async generate(params: GenerateParams): Promise<TaskCreatedResult> {
      const result = await createTask(params);
      return {
        taskId: result.taskId,
        status: "pending",
      };
    },

    async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
      const result = await getTaskResultFromAPI(taskId);
      const mappedStatus =
        KIEAI_STATUS_MAP[result.status as string] ?? "pending";
      return {
        status: mappedStatus,
        url: result.result?.url ?? result.resultUrls?.[0],
        error: result.error,
      };
    },

    async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
      const result = await getTaskResultFromAPI(taskId);

      if (result.status !== "completed" || !result.resultUrls?.length) {
        throw new Error(
          `Задача не завершена: status=${result.status}${result.error ? `, error=${result.error}` : ""}`
        );
      }

      const files: SavedFileInfo[] = [];
      for (const url of result.resultUrls) {
        const saved = await saveFileFromUrl(url);
        files.push(saved);
      }
      return files;
    },
  };
}
