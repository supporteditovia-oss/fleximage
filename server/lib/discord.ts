import { logger } from "./logger";

function getDiscordWebhookUrl(): string | null {
  const fromEnv = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (fromEnv) return fromEnv;
  return null;
}

export async function notifyDiscord(content: string): Promise<void> {
  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    logger.warn("DISCORD_WEBHOOK_URL not set — Discord notify skipped");
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
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
