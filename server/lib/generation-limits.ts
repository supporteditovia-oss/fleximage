import { getSupabaseAdmin } from "./supabase-admin";

const FREE_GENERATION_LIMIT = 1;

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  isSubscriber: boolean;
  generationCount: number;
}

export async function checkGenerationLimits(
  userId: string,
): Promise<LimitCheckResult> {
  const supabase = getSupabaseAdmin();

  // 1. Check if user is subscriber or admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_subscriber, role, generation_count, credits")
    .eq("id", userId)
    .single();

  if (!profile) {
    return {
      allowed: false,
      reason: "Profil introuvable",
      isSubscriber: false,
      generationCount: 0,
    };
  }

  // Admins and subscribers bypass limits
  if (profile.is_subscriber || profile.role === "admin") {
    return {
      allowed: true,
      isSubscriber: true,
      generationCount: profile.generation_count,
    };
  }

  // 2. Check user generation count
  if (profile.generation_count >= FREE_GENERATION_LIMIT) {
    return {
      allowed: false,
      reason: "Limite de générations gratuites atteinte",
      isSubscriber: false,
      generationCount: profile.generation_count,
    };
  }

  return {
    allowed: true,
    isSubscriber: false,
    generationCount: profile.generation_count,
  };
}

export async function recordGeneration(
  userId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  // Increment generation_count on profile
  await supabase.rpc("increment_generation_count", { p_user_id: userId });
}

export { FREE_GENERATION_LIMIT };
