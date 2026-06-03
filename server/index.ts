import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { registerSeoRoutes } from "./lib/seo-routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { logger } from "./lib/logger";
import pinoHttp from "pino-http";
import { apiLimiter } from "./lib/rate-limiter";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);
app.use(cors());
// Stripe webhook needs raw body for signature verification — MUST be before express.json()
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use("/api", apiLimiter);

app.use(
  pinoHttp({
    logger,
    // Filter out asset requests from logs to keep them clean
    autoLogging: {
      ignore: (req) => {
        const url = req.url || "";
        return (
          url.startsWith("/@") ||
          url.includes(".") ||
          url.startsWith("/src/") ||
          url.startsWith("/node_modules/")
        );
      },
    },
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
      }),
    },
  }),
);

(async () => {
  await registerRoutes(httpServer, app);
  registerSeoRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error({ err, status }, message);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.info(`serving on port ${port}`);
    },
  );
})();
