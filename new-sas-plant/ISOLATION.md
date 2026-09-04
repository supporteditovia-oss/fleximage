# Isolation rules — do not mix with LuxeFlexIA

## Forbidden

- Importing `@/…`, `client/src/…`, `server/…`, `api/…` from the LuxeFlexIA app into this product
- Reusing LuxeFlexIA Stripe products / webhook / credit ledger for plants
- Adding `/plant` routes inside the existing LuxeFlexIA Vite app
- Deploying this SaaS on the same Vercel project as luxeflexia.com without a separate Root Directory + domain

## Allowed

- Living as a sibling folder in this git repo during ideation / early build
- Copying *ideas* (auth patterns, paywall UX) rewritten from scratch
- Moving this entire folder to a new repository when the product is serious

## Env prefix (when coding starts)

Use `PLANT_` or a dedicated `.env` inside `new-sas-plant/` only, e.g.:

- `PLANT_SUPABASE_URL`
- `PLANT_SUPABASE_ANON_KEY`
- `PLANT_VISION_API_KEY`
- `PLANT_STRIPE_SECRET_KEY`
