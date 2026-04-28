import { logger } from "./logger";

const POSTHOG_KEY = process.env.POSTHOG_KEY || process.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || process.env.VITE_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!POSTHOG_KEY) {
    logger.debug({ event }, "PostHog server capture skipped: missing key");
    return;
  }

  try {
    const response = await fetch(`${POSTHOG_HOST.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        distinct_id: distinctId,
        event,
        properties,
      }),
    });

    if (!response.ok) {
      logger.warn(
        { event, status: response.status, body: await response.text() },
        "PostHog server capture failed",
      );
    }
  } catch (err) {
    logger.warn({ err, event }, "PostHog server capture error");
  }
}
