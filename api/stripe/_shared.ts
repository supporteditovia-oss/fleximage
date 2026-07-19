import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export type CheckoutPlan = "discovery" | "essential" | "ultimate";

const PLAN_CREDITS: Record<CheckoutPlan, number> = {
  discovery: 250,
  essential: 1100,
  ultimate: 2500,
};

const PLAN_ENV_KEYS: Record<CheckoutPlan, string> = {
  discovery: "STRIPE_DISCOVERY_PRICE_ID",
  essential: "STRIPE_ESSENTIAL_PRICE_ID",
  ultimate: "STRIPE_ULTIMATE_PRICE_ID",
};

export function normalizePlan(plan: unknown): CheckoutPlan {
  if (plan === "ultimate") return "ultimate";
  if (plan === "essential" || plan === "monthly" || plan === "video") {
    return "essential";
  }
  return "discovery";
}

export function getPlanPriceId(plan: CheckoutPlan): string {
  const envKey = PLAN_ENV_KEYS[plan];
  const priceId = process.env[envKey]?.trim();
  if (!priceId) {
    throw new Error(`${envKey} must be set`);
  }
  return priceId;
}

export function getPlanCredits(plan: CheckoutPlan): number {
  return PLAN_CREDITS[plan];
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY must be set");
  }
  return new Stripe(secretKey);
}

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export function resolveAppOrigin(originHeader?: string | string[]): string {
  const candidates = [
    Array.isArray(originHeader) ? originHeader[0] : originHeader,
    process.env.SITE_URL,
    process.env.APP_URL,
    process.env.VITE_PUBLIC_APP_URL,
    "https://www.luxeflexia.com",
  ];

  for (const candidate of candidates) {
    const raw = candidate?.toString().trim().replace(/\/$/, "");
    if (!raw) continue;
    try {
      const origin = new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        continue;
      }
      return origin;
    } catch {
      // try next
    }
  }

  return "https://www.luxeflexia.com";
}

export async function requireUserId(
  authorization: string | string[] | undefined,
): Promise<string> {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!header?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing auth token"), { status: 401 });
  }

  const token = header.slice("Bearer ".length).trim();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw Object.assign(new Error("Invalid auth token"), { status: 401 });
  }
  return data.user.id;
}

export function readJsonBody<T>(body: unknown): T {
  if (body == null) return {} as T;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as T;
    } catch {
      return {} as T;
    }
  }
  return body as T;
}
