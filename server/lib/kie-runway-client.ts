import { logger } from "./logger";
import { OUTPUT_ASPECT_RATIO } from "@shared/schema";

const KIE_RUNWAY_BASE_URL = "https://api.kie.ai/api/v1/runway";

function getApiKey(): string {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) {
    throw new Error("KIE_AI_API_KEY environment variable is not set");
  }
  return key;
}

export interface CreateRunwayVideoInput {
  prompt: string;
  image?: string;
  aspectRatio?: string;
}

export interface CreateRunwayVideoResponse {
  code: number;
  msg: string;
  data: { task_id?: string; taskId?: string } | null;
}

export interface RunwayVideoStatusData {
  taskId?: string;
  task_id?: string;
  state?: "wait" | "queueing" | "generating" | "success" | "fail";
  status?: "pending" | "processing" | "completed" | "failed";
  videoInfo?: {
    videoId?: string;
    videoUrl?: string;
    imageUrl?: string;
  };
  video_url?: string;
  generateTime?: string;
  expireFlag?: number;
  duration?: string;
  resolution?: string;
  failCode?: string;
  failMsg?: string;
  fail_reason?: string;
}

export interface RunwayVideoStatusResponse {
  code: number;
  msg: string;
  data: RunwayVideoStatusData;
}

export class RunwayApiError extends Error {
  constructor(
    message: string,
    public readonly apiCode: number,
    public readonly apiMsg: string,
  ) {
    super(message);
    this.name = "RunwayApiError";
  }
}

function parseRunwayResponse<T>(
  text: string,
  status: number,
  context: string,
): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    logger.error({ status, body: text }, `Kie.ai Runway ${context}: non-JSON response`);
    throw new Error(`Kie.ai Runway API error: ${status} - ${text}`);
  }
}

export async function createRunwayVideoTask(
  input: CreateRunwayVideoInput,
): Promise<CreateRunwayVideoResponse> {
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    duration: 5,
    quality: "720p",
    aspectRatio: input.aspectRatio || OUTPUT_ASPECT_RATIO,
    waterMark: "",
  };

  if (input.image) {
    body.imageUrl = input.image;
  }

  const response = await fetch(`${KIE_RUNWAY_BASE_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = parseRunwayResponse<CreateRunwayVideoResponse>(
    text,
    response.status,
    "createTask",
  );
  const taskId = parsed.data?.task_id ?? parsed.data?.taskId;

  if (!response.ok || parsed.code !== 200 || !taskId) {
    logger.error(
      {
        status: response.status,
        apiCode: parsed.code,
        apiMsg: parsed.msg,
        data: parsed.data,
      },
      "Kie.ai Runway createTask failed",
    );
    throw new RunwayApiError(
      parsed.msg || "Runway API error",
      parsed.code,
      parsed.msg,
    );
  }

  parsed.data = { ...parsed.data, task_id: taskId };
  return parsed;
}

export interface CreateRunwayExtendVideoInput {
  taskId: string;
  prompt: string;
  quality?: "standard" | "high" | "720p" | "1080p";
  callBackUrl?: string;
}

export function normalizeRunwayExtendQuality(
  quality?: string,
): "720p" | "1080p" {
  const q = String(quality || "").toLowerCase();
  if (q === "high" || q === "1080p") return "1080p";
  return "720p";
}

export async function createRunwayExtendVideoTask(
  input: CreateRunwayExtendVideoInput,
): Promise<{ taskId: string; parentTaskId: string }> {
  const taskId = String(input.taskId || "").trim();
  const prompt = String(input.prompt || "").trim().slice(0, 2000);
  if (!taskId) {
    throw new Error("Runway extend requires taskId");
  }

  const body: Record<string, unknown> = {
    taskId,
    prompt,
    quality: normalizeRunwayExtendQuality(input.quality),
    waterMark: "",
  };
  if (input.callBackUrl) {
    body.callBackUrl = input.callBackUrl;
  }

  const response = await fetch(`${KIE_RUNWAY_BASE_URL}/extend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = parseRunwayResponse<{
    code: number;
    msg: string;
    data: { taskId?: string; task_id?: string } | null;
  }>(text, response.status, "extend");
  const newTaskId = parsed.data?.taskId ?? parsed.data?.task_id;

  if (!response.ok || parsed.code !== 200 || !newTaskId) {
    logger.error(
      {
        status: response.status,
        apiCode: parsed.code,
        apiMsg: parsed.msg,
        parentTaskId: taskId,
      },
      "Kie.ai Runway extend failed",
    );
    throw new RunwayApiError(
      parsed.msg || "Runway extend API error",
      parsed.code,
      parsed.msg,
    );
  }

  return { taskId: newTaskId, parentTaskId: taskId };
}

export async function getRunwayVideoStatus(
  taskId: string,
): Promise<RunwayVideoStatusResponse> {
  const response = await fetch(
    `${KIE_RUNWAY_BASE_URL}/record-detail?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
    },
  );

  const text = await response.text();
  const parsed = parseRunwayResponse<RunwayVideoStatusResponse>(
    text,
    response.status,
    "getStatus",
  );

  if (!response.ok || parsed.code !== 200) {
    logger.error(
      {
        status: response.status,
        apiCode: parsed.code,
        apiMsg: parsed.msg,
        data: parsed.data,
        taskId,
      },
      "Kie.ai Runway getStatus failed",
    );
    throw new RunwayApiError(
      parsed.msg || "Runway API error",
      parsed.code,
      parsed.msg,
    );
  }

  return parsed;
}
