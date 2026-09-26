# Architecture Globale — Luxeflexia

Ce document constitue la référence d'architecture pour le Knowledge Graph de Luxeflexia.

## Domaines Fonctionnels

1. **Frontend (`client/src`)** :
   - Interface SPA propulsée par React, Vite et Wouter.
   - Routage sans rechargement, internationalisation complète FR/EN/ES (`client/src/i18n`).
   - Hooks réactifs TanStack Query pour la gestion du cache et de l'état serveur.

2. **Dashboard (`client/src/pages/Admin*.tsx`)** :
   - Centre de contrôle administrateur pour le suivi en direct des générations et des logs.
   - Gestion des modèles (templates), des tenues (outfits) et des catégories.
   - Métriques du funnel de conversion et audits.

3. **Supabase & Données (`supabase/`, `shared/schema.ts`)** :
   - Base PostgreSQL hébergée sur Supabase avec Row Level Security (RLS).
   - Tables maîtresses : `profiles`, `generations`, `prompt_templates`, `template_categories`, `user_subscriptions`.
   - Schéma TypeScript universel généré via Drizzle ORM et validé par Zod.

4. **Intelligence Artificielle (`api/_lib`)** :
   - Moteurs de génération OneShot API (Nano-Banana-2) avec bascule automatique Kie en secours.
   - Moteurs vidéo Kling (Image-to-Video & Video-to-Video).
   - Clonage et synthèse vocale Fish Audio.

5. **Billing & Abonnements (`api/stripe`, `shared/billing.ts`)** :
   - Plans : Discovery, Essential, Ultimate.
   - Packs de crédits ponctuels : 100, 300, 1000 crédits.
   - Synchronisation bidirectionnelle par webhook Stripe et portail client en libre-service.

## Chaîne de Traitement (Flux Traversant)

```
[Composant UI]
      │
      ▼
   [Page]
      │
      ▼
   [Route]
      │
      ▼
  [API Vercel]
      │
      ▼
 [Table Supabase]
      │
      ▼
  [Facturation / Stripe]
```
