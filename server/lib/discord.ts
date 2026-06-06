import { logger } from "./logger";

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1512860903001952328/XeBJyfjzZzmBRxsfwj9p0fWj66KmclMYR-y7uFGn8pTAHihQB5dLJvW6XSdzYwj2nvbw";

export async function notifyDiscord(content: string): Promise<void> {
  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status },
        "Discord webhook returned non-OK status",
      );
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send Discord webhook");
  }
}
