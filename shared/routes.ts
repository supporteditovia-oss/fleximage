import { z } from "zod";
import {
  insertProfileSchema,
  insertPromptTemplateSchema,
  insertCategorySchema,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  health: {
    method: "GET" as const,
    path: "/api/health",
    responses: {
      200: z.object({ status: z.string() }),
    },
  },
  profiles: {
    get: {
      method: "GET" as const,
      path: "/api/profiles/:id",
      responses: {
        200: insertProfileSchema,
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/profiles/:id",
      responses: {
        200: insertProfileSchema,
        400: errorSchemas.validation,
      },
    },
  },
  templates: {
    list: {
      method: "GET" as const,
      path: "/api/templates",
    },
    get: {
      method: "GET" as const,
      path: "/api/templates/:id",
    },
    create: {
      method: "POST" as const,
      path: "/api/templates",
    },
    update: {
      method: "PATCH" as const,
      path: "/api/templates/:id",
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/templates/:id",
    },
    uploadImage: {
      method: "POST" as const,
      path: "/api/templates/:id/upload-image",
    },
  },
  pranks: {
    generate: {
      method: "POST" as const,
      path: "/api/pranks/generate",
    },
    generateDirect: {
      method: "POST" as const,
      path: "/api/pranks/generate-direct",
    },
    status: {
      method: "GET" as const,
      path: "/api/pranks/:taskId/status",
    },
    history: {
      method: "GET" as const,
      path: "/api/pranks/history",
    },
    download: {
      method: "GET" as const,
      path: "/api/pranks/:prankId/download/:imageIndex",
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/pranks/:prankId",
    },
  },
  admin: {
    credits: {
      method: "POST" as const,
      path: "/api/admin/credits",
    },
  },
  categories: {
    list: {
      method: "GET" as const,
      path: "/api/categories",
    },
    create: {
      method: "POST" as const,
      path: "/api/categories",
    },
    update: {
      method: "PATCH" as const,
      path: "/api/categories/:id",
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/categories/:id",
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
