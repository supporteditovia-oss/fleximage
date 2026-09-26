# Mémoire d'Architecture Persistante — Luxeflexia

## Règles Fondamentales de Stabilité

1. **Règle Zero-Loss / Découplage V2** :
   - Les nouvelles fonctionnalités expérimentales (voix, vidéo, onglets multi-studios) sont strictement isolées pour les administrateurs via `useAdminPreviewFeatures()`.
   - Les visiteurs et clients standards accèdent à un flux simplifié sans bruit ni régression.

2. **Dédoublonnage et Idempotence des Générations** :
   - Tout appel de génération image/vidéo requiert un `generation_request_id` (UUID v4) côté client.
   - Les requêtes simultanées ou répétées sont absorbées sans double facturation ni génération fantôme.

3. **Garde de Contexte (Token Saver)** :
   - Avant de scanner ou lire récursivement des répertoires entiers, consulter `graphify/indexes/master-index.json` ou exécuter `node graphify/lookup.mjs <terme>`.
   - Cibler directement le fichier source identifié pour minimiser l'empreinte mémoire et la consommation de jetons.
