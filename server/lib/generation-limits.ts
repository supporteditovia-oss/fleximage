import { getSupabaseAdmin } from "./supabase-admin";

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  isSubscriber: boolean;
  isAdmin: boolean;
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
      isAdmin: false,
      generationCount: 0,
    };
  }

  // Admins bypass all limits
  if (profile.role === "admin") {
    return {
      allowed: true,
      isSubscriber: true,
      isAdmin: true,
      generationCount: profile.generation_count,
    };
  }

  // Everyone (including subscribers) must have credits to generate
  if (profile.credits < 5) {
    return {
      allowed: false,
      reason: profile.is_subscriber
        ? "Tu n'as plus de crédits. Tes crédits seront rechargés au prochain renouvellement."
        : "Crédits insuffisants. Abonne-toi pour obtenir des crédits et générer des pranks.",
      isSubscriber: profile.is_subscriber,
      isAdmin: false,
      generationCount: profile.generation_count,
    };
  }

  return {
    allowed: true,
    isSubscriber: profile.is_subscriber,
    isAdmin: false,
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
