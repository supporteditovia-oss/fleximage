import type { Express, Request, Response, NextFunction } from "express";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { handleCrmAdminApi } = require("../api/_lib/crm-admin-api.js") as {
  handleCrmAdminApi: (
    req: Request,
    res: Response,
    parts: string[],
  ) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  verifySessionToken,
  readSessionCookie,
  SESSION_COOKIE_NAME,
} = require("../api/_lib/crm-auth.js") as {
  verifySessionToken: (token: string) => Promise<unknown>;
  readSessionCookie: (req: Request) => string | null;
  SESSION_COOKIE_NAME: string;
};

const CRM_PROTECTED_HTML =
  /^\/admin\/(dashboard|library|pov|music|publish|analytics|settings)(\/|$)/;

export function registerCrmAdminRoutes(app: Express) {
  app.use("/admin/api", (req, res) => {
    const parts = req.path.replace(/^\//, "").split("/").filter(Boolean);
    void handleCrmAdminApi(req, res, parts);
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();
    if (!CRM_PROTECTED_HTML.test(req.path)) return next();
    const accept = String(req.headers.accept || "");
    if (!accept.includes("text/html")) return next();

    const token = readSessionCookie(req);
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      res.redirect(302, "/admin");
      return;
    }
    next();
  });
}

export { SESSION_COOKIE_NAME };
