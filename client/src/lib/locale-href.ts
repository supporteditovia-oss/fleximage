import { toUiLocale, resolvePreferredLocale } from "@shared/locales";

/** Append ?lang=en when the UI is English so navigation keeps locale after full reloads. */
export function localeHref(path: string, localeLike?: string | null): string {
  const locale = toUiLocale(resolvePreferredLocale(localeLike, "fr"));
  if (locale !== "en") return path;
  const [pathname, hash = ""] = path.split("#");
  const [base, search = ""] = pathname.split("?");
  const params = new URLSearchParams(search);
  params.set("lang", "en");
  const query = params.toString();
  return `${base}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
