# Seedance V2V — Étape 1 (vérif Kie, sans appel payant)

> Dernière vérif doc OpenAPI : 2026-10-04. **Prix $/s** : la page https://kie.ai/pricing est rendue côté client (SSG vide sans login) — **aucun tarif Seedance extractible automatiquement** sans session dashboard ou clé API + log de débit crédits.

## Endpoint (Reference-to-Video / édition objet)

| Modèle | `POST` | `model` |
|--------|--------|---------|
| Seedance **2.5** | `https://api.kie.ai/api/v1/jobs/createTask` | `bytedance/seedance-2-5` |
| Seedance **2.0** | idem | `bytedance/seedance-2` |

Mode **Scène & luxe** (clip source) : `input.reference_video_urls[]` + `prompt` (multimodal ref — **pas** `first_frame_url` en parallèle).

Poll : `GET /api/v1/jobs/recordInfo?taskId=…` (identique Omni/Aleph).

## Résolutions **API** (enum `input.resolution`)

| Modèle | Sortie native (enum doc) | Entrée vidéo ref (exigence doc) |
|--------|---------------------------|----------------------------------|
| **2.5** | `480p`, `720p`, `1080p` — **pas de `4k`** | ref MP4/MOV **480p ou 720p** ; durée ref **2–30 s** (total refs ≤ 30 s) |
| **2.0** | `480p`, `720p`, `1080p`, `4k` | ref **480p ou 720p** ; durée par ref **2–15 s** (max 3 refs, total ≤ 15 s) |

La doc **ne mentionne pas** « upscale » pour 1080p/4k : ce sont des valeurs `resolution` de sortie. **Qualité réelle** (natif vs sharpen) = à valider visuellement (hors scope étape 1 sans job payant).

## Durée produit LuxeFlexIA (3–8 s)

| Modèle | `input.duration` | Compatible 8 s ? |
|--------|------------------|------------------|
| **2.5** | 4–30 ou **`-1`** (= aligner sur longueur vidéo d’édition) | **Oui** (ref ≤ 30 s) |
| **2.0** | 4–15 ou `-1` | **Oui** (ref ≤ 15 s, sortie ≤ 15 s) |

## Prix $/s (Kie) — **à confirmer sur ton compte**

Source **officielle attendue** : Dashboard Kie → **Models Pricing** (table « Credits / Gen », notice `seedanceVideoBilling` : avec entrée vidéo, coût ∝ **Input + Output** duration).

Tentative fetch `kie.ai/pricing` : **pas de lignes Seedance** dans le JSON SSG.

**Ne pas figer la grille crédits LuxeFlexIA** tant que tu n’as pas copié depuis le dashboard (ou un job test + delta crédits ÷ durée) pour **chaque** SKU :

- `bytedance/seedance-2-5` × 480p / 720p / 1080p **with video input**
- `bytedance/seedance-2` × 480p / 720p / 1080p / 4k **with video input**

Référence tierce (APITariff, 2026-10-03, **non signée Kie**) — **with video input** :

- 2.0 @ 720p ≈ **$0,125/s**
- 2.0 @ 1080p ≈ **$0,310/s**
- 2.0 @ 4K ≈ **$0,640/s** (fiche APITariff)

→ Écart possible avec 0,20 $/s « sans ref » ; **toujours chiffrer en mode V2V (with video input)**.

## Choix implémentation code

- **720p / 1080p** → `bytedance/seedance-2-5`, `duration: -1` (match clip source).
- **4k** UI → `bytedance/seedance-2` + `resolution: 4k` (2.5 n’a pas 4k).
- Omni `kling-3.0-omni/transformation` **remplacé** par Seedance quand `V2V_SEEDANCE_TRANSFORM_ENABLED=1`.
