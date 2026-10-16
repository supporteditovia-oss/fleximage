/** Démarre le serveur dev (compatible Windows — pas de NODE_ENV=… inline). */
process.env.NODE_ENV = process.env.NODE_ENV || "development";
await import("../server/index.ts");
