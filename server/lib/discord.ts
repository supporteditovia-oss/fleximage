import { logger } from "./logger";

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1482109756448440532/v4rzRWDlz6rXdiIxV2nFgKT8svJ5ZljAgXfexDd37gWufsNnh8qZd6gYKKTbMVykE7If";

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
