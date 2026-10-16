import {
  I2V_SFX_IDS,
  I2V_SFX_MOMENTS,
  normalizeI2VSfx,
  normalizeI2VSfxMoment,
} from "./i2v-sfx.cjs";

export type I2VSfx = "none" | (typeof I2V_SFX_IDS)[number];
export type I2VSfxMoment = (typeof I2V_SFX_MOMENTS)[number];

export const I2V_SFX_OPTIONS: { value: I2VSfx; label: string }[] = [
  { value: "none", label: "Aucun" },
  { value: "explosion", label: "Explosion" },
  { value: "fuite_eau", label: "Fuite d'eau" },
  { value: "coup_sourd", label: "Coup sourd" },
  { value: "verre_brise", label: "Verre brisé" },
  { value: "sirene_police", label: "Sirène police" },
  { value: "foule_applaudit", label: "Foule applaudit" },
  { value: "tonnerre", label: "Tonnerre" },
  { value: "klaxon", label: "Klaxon" },
  { value: "porte_claque", label: "Porte claque" },
  { value: "alarme", label: "Alarme" },
];

export const I2V_SFX_MOMENT_OPTIONS: { value: I2VSfxMoment; label: string }[] =
  [
    { value: "start", label: "Début" },
    { value: "middle", label: "Milieu" },
    { value: "end", label: "Fin" },
  ];

export {
  I2V_SFX_IDS,
  I2V_SFX_MOMENTS,
  normalizeI2VSfx,
  normalizeI2VSfxMoment,
};
