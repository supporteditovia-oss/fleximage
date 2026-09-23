# Charte graphique — TSK Digital

Identité officielle de l’agence **TSK Digital** (entité indépendante de LuxeFlexIA).

## Positionnement

Agence premium : sites web haut de gamme, développement SaaS, intelligence artificielle, automatisations, branding digital.

## Logo

| Fichier | Usage |
|--------|--------|
| `client/public/brand/tsk/tsk-horizontal.svg` | Devis, contrats, factures, site, signatures e-mail |
| `client/public/brand/tsk/tsk-mark.svg` | Favicon, réseaux sociaux, avatar |
| `client/public/brand/tsk/tsk-horizontal-mono.svg` | Impression N&B, tampons |
| `client/public/brand/tsk/tsk-horizontal-on-dark.svg` | Fonds sombres |
| PNG associés | Export raster transparent (1024 / 2000 px) |

**Règles**

- Zone de respiration : hauteur du cadre du monogramme autour du symbole.
- Ne pas déformer, recolorer hors palette, ni ajouter d’effets (ombre, dégradé).
- Sur document PDF : uniquement la marque **TSK Digital** (pas LuxeFlexIA).

Régénération vectorielle : `python3 script/build-tsk-logo.py` puis export PNG (CairoSVG).

## Couleurs

| Nom | Hex | Usage |
|-----|-----|--------|
| Noir | `#0B0B0C` | Texte principal, cadre logo |
| Blanc | `#FFFFFF` | Fonds clairs, texte sur fond noir |
| Titane | `#A7A7A7` | Cadre intérieur, séparateurs, texte secondaire |

## Typographie

- **Inter** (titres et corps)
- **SF Pro Display** (fallback système Apple)

Style : luxe, sobre, très professionnel (références : Apple, Stripe, Linear).

## Documents B2B

Module **Administration → Documents** (`/admin/documents`) : devis, contrat de prestation, facture, facture d’acompte, validation de fin de projet — PDF brandés TSK Digital.
