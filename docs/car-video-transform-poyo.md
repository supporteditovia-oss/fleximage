# Transforme ta voiture par IA (PoYo wan2.7-edit-video)

## Variable d'environnement

- `POYO_API_KEY` — déjà configurée dans `.env` à la racine (ne jamais la committer ni l'exposer côté client).
- Optionnel : `POYO_WEBHOOK_SECRET` pour vérifier `POST /api/webhooks/poyo`.
- Optionnel : `PUBLIC_SITE_URL` (ex. `https://luxeflexia.com`) pour les URLs d'images de référence publiques.
- Optionnel : `CAR_VIDEO_MAX_UPLOAD_BYTES` (défaut 200 Mo), `CAR_VIDEO_RETENTION_DAYS` (défaut 14).
- Dev : `CAR_VIDEO_DEV_OPEN=1` ou `CAR_VIDEO_DEV_USER_IDS=uuid1,uuid2` pour tester hors admin.

## Lancer en local

```bash
npm install
npm run dev
```

Appliquer la migration Supabase :

```bash
# SQL Editor ou pipeline habituel
supabase/migrations/20260927143000_car_video_generations.sql
```

Configurer R2 (`R2_*`) comme le reste du studio vidéo — les uploads passent par `inputs/{userId}/`.

## Tester une génération 720p (2–8 s)

1. Se connecter à l'app.
2. Ouvrir `/transforme-ta-voiture`.
3. Choisir un clip **MP4/MOV/WebM** entre **2 et 8 secondes** (≤ 200 Mo).
4. Valider l'upload, choisir **Extérieur** + **SUV luxe noir**, confirmer.
5. Le backend appelle PoYo (`wan2.7-edit-video`, **720p** fixe) ; le frontend interroge `GET /api/video-generations/:id` toutes les 5 s.

En production, un **abonnement actif** est requis ; en dev, compte **admin** ou whitelist sauf `CAR_VIDEO_DEV_OPEN=1`.

## Stockage

- Upload : URL présignée R2 via `POST /api/video-generations/upload`.
- Sortie : copie R2 via `downloadAndStoreVideo` quand PoYo renvoie l'URL finale.

## Suivi asynchrone

1. `POST /api/video-generations` → crée la ligne `car_video_generations` + tâche PoYo.
2. Poll serveur sur `GET /api/video-generations/:id` (throttle ~4 s côté API).
3. Webhook optionnel : `POST /api/webhooks/poyo` (signature HMAC si `POYO_WEBHOOK_SECRET` est défini).

## Images de référence véhicule

Fichiers attendus dans `client/public/references/` :

- `luxury-black-suv.jpg`
- `premium-black-sedan.jpg`
- `red-sports-car.jpg`
- `premium-white-suv.jpg`

Si un fichier manque, la génération continue **sans** `reference_image_url`.

## Routes API

| Méthode | Route | Rôle |
|--------|--------|------|
| POST | `/api/video-generations/upload` | Présignation upload R2 |
| POST | `/api/video-generations` | Création génération PoYo |
| GET | `/api/video-generations/:id` | Statut + URL sortie si terminé |
| POST | `/api/webhooks/poyo` | Callback PoYo (idempotent) |
