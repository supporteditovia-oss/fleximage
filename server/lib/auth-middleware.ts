import type { Request, Response, NextFunction } from "express";
import { getSupabaseAdmin } from "./supabase-admin";
import { logger } from "./logger";

export interface AuthenticatedRequest extends Request {
  userId: string;
  userRole: string;
}

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

  (req as AuthenticatedRequest).userId = data.user.id;
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
