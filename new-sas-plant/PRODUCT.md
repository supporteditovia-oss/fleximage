# Plant revival SaaS — product brief

Working name: **PlantRevive** (change anytime).  
Folder: `new-sas-plant/` — separate from LuxeFlexIA.

## One-liner

Take a photo of your plant → get a diagnosis → get a step-by-step plan to bring it back to life.

## Core loop (MVP)

1. **Upload** 1 photo (phone camera preferred).
2. **Analyze** with a vision model (species + health + issues).
3. **Plan** in plain language (FR first): immediate actions, weekly care, shopping list.
4. **Save** result if logged in (optional in MVP).

## What the AI should return

- Species / common name (best guess + confidence)
- Overall health: good / stressed / critical
- Detected issues (e.g. overwatering, dry soil, low light, yellow leaves, pests)
- Action plan:
  - Do now (today)
  - This week
  - Avoid doing
- Optional: product suggestions (potting mix, fertilizer, grow light) — affiliate later

## What it is NOT

- Not LuxeFlexIA (no flex photos, no LARPs, no OneShot image edit pipeline)
- Not medical advice for humans/pets
- Not a marketplace in v1

## Stack suggestion (standalone)

- Frontend: Vite + React
- Backend: Vercel serverless or small Express
- Auth + DB: **new** Supabase project
- Vision: OpenAI / Gemini vision (or similar) — analyze photo, return structured JSON
- Payments later: Stripe (separate products from LuxeFlexIA)

## Domains & deploy

- Buy a dedicated domain
- New Vercel project → Root Directory = `new-sas-plant`
- Separate env vars — never reuse LuxeFlexIA production keys in this project

## Monetization ideas (later)

- Free: 2 analyses / week
- Pro: unlimited + history + reminders
- One-shot packs of credits

## Open decisions (for you)

1. Brand name + domain  
2. Language: FR only for launch?  
3. Build app in this folder now, or move to a new repo first?
