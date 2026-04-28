import { logger } from "./logger";

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
  image?: string; // base64 data URI or public URL
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
  videoInfo?: { videoUrl?: string };
  video_url?: string;
  duration?: string;
  resolution?: string;
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

export async function createRunwayVideoTask(
  input: CreateRunwayVideoInput,
): Promise<CreateRunwayVideoResponse> {
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    aspectRatio: "9:16",
    quality: "720p",
    duration: 5,
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

  let parsed: CreateRunwayVideoResponse;
  try {
    parsed = JSON.parse(text) as CreateRunwayVideoResponse;
  } catch {
    logger.error({ status: response.status, body: text }, "Kie.ai Runway: non-JSON response");
    throw new Error(`Kie.ai Runway API error: ${response.status} — ${text}`);
  }

  const taskId = parsed.data?.task_id ?? parsed.data?.taskId;

  if (parsed.code !== 200 || !taskId) {
    logger.error(
      { status: response.status, apiCode: parsed.code, apiMsg: parsed.msg, data: parsed.data },
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

  if (!response.ok) {
    const text = await response.text();
    logger.error(
      { status: response.status, body: text, taskId },
      "Kie.ai Runway getStatus failed",
    );
    throw new Error(`Kie.ai Runway API error: ${response.status}`);
  }

  return response.json() as Promise<RunwayVideoStatusResponse>;
}
