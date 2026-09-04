# new-sas-plant

**Plant revival SaaS** — photo → diagnose → tell the user how to bring the plant back to life.

This folder is **intentionally isolated** from LuxeFlexIA (`luxeflexia.com`).  
Do **not** import anything from `client/`, `server/`, or `api/` of LuxeFlexIA into this product (and the reverse).

---

## How to keep the two sites separate

| | LuxeFlexIA | Plant SaaS |
|---|---|---|
| Brand / domain | luxeflexia.com | new domain (ex: plantrevive.app) |
| Code | this repo root | **this folder only** (or later its own repo) |
| Auth / DB / Stripe | Supabase project `dktplzbpwevyhroituys` | **new** Supabase project + Stripe account/products |
| Deploy | current Vercel project | **new** Vercel project pointing at `new-sas-plant/` |

### Recommended path (simplest)

1. **Build here** inside `new-sas-plant/` so nothing mixes with LuxeFlexIA.
2. When ready for prod: either  
   - create a **new GitHub repo** and move this folder, **or**  
   - keep a monorepo but deploy Vercel with **Root Directory = `new-sas-plant`**.
3. Never add plant routes into `client/src/pages` of LuxeFlexIA.

---

## Product (v1)

1. User uploads a plant photo.
2. AI analyzes: species guess, health state, problems (overwater, underwater, light, pests, soil…).
3. App returns a clear action plan: what to do now / this week / what to buy.
4. Optional later: history, reminders, subscription.

See `PRODUCT.md` for the full brief.

---

## Next step when you say “build it”

Scaffold a standalone Vite/React (+ API) app **only under this folder**, with its own env vars (`PLANT_*`), never sharing LuxeFlexIA keys in the same Vercel project.

Until then, this directory is the product home — safe to leave empty of LuxeFlexIA code.
