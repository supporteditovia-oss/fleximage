# Playbook Fondateur — Référence permanente LuxeFlexIA

> **Source de vérité** : pack formation collègue (modules 00–07, 99, STRATÉGIE 🇺🇸, SAAS).  
> L'utilisateur renvoie ce dossier régulièrement — **toujours croiser les décisions produit/funnel avec ce document**.

**Produit** : LuxeFlexIA — https://www.luxeflexia.com  
**Repo** : `supporteditovia-oss/fleximage`  
**Texte intégral extrait** : `_EXTRACT_COMPLET.txt` (~350 Ko, searchable)

---

## Fil conducteur (module 00)

```
Trouver → Construire vite → Faire comprendre → Faire payer → Faire revenir → Scaler
```

**Règle d'or** : on ne décide pas avec l'ego. On lance, on mesure, on garde ce qui marche.

**Philosophie MVP** : ship fast, fix later = **une fonction principale bien faite**, lancée vite, améliorée avec de vraies données.

---

## Modules — contenu et usage

| Module | Fichier source | Quand l'utiliser |
|--------|----------------|------------------|
| **00** | Formation complète (document maître) | Vue d'ensemble, méthode générale, onboarding, funnel, rétention |
| **01** | Idée, validation et MVP | Avant un nouveau projet ; validation demande réelle |
| **02** | Onboarding et Duolingo | Parcours d'activation, triggers psychologiques, dissection Duolingo |
| **03** | Funnel, paywall et psychologie | Métriques funnel, pricing, **16 concepts gratuit→payant** |
| **04** | Produit et rétention | Action principale, streaks, métriques D1/D7/D30 |
| **05** | Viralité, UGC et acquisition | Templates viralité, micro-influenceurs, CPM, ads scale |
| **06** | Distribution USA–France | Téléphone USA, TikTok/IG, Postiz, warm-up 3j |
| **07** | Checklists et suivi | **Porte de contrôle avant scale** |
| **99** | Archives (21 sous-modules) | Approfondissements historiques |
| **STRATÉGIE** | Téléphone USA (GrizzlySMS, checklist rapide) | Ops acquisition US |
| **SAAS** | Chaîne : douleur → ICP → positionnement → promesse → logique produit | Positionnement SaaS |

---

## Ordre Duolingo (module 02) — NON NÉGOCIABLE

```
Bénéfice → Confiance → Objectif → Première action → Premier résultat → Compte pour sauvegarder → Paywall
```

**Erreur classique** : demander le compte **avant** la première valeur.

Les **7 triggers** (réciprocité, engagement, Zeigarnik, aversion perte, social proof, intentionnalité, pledge) — choisir **uniquement** ceux qui servent le parcours, pas tous.

---

## Funnel complet (module 03)

```
Impression → Clic → Landing/Store → Install → Onboarding → 1re valeur → Compte → Paywall → Trial/Paiement → Rétention
```

**Question hebdo** (module 07) : *À quelle étape perd-on le plus de valeur, et quel test simple cette semaine ?*

**Règle scale** : LTV nette > coût complet d'acquisition (commissions, remboursements, créas, influenceurs).

---

## 16 concepts gratuit → payant (module 03)

Payment decoupling · Mental accounting · Commitment & consistency · Endowment effect · IKEA effect · Decoy effect · Price anchoring · Supermarket layout · Scarcity (vraie seulement) · Variable ratio · Reward prediction error · Near-miss · Gambler's fallacy (ne pas exploiter) · Loss aversion · Zeigarnik · Reciprocity

→ **Ne pas tous les mettre partout.** Créer d'abord une vraie valeur, puis choisir les mécanismes qui clarifient.

---

## LuxeFlexIA — état vs playbook (dernière revue)

### ✅ Déjà aligné

| Recommandation | Implémentation |
|----------------|----------------|
| Quiz / engagement (objectif + vibe) | `FunnelOnboardingQuiz.tsx`, presets catalogue |
| Progression visible | Barre 1/2 → 3/3 |
| Première valeur avant paywall | Fake loader + preview floutée `/image-prete` |
| Paywall récupération + urgence | « Débloque ta photo », compteur 15 min, ancrage prix |
| Endowment / IKEA (résultat perso) | Photo utilisateur dans le funnel |
| Export UGC TikTok 9:16 | `before-after-export.ts`, `BeforeAfterShareButton` |
| Quiz mémorisé 1× | `localStorage` + sync `profiles.onboarding_quiz` |
| Commitment (objectif choisi) | Questions quiz → presets |
| Post-paiement fluide | Stripe → `/create?checkout=success` → restore draft → auto-gen HD |
| Bouton ✨ TikTok | `/resultat` + `UnlockedLarpView` |
| Preuve sociale **vraie** (DB) | `/api/public/trust-stats` + `SocialProofLine` (paywall + landing) |
| Emails relance preview expirée | Cron `/api/cron/preview-expiry-reminders` + Resend (`RESEND_API_KEY`) |
| Fluidité editorial + loader | PR #121 cherry-picked (toggle editorial + loader blur) |

### ⚠️ Partiel

| Recommandation | Écart |
|----------------|-------|
| Compte **après** valeur | Register **avant** quiz aujourd'hui |

### ❌ Pas encore fait

| Recommandation | Priorité suggérée |
|----------------|-------------------|
| Pledge / streak / notifs | Non pertinent pour ce produit |
| Distribution USA (module 06) | Ops marketing, pas code |
| Register avant valeur → inverser | Haute (ordre Duolingo complet) |

---

## Parcours funnel actuel LuxeFlexIA

```
Landing → Register → Quiz → Fake loader → /image-prete → Paywall → Paiement → /create?checkout=success → Auto-gen HD + ✨
```

**Parcours cible playbook (compte après valeur)** :

```
Landing → Quiz/action sans compte → 1re valeur (preview) → Compte → Paywall → Paiement → Auto-gen HD + export ✨
```

---

## Checklist avant scale (module 07) — LuxeFlexIA

- [x] Promesse claire (transformation lifestyle/luxe)
- [x] MVP monétisé (Stripe, crédits)
- [x] Onboarding → première valeur (preview floutée)
- [ ] Compte **après** valeur (inverser register/quiz) — seul gap funnel majeur
- [x] Paywall continuité de valeur
- [x] Preuve sociale vérifiable (compteur DB, pas de chiffre inventé)
- [ ] Funnel instrumenté de bout en bout (pub → renouvellement)
- [x] Résultat partageable (export avant/après codé)
- [ ] Plusieurs cohortes LTV > CAC
- [ ] Scale progressif budget ads

---

## Fichiers code clés (LuxeFlexIA)

| Domaine | Fichiers |
|---------|----------|
| Funnel | `client/src/components/funnel/`, `Generate.tsx`, `ImagePrete.tsx`, `LuxePaywallModal.tsx` |
| Export TikTok | `before-after-export.ts`, `BeforeAfterShareButton.tsx` |
| Loader | `GenerationLoader.tsx`, `generation-loader-theme.ts` |
| Editorial landing | `LandingEditorialGrid.tsx` |
| Stripe success | `server/stripe-routes.ts` → `/create?checkout=success` (funnel) |
| Funnel checkout | `client/src/lib/funnel-checkout.ts` |

---

## Comment utiliser ce doc (agents & humains)

1. **Nouvelle feature funnel/onboarding** → relire module 02 + 03, vérifier ordre Duolingo.
2. **Avant d'augmenter le budget ads** → module 07 checklist complète.
3. **Acquisition US** → module 06 + STRATÉGIE 🇺🇸.
4. **Après chaque test** → noter résultat ici ou dans le playbook utilisateur.

*Dernière mise à jour playbook : 2026-09-14 (post-paiement, emails, quiz DB, fluidité)*

**Env emails preview** : `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET` (Vercel cron toutes les 10 min).
