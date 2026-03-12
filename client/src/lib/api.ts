import { supabase } from "./supabase";

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `Erreur ${res.status}`;
    if (text) {
      try {
        const json = JSON.parse(text);
        message = json.message || json.details || message;
      } catch {
        if (!text.startsWith("<")) message = text;
      }
    }
    throw new Error(message);
  }

  return res;
}
