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
  /** Logo officiel fourni par le fondateur — ne pas régénérer pour les PDF. */
  assets: {
    logoOfficial: "/brand/tsk/tsk-official-logo.png",
    logoOfficialHd: "/brand/tsk/tsk-official-logo-hd.png",
  },
} as const;

export const TSK_ISSUER_DEFAULTS = {
  company: "TSK Digital",
  addressLine1: "224 Rue de Charlieu",
  postalCode: "42300",
  city: "Roanne",
  email: "contact@tskdigital.fr",
  phone: "07 49 43 46 98",
  siret: "10620038900018",
  vatNumber: "",
  iban: "",
  bic: "",
  paymentTermsDays: 30,
  quoteValidityDays: 30,
  defaultVatRate: 20,
  defaultDepositPercent: 30,
} as const;
