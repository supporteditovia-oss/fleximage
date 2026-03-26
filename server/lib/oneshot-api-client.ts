import { logger } from "./logger";
import { getSupabaseAdmin } from "./supabase-admin";

// ─── Configuration ───────────────────────────────────────────────
export function getOneshotApiConfig() {
  return {
    url: process.env.ONESHOT_API_URL,
    key: process.env.ONESHOT_API_KEY,
  };
}

// ─── App Settings (cached) ───────────────────────────────────────
let settingsCache: { forceKieAi: boolean; fallbackTimeoutMs: number } | null = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 30_000; // 30s

export async function getAppSettings(): Promise<{ forceKieAi: boolean; fallbackTimeoutMs: number }> {
  const now = Date.now();
  if (settingsCache && now - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return settingsCache;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["force_kie_ai", "fallback_timeout_ms"]);

    if (error) throw error;

    const map = new Map((data || []).map((r: any) => [r.key, r.value]));
    settingsCache = {
      forceKieAi: map.get("force_kie_ai") === "true",
      fallbackTimeoutMs: parseInt(map.get("fallback_timeout_ms") || "105000", 10),
    };
    settingsCacheTime = now;
    return settingsCache;
  } catch (err) {
    logger.error({ err }, "Failed to load app_settings, using defaults");
    return { forceKieAi: false, fallbackTimeoutMs: 105_000 };
  }
}

/** Bust the settings cache after an admin update */
export function invalidateSettingsCache() {
  settingsCache = null;
  settingsCacheTime = 0;
}

// ─── Types ───────────────────────────────────────────────────────
export interface OneshotJobPayload {
  model: "nano-banana";
  prompt: string;
  options?: {
    aspectRatio?: string;
    flowModel?: string;
    multiplier?: string;
    referenceImageUrls?: string[];
    referenceFileIds?: string[];
  };
}

// ─── Image upload (2-step signed upload) ─────────────────────────
export async function uploadToOneshotApi(
  imageBuffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const config = getOneshotApiConfig();
  if (!config.url || !config.key) {
    throw new Error("Missing ONESHOT_API_URL or ONESHOT_API_KEY");
  }

  // Step 1: Get signed upload URL
  const signResponse = await fetch(`${config.url}/v1/uploads/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.key,
    },
    body: JSON.stringify({
      filename,
      contentType,
      sizeBytes: imageBuffer.length,
    }),
  });

  if (!signResponse.ok) {
    const text = await signResponse.text();
    logger.error({ status: signResponse.status, body: text }, "OneshotAPI upload/sign failed");
    throw new Error(`OneshotAPI upload/sign error: ${signResponse.status}`);
  }

  const rawText = await signResponse.text();
  let signData: { uploadUrl: string; fileId: string };
  try {
    signData = JSON.parse(rawText);
  } catch (err) {
    logger.error({ status: signResponse.status, body: rawText }, "OneshotAPI upload/sign returned invalid JSON");
    throw new Error(`OneshotAPI returned invalid JSON (HTTP ${signResponse.status})`);
  }

  // Step 2: PUT the raw file to the signed URL
  const putResponse = await fetch(signData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(imageBuffer),
  });

  if (!putResponse.ok) {
    const text = await putResponse.text();
    logger.error({ status: putResponse.status, body: text }, "OneshotAPI file PUT failed");
    throw new Error(`OneshotAPI file PUT error: ${putResponse.status}`);
  }

  // Step 3: Validate the upload
  const completeResponse = await fetch(`${config.url}/v1/uploads/complete`, {
    method: "POST",
    headers: {
      "x-api-key": config.key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId: signData.fileId }),
  });

  if (!completeResponse.ok) {
    const text = await completeResponse.text();
    logger.error({ status: completeResponse.status, body: text }, "OneshotAPI upload/complete failed");
    throw new Error(`OneshotAPI upload/complete error: ${completeResponse.status}`);
  }

  return signData.fileId;
}

// ─── Job creation ────────────────────────────────────────────────
export async function createOneshotJob(
  prompt: string,
  options?: {
    aspectRatio?: string;
    referenceImageUrls?: string[];
    referenceFileIds?: string[];
  },
): Promise<any> {
  const config = getOneshotApiConfig();
  if (!config.url || !config.key) {
    throw new Error("Missing ONESHOT_API_URL or ONESHOT_API_KEY");
  }

  const payload: OneshotJobPayload = {
    model: "nano-banana",
    prompt: prompt,
    options: {
      aspectRatio: options?.aspectRatio || "9:16",
      flowModel: "Nano Banana 2",
      multiplier: "x1",
      ...(options?.referenceFileIds && options.referenceFileIds.length > 0
        ? { referenceFileIds: options.referenceFileIds }
        : {}),
      ...(options?.referenceImageUrls && options.referenceImageUrls.length > 0
        ? { referenceImageUrls: options.referenceImageUrls }
        : {}),
    },
  };

  const response = await fetch(`${config.url}/v1/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.key,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, "OneshotAPI createJob failed");
    throw new Error(`OneshotAPI error: ${response.status}`);
  }

  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch (err) {
    logger.error({ status: response.status, body: rawText }, "OneshotAPI createJob returned invalid JSON");
    throw new Error(`OneshotAPI returned invalid JSON (HTTP ${response.status})`);
  }
}

// ─── Job status polling ──────────────────────────────────────────
export async function getOneshotJobStatus(jobId: string): Promise<any> {
  const config = getOneshotApiConfig();
  if (!config.url || !config.key) {
    throw new Error("Missing ONESHOT_API_URL or ONESHOT_API_KEY");
  }

  const response = await fetch(`${config.url}/v1/jobs/${jobId}`, {
    method: "GET",
    headers: {
      "x-api-key": config.key,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text, jobId }, "OneshotAPI getStatus failed");
    throw new Error(`OneshotAPI error: ${response.status}`);
  }

  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch (err) {
    logger.error({ status: response.status, body: rawText, jobId }, "OneshotAPI getStatus returned invalid JSON");
    throw new Error(`OneshotAPI returned invalid JSON (HTTP ${response.status})`);
  }
}
