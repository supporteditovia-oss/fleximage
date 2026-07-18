import { createHash } from "node:crypto";
import { logger } from "./logger";

const SNAP_CAPI_BASE = "https://tr.snapchat.com/v3";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface SnapPurchasePayload {
  eventId: string;
  value: number;
  currency: string;
  email?: string | null;
  eventSourceUrl?: string;
}

/**
 * Server-side Snap Conversions API PURCHASE.
 * Call only from verified Stripe webhook handlers — never from the client.
 */
export async function sendSnapPurchaseEvent(
  payload: SnapPurchasePayload,
): Promise<void> {
  const pixelId = process.env.SNAP_PIXEL_ID || process.env.VITE_SNAP_PIXEL_ID;
  const token = process.env.SNAP_CAPI_TOKEN;

  if (!pixelId || !token) {
    logger.info(
      { hasPixel: Boolean(pixelId), hasToken: Boolean(token) },
      "Snap CAPI skipped (SNAP_PIXEL_ID / SNAP_CAPI_TOKEN not configured)",
    );
    return;
  }

  const appUrl = process.env.APP_URL || process.env.SITE_URL || "https://larpking.com";
  const userData: Record<string, string> = {};
  if (payload.email) {
    userData.em = sha256Hex(payload.email);
  }

  const body = {
    data: [
      {
        event_name: "PURCHASE",
        event_time: Math.floor(Date.now() / 1000),
        event_id: payload.eventId,
        action_source: "WEBSITE",
        event_source_url: payload.eventSourceUrl || `${appUrl}/resultat`,
        user_data: userData,
        custom_data: {
          currency: payload.currency.toUpperCase(),
          value: payload.value,
          contents: [
            {
              id: "subscription",
              quantity: 1,
              item_price: payload.value,
            },
          ],
        },
      },
    ],
  };

  try {
    const url = `${SNAP_CAPI_BASE}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error(
        { status: res.status, body: text.slice(0, 500), eventId: payload.eventId },
        "Snap CAPI PURCHASE failed",
      );
      return;
    }

    logger.info({ eventId: payload.eventId }, "Snap CAPI PURCHASE sent");
  } catch (err) {
    logger.error({ err, eventId: payload.eventId }, "Snap CAPI PURCHASE error");
  }
}
