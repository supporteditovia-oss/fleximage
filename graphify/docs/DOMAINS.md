# Domaines Knowledge Graph (cartographie manuelle)

| Domaine | Racines principales |
|---------|---------------------|
| Frontend | `client/src/pages/`, `client/src/App.tsx`, landing, auth, create/generate |
| Dashboard | `client/src/pages/Admin*.tsx`, `api/admin-router.js` |
| Supabase | `supabase/`, `shared/schema.ts`, `client/src/lib/supabase.ts` |
| AI | `api/_lib/handlers/generate-direct.js`, `api/_lib/oneshot.js`, `server/lib/` |
| Billing | `api/stripe/`, `shared/billing.ts`, paywall modals |
| Components | `client/src/components/` |
| Routes | `shared/routes.ts`, `client/src/App.tsx`, `api/*-router.js` |
| Shared | `shared/` |

Graphe AST officiel : `graphify-out/graph.json` (4283+ nœuds). Requêtes : `graphify query`, `graphify explain`, `graphify path`.
