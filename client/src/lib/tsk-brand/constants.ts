/** Identité officielle TSK Digital — indépendante de LuxeFlexIA. */

export const TSK_BRAND = {
  name: "TSK Digital",
  legalName: "TSK Digital",
  tagline: "Sites premium · SaaS · IA · Automatisations · Branding",
  colors: {
    ink: "#0B0B0C",
    white: "#FFFFFF",
    titanium: "#A7A7A7",
  },
  fonts: {
    primary: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  assets: {
    logoHorizontal: "/brand/tsk/tsk-horizontal.svg",
    logoHorizontalMono: "/brand/tsk/tsk-horizontal-mono.svg",
    logoHorizontalOnDark: "/brand/tsk/tsk-horizontal-on-dark.svg",
    logoMark: "/brand/tsk/tsk-mark.svg",
    logoMarkOnDark: "/brand/tsk/tsk-mark-on-dark.svg",
    logoMarkMono: "/brand/tsk/tsk-mark-mono.svg",
    logoMarkPng: "/brand/tsk/tsk-mark.png",
    logoHorizontalPng: "/brand/tsk/tsk-horizontal.png",
    favicon32: "/brand/tsk/tsk-mark-32.png",
  },
} as const;

/** Coordonnées émettrice par défaut (modifiables dans Administration → Documents). */
export const TSK_ISSUER_DEFAULTS = {
  company: "TSK Digital",
  addressLine1: "Adresse du siège",
  addressLine2: "Code postal · Ville · France",
  email: "contact@tskdigital.fr",
  phone: "+33 · · · · · · · · ·",
  siret: "SIRET · · · · · · · · · · · · ·",
  vat: "TVA intracommunautaire · · · · · · · · ·",
  iban: "IBAN · · · · · · · · · · · · · · · · · · · · · ·",
  bic: "BIC · · · · · · ·",
  paymentTermsDays: 30,
  quoteValidityDays: 30,
} as const;
