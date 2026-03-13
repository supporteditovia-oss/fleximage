import type { Request, Response, NextFunction } from "express";
import { getSupabaseAdmin } from "./supabase-admin";
import { logger } from "./logger";
import { notifyDiscord } from "./discord";

export interface AuthenticatedRequest extends Request {
  userId: string;
  userRole: string;
}

// Track users we've already notified this server lifetime to avoid duplicates
const notifiedSignups = new Set<string>();

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token d'authentification manquant" });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    logger.warn({ error }, "Invalid auth token");
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }

  const userId = data.user.id;
  (req as AuthenticatedRequest).userId = userId;

  // Detect new signups (email + Google) — fire-and-forget
  if (!notifiedSignups.has(userId)) {
    notifiedSignups.add(userId);
    Promise.resolve(
      supabaseAdmin
        .from("profiles")
        .select("generation_count, email, created_at")
        .eq("id", userId)
        .single(),
    )
      .then(({ data: profile }) => {
        if (!profile) return;
        const createdAt = new Date(profile.created_at).getTime();
        const now = Date.now();
        // Only notify if profile was created in the last 2 minutes
        if (profile.generation_count === 0 && now - createdAt < 2 * 60 * 1000) {
          notifyDiscord(
            `🆕 **Nouvel inscrit !** ${profile.email || userId} vient de rejoindre TurboPrank.`,
          );
        }
      })
      .catch(() => {});
  }

  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", authReq.userId)
    .single();

  if (error || data?.role !== "admin") {
    return res.status(403).json({ message: "Accès réservé aux administrateurs" });
  }

  authReq.userRole = "admin";
  next();
}
