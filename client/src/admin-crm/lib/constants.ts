export const CRM_MEDIA_FOLDERS = [
  {
    id: "photos",
    label: "Photos",
    children: [
      { key: "photos/normal", label: "Photos normales" },
      { key: "photos/snapchat", label: "Photos Snapchat" },
    ],
  },
  {
    id: "videos",
    label: "Vidéos",
    children: [
      { key: "videos/instagram", label: "Vidéos Instagram" },
      { key: "videos/recording", label: "Vidéos Enregistrement" },
      { key: "videos/final", label: "Vidéos Finales" },
    ],
  },
] as const;

export const COUNTRY_META: Record<
  string,
  { flag: string; label: string; timezone: string; language: string }
> = {
  FR: { flag: "🇫🇷", label: "France", timezone: "Europe/Paris", language: "fr" },
  ES: { flag: "🇪🇸", label: "Espagne", timezone: "Europe/Madrid", language: "es" },
  US: { flag: "🇺🇸", label: "États-Unis", timezone: "America/New_York", language: "en" },
  GB: { flag: "🇬🇧", label: "Royaume-Uni", timezone: "Europe/London", language: "en" },
  DE: { flag: "🇩🇪", label: "Allemagne", timezone: "Europe/Berlin", language: "de" },
  IT: { flag: "🇮🇹", label: "Italie", timezone: "Europe/Rome", language: "it" },
  TR: { flag: "🇹🇷", label: "Turquie", timezone: "Europe/Istanbul", language: "tr" },
};

export const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  active: "Connecté",
  paused: "En pause",
  disconnected: "Déconnecté",
};

export function countryFlag(code: string | null | undefined) {
  if (!code) return "🌍";
  return COUNTRY_META[code.toUpperCase()]?.flag ?? "🌍";
}

export function platformLabel(p: string) {
  if (p === "tiktok") return "TikTok";
  if (p === "instagram") return "Instagram";
  if (p === "youtube") return "YouTube Shorts";
  return p;
}

export const WARMUP_PHASE_LABEL: Record<string, string> = {
  new: "Nouveau",
  warming: "Warm-up",
  active: "Actif",
  rest: "Repos",
};
