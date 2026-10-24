# AGENTS.md — LuxeFlexIA (fleximage)

Carte rapide pour les agents Cursor. **Ne pas ré-explorer tout le repo** : lire ce fichier, puis seulement les chemins concernés par la tâche.

Produit : **LuxeFlexIA** — génération image (OneShot / Google) et vidéo (I2V, V2V, voix), funnel acquisition, abonnements Stripe. Prod : **Vercel** (`luxeflexia`).

---

## Architecture (vue d’ensemble)

```
Client (Vite + React)     →  /api/* (Vercel serverless)
       ↓                           ↓
  Supabase Auth/DB          api/_lib/* (logique métier)
       ↓                           ↓
  Stripe (billing)          R2 + providers (OneShot, Kling, etc.)
```

- **Prod** : build `npm run vercel-build` → `dist/public` + fonctions dans `api/`.
- **Dev local** (optionnel) : `npm run dev` → Express `server/index.ts` + Vite (Bun).
- **Données** : Supabase (Postgres, auth, `generations`, profils). Schéma : `shared/schema.ts`, migrations `supabase/`.
- **Images** : `api/_lib/handlers/generate-direct.js` → `generate-image-once.js` + **`prompt-guard.js`** (routing prompts moto/voiture/tenue/etc.).
- **Vidéo / voix** : `generate-video.js`, `voice-clone.js`, libs `kie-*`, `i2v-*`, `voice-catalog`.

---

## Dossiers clés

| Chemin | Rôle |
|--------|------|
| `client/src/pages/` | Pages app (Landing, Generate, Bibliothèque, Admin…) |
| `client/src/components/` | UI réutilisable (landing, larp, marketing, admin) |
| `client/public/` | Assets statiques (landing MP4, voix, `assets/vehicle-ref/`…) |
| `api/_lib/handlers/` | Entrées HTTP (generate, status, upload, funnel, admin) |
| `api/_lib/prompt-guard.js` | **Cœur prompts image** — toujours vérifier avant modif génération |
| `api/_lib/vehicle-moto-reference-catalog.js` | Refs factory moto (ex. YZ125) injectées à la génération |
| `shared/` | Types, billing, SEO, templates JSON, catalogues voix |
| `server/` | Serveur dev + lib TS miroir (ex. `prompt-guard.ts` partiel) |
| `script/` | Build Vercel, SEO statique, Stripe, purge |
| `docs/formation-collegue/` | **Playbook fondateur** (funnel, onboarding, ads) |
| `.cursor/rules/` | Règles workspace (playbook, graphify) |
| `.cursor/skills/` | Skills projet (token-shield, find-skills, frontend-design, **impeccable**…) |
| `.agents/skills/task-observer/` | **Task Observer** (source **uniquement** `rebelytics/one-skill-to-rule-them-all`, via `skills-lock.json`) |
| `graphify-out/` | Graphe code (si présent) — `graphify query "…"` avant gros grep |

---

## Commandes principales

| Commande | Usage |
|----------|--------|
| `npm install` | Install (Vercel / CI) |
| `npm run vercel-build` | Build prod (SEO + Vite) |
| `npm run dev` | Dev local (Bun + server) |
| `npm run check` | Typecheck TS |
| `npm test` | Tests Node + tsx (long — filtrer si possible) |
| `node --test api/_lib/prompt-guard-*.test.js` | Tests prompts image ciblés |
| `npm run db:push` | Drizzle → DB |
| `graphify query "…"` | Cartographie code (règle `.cursor/rules/graphify.mdc`) |
| `npx skills find <query>` | Découvrir skills (skill **find-skills**) |
| `npx impeccable detect client/src/…` | Contrôle design UI (anti-slop, a11y, typo) |
| `npx impeccable install -y --project --providers=cursor` | (Re)installer skill + binaire moteur |
| `npx skills add rebelytics/one-skill-to-rule-them-all --skill task-observer -y -a cursor` | (Re)installer **Task Observer** — **projet seulement** (sans `-g`) |
| `npx skills experimental_install` | Restaurer les skills verrouillés dans `skills-lock.json` |

Variables : voir `.env.example` (Supabase, Stripe, OneShot, R2, providers vidéo).

---

## Flux métier à connaître

1. **Génération image** : upload → `generate-direct` → prompt enrichi → OneShot → `status` / historique.
2. **Multi-images** : ordre refs important (user, outfit, scène…) — voir `generate-direct.js` + `referenceImageCount` dans `prompt-guard`.
3. **Funnel** : ordre **Duolingo** — valeur → action → résultat → compte → paywall (playbook module 02–03).
4. **Billing** : crédits / plans Stripe — `shared/billing.ts`, `api/stripe/`.

---

## Règles agent (obligatoires)

### Discipline tokens (**token-shield**)
- Lire **uniquement** ce qui sert la tâche ; pas de lockfiles, `node_modules`, builds, logs complets.
- Respecter **`.cursorignore`** à la racine.
- Edits **minimaux** ; résumer en quelques lignes, ne pas coller des fichiers entiers.

### Découverte (**find-skills**)
- Sur un **nouveau besoin** : `npx skills find …` / skills.sh **avant** de proposer architecture ou grosse implémentation.

### UI / design (**Impeccable**)
- Skill installé : `.cursor/skills/impeccable/` (+ global `~/.cursor/skills/impeccable`).
- **Après chaque changement d’interface** : lancer `npx impeccable detect` sur les fichiers touchés (`client/src/…`) ou l’URL locale si le dev server tourne ; corriger les findings **primary** avant de dire « c’est fini ».
- Exit `2` = problèmes détectés ; exit `0` = pas de finding primary (scan partiel sur seul `.tsx` — préférer URL/build HTML pour règles complètes si besoin).

### Code & PR (Cloud Agent)
- Branches : `cursor/<description>-bcf8`.
- PR via outil **ManagePullRequest** (pas `gh pr create` pour ouvrir).
- Commits clairs ; push après tests pertinents.

### Produit / funnel
- Avant landing, onboarding, paywall : lire `docs/formation-collegue/PLAYBOOK_REFERENCE.md`.
- Communiquer avec le fondateur en **français**.
- Prioriser la **plus grosse fuite du funnel**, pas la feature la plus visible.

### Exploration code
- **graphify en premier** si `graphify-out/graph.json` existe ; sinon grep ciblé.
- Après modif de fichiers code : `graphify update .` (AST, sans coût API).

### Prompts image (moto, voiture, tenue)
- Toute logique centralisée dans **`api/_lib/prompt-guard.js`** (+ tests `prompt-guard-*.test.js`).
- Sync partielle possible dans `server/lib/prompt-guard.ts` — vérifier les deux si le handler server est utilisé.

---

## Tests utiles (ciblés)

```bash
node --test api/_lib/prompt-guard-moto-ref.test.js
node --test api/_lib/prompt-guard-outfit-ref.test.js
node --test api/_lib/prompt-guard-vehicle-ref.test.js
node --test api/_lib/vehicle-moto-reference-catalog.test.js
```

---

## Liens internes

- Playbook synthèse : `docs/formation-collegue/PLAYBOOK_REFERENCE.md`
- Domaines graphify : `graphify/docs/DOMAINS.md`
- Templates intégrés : `shared/builtin-image-templates.json`

---

## Hors scope par défaut

- Ne pas lire `package-lock.json` / binaires / `client/public/wasm/` sauf tâche WASM explicite.
- Ne pas refactorer `prompt-guard.js` en dehors du besoin moto/voiture/tenue demandé.
- `new-sas-plant/` : sandbox séparé — ignorer sauf consigne explicite.

---

## Task Observer (dernier skill projet — leçons isolées par repo)

- **Source autorisée** : `rebelytics/one-skill-to-rule-them-all` seulement (pas skills.sh alternatif, pas fork, pas copie manuelle d’un autre dépôt).
- **Scope** : installation **projet** (`./.agents/skills/task-observer`, **jamais** `-g` / global) pour que `skill-observations/` reste dans ce repo, séparé des autres projets.
- **Bundle** : conserver `SKILL.md`, `references/` et `scripts/` ensemble (install via la commande ci-dessus).

### Bloc d’activation (AGENTS.md — template v3.8.0)

```text
(task-observer activation block — template of v3.8.0)
Before the first tool call of any session — and before writing or
proposing a plan, not merely before executing one — invoke the
task-observer skill AND execute its Session Start Protocol (storage
check, frontmatter scan, review trigger). Loading the skill and running
the protocol are separate steps; a session that loads the file and stops
has activated nothing. Any turn that will involve a tool call counts; do
not classify the session as "too simple" from its opening message.
A step you did not run is reported before the answer, in one line — never
after it, where it reads as a suggestion. If the skill does not resolve on
this turn, say which probe told you so (the skill listing, or the skill
directory on disk), re-check the listing on every later turn that makes a
tool call, and run the protocol the first time it resolves — a "not
installed" verdict holds for one turn.

Select skills on the DECISION the request is about, not on the artefact it
arrived as. Name what the user is deciding, then match the installed skill
descriptions against that — a request handed over as a file to review
still needs the skill whose description names its subject.

After completing each task, list the observation records written this
session in the same turn and report a one-line summary from that listing
(ids and titles, or "none logged and why") — never from memory of
writing them.

The task-observer workspace for this project is:
  /workspace
Every path the skill uses derives from that root:
  /workspace/skill-observations/observation-log/
  /workspace/skill-observations/cross-cutting-principles.md
  /workspace/skill-updates/
  /workspace/skill-updates/PENDING.md
Never resolve these from cwd inside an ephemeral checkout (worktree, clone temporaire).

The user's repositories live under:
  /workspace

A subagent dispatched by a session that already runs this protocol does
not run it again and does not write to the log; the controller observes.
```

Référence complète : `.agents/skills/task-observer/references/environments.md`.
