import { logger } from "./logger";

const KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs";

function getApiKey(): string {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) {
    throw new Error("KIE_AI_API_KEY environment variable is not set");
  }
  return key;
}

export interface CreateTaskInput {
  prompt: string;
  aspect_ratio?: string;
  resolution?: string;
  output_format?: string;
  image_input?: string[];
}

export interface CreateTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

export interface TaskStatusData {
  taskId: string;
  model: string;
  state: "waiting" | "success" | "fail";
  param: string;
  resultJson: string | null;
  failCode: string | null;
  failMsg: string | null;
  costTime: number | null;
  completeTime: number | null;
  createTime: number;
}

export interface TaskStatusResponse {
  code: number;
  msg: string;
  data: TaskStatusData;
}

export async function createKieTask(input: CreateTaskInput): Promise<CreateTaskResponse> {
  const response = await fetch(`${KIE_BASE_URL}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "Kie.ai createTask failed");
    throw new Error(`Kie.ai API error: ${response.status}`);
  }

  return response.json();
}

export async function getKieTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(
    `${KIE_BASE_URL}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "Kie.ai recordInfo failed");
    throw new Error(`Kie.ai API error: ${response.status}`);
  }

  return response.json();
}
