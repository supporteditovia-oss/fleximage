import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { logger } from "./logger";
import { resolveLocaleFromRequest, tBackend } from "./i18n";

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const locale = resolveLocaleFromRequest(req);
        const validationError = fromZodError(error);
        logger.warn({ path: req.path, error: validationError.message }, "Validation failed");
        return res.status(400).json({ 
          message: tBackend(locale, "validation.failed"), 
          details: validationError.message 
        });
      }
      next(error);
    }
  };
}
