async function crmRequest<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`/admin/api/${path}`, {
    ...init,
    headers,
    body,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur CRM (${res.status})`);
  }
  return data as T;
}

export const crmApi = {
  dashboard: () => crmRequest<import("../types").CrmDashboard>("data/dashboard"),

  oauth: {
    status: () =>
      crmRequest<{
        redirectOrigin: string;
        platforms: Record<import("../types").CrmPlatform, boolean>;
      }>("oauth/status"),
    startUrl: (platform: import("../types").CrmPlatform, country: string) =>
      `/admin/api/oauth/start?platform=${encodeURIComponent(platform)}&country=${encodeURIComponent(country)}`,
  },

  accounts: {
    list: () =>
      crmRequest<{ items: import("../types").CrmAccount[] }>("data/accounts"),
    get: (id: string) => crmRequest(`data/accounts/${id}`),
    create: (json: Partial<import("../types").CrmAccount>) =>
      crmRequest("data/accounts", { method: "POST", json }),
    update: (id: string, json: Record<string, unknown>) =>
      crmRequest(`data/accounts/${id}`, { method: "PATCH", json }),
    remove: (id: string) =>
      crmRequest(`data/accounts/${id}`, { method: "DELETE" }),
    disconnect: (id: string) =>
      crmRequest<import("../types").CrmAccount>(
        `data/accounts/${id}/disconnect`,
        { method: "POST" },
      ),
  },

  warmup: {
    overview: () => crmRequest<{ items: unknown[] }>("data/warmup/overview"),
    interact: (accountId: string, json: Record<string, unknown>) =>
      crmRequest(`data/warmup/${accountId}/interact`, {
        method: "POST",
        json,
      }),
  },

  folders: {
    list: () => crmRequest<{ items: Array<{ folder_key: string; parent_group: string; label: string }> }>("data/folders"),
    create: (json: { label: string; parent_group: "photos" | "videos" }) =>
      crmRequest("data/folders", { method: "POST", json }),
  },

  media: {
    upload: (json: Record<string, unknown>) =>
      crmRequest("data/media/upload", { method: "POST", json }),
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params)}` : "";
      return crmRequest<{ items: import("../types").CrmMedia[] }>(
        `data/media${qs}`,
      );
    },
    create: (json: Record<string, unknown>) =>
      crmRequest("data/media", { method: "POST", json }),
    update: (id: string, json: Record<string, unknown>) =>
      crmRequest(`data/media/${id}`, { method: "PATCH", json }),
    bulkDelete: (ids: string[]) =>
      crmRequest("data/media/bulk-delete", { method: "POST", json: { ids } }),
  },

  music: {
    upload: (json: Record<string, unknown>) =>
      crmRequest("data/music/upload", { method: "POST", json }),
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params)}` : "";
      return crmRequest<{ items: import("../types").CrmMusic[] }>(
        `data/music${qs}`,
      );
    },
    create: (json: Record<string, unknown>) =>
      crmRequest("data/music", { method: "POST", json }),
    update: (id: string, json: Record<string, unknown>) =>
      crmRequest(`data/music/${id}`, { method: "PATCH", json }),
    remove: (id: string) =>
      crmRequest(`data/music/${id}`, { method: "DELETE" }),
  },

  posts: {
    list: (from?: string, to?: string) => {
      const p = new URLSearchParams();
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const qs = p.toString() ? `?${p}` : "";
      return crmRequest<{ items: import("../types").CrmPost[] }>(
        `data/posts${qs}`,
      );
    },
    create: (json: Record<string, unknown>) =>
      crmRequest("data/posts", { method: "POST", json }),
    update: (id: string, json: Record<string, unknown>) =>
      crmRequest(`data/posts/${id}`, { method: "PATCH", json }),
    remove: (id: string) =>
      crmRequest(`data/posts/${id}`, { method: "DELETE" }),
  },

  pov: {
    get: () =>
      crmRequest<{ preset: import("../types").CrmPovPreset | null }>(
        "data/pov",
      ),
    save: (json: Record<string, unknown>) =>
      crmRequest("data/pov", { method: "PUT", json }),
  },
};
