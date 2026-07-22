import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { resolveLocaleFromRequest, tBackend } from "./i18n";

export function extractClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

// General API rate limiter: 500 requests per 15 minutes per IP
// Stripe webhooks must never be throttled — Stripe retries from shared IPs.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => extractClientIp(req),
  skip: (req) => {
    const path = req.path || "";
    const url = req.originalUrl || req.url || "";
    return (
      path === "/stripe/webhook" ||
      path.endsWith("/stripe/webhook") ||
      url.includes("/api/stripe/webhook")
    );
  },
  handler: (req, res, _next, options) => {
    const locale = resolveLocaleFromRequest(req);
    res.status(options.statusCode).json({
      message: tBackend(locale, "rateLimit.tooManyRequests"),
    });
  },
});

// Strict limiter for generation endpoints: 50 requests per hour per IP
export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => extractClientIp(req),
  handler: (req, res, _next, options) => {
    const locale = resolveLocaleFromRequest(req);
    res.status(options.statusCode).json({
      message: tBackend(locale, "rateLimit.tooManyGenerationRequests"),
    });
  },
});
