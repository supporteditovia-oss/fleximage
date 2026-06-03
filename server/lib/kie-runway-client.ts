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
