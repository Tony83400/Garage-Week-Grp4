# AlchiRoute

> App mobile/web de gestion de tournées de collecte de biodéchets · **Les Alchimistes Côte d'Azur** · Garage Week Grp4

---

## Lancer le projet

```bash
# Backend (depuis /serveur)
python main.py

# Frontend
cd front-expo
npx expo start --clear
# Web → W   |   Mobile → scanner le QR avec Expo Go
```

## Comptes de test

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@logistic.fr | 1234 | Admin |
| jean@logistic.fr | 1234 | Chauffeur #1 |
| alice@logistic.fr | 1234 | Chauffeur #2 |

---

## Stack

| Couche | Technologie |
|---|---|
| Mobile/Web | Expo ~54 + Expo Router ~6 + React Native 0.81.5 |
| Style | StyleSheet (pas NativeWind — conflits) |
| Langage | TypeScript 5 strict |
| Backend | Flask + flask-cors, port 5000, SQLite |
| Optimisation | OR-Tools (Python) |

---

## Structure du repo

```
/front          → pages HTML/CSS (source de vérité design)
/front-expo     → projet Expo (zone de travail front)
/serveur        → backend Flask Python
/backend        → NE PAS TOUCHER
```

---

## Architecture front-expo

```
app/
  index.tsx            Login — TruckAnimation SVG animé
  dashboard.tsx        Dashboard admin — BriefingCard + StatCards
  planning.tsx         Planning — mode préparation / supervision
  driver.tsx           Vue conducteur — hero stop + progress kg
  imprevus.tsx         Gestion imprévus — Reporter demain + ConfirmModal

components/
  TruckAnimation.tsx   Camion SVG animé (phases arriving/idle/starting/departing/error)
  VehicleCard.tsx      Carte tournée — avatar initiales, barre 3 états, timeline stops
  GenerationModal.tsx  Résumé post-génération OR-Tools (véhicules, stops, km)
  EditPlanningModal.tsx Édition planning par chauffeur (réordonner, transférer arrêts)
  MapTournees.tsx      Carte Leaflet (WebView mobile / iframe web)
  SiteModal.tsx        Modal ajout site client
  StatCard.tsx         KPI animée (count-up + fade/slide)
  MobileDrawer.tsx     Navigation hamburger overlay
  ...

services/
  planning.ts          GET planning, POST generer/optimiser, GET preview
  imprevus.ts          GET imprevus, POST replanifier
  dashboard.ts         GET stats + activite
  chauffeur.ts         GET tournee + POST statut tache
  clients.ts           GET/POST clients
```

## Routes Flask

| Route | Usage |
|---|---|
| POST `/login` | Authentification |
| GET `/api/dashboard/stats?date=` | Stats tableau de bord |
| GET `/api/dashboard/activite?date=` | Activité récente |
| GET `/api/admin/planning?date=` | Tournées du jour |
| POST `/api/planning/generer` | Créer les tâches de collecte |
| POST `/api/planning/optimiser` | Optimisation OR-Tools |
| GET `/api/planning/preview?date=` | Nombre clients dispo + chauffeurs planifiés |
| GET `/api/chauffeur/<id>/tournee?date=` | Tournée d'un chauffeur |
| POST `/api/chauffeur/tache/<id>/statut` | Mettre à jour le statut d'un arrêt |
| GET `/api/imprevus?date=` | Liste des erreurs/imprévus |
| POST `/api/imprevus/<id>/replanifier` | Reporter une collecte |
| GET `/clients` | Liste des sites clients |
| POST `/clients` | Ajouter un site client |

---

## Réseau / IP mobile

- `front-expo/.env.local` (gitignored) : `EXPO_PUBLIC_API_URL=http://TON_IP:5000`
- L'IP change selon le réseau (WiFi ≠ hotspot) — mettre à jour à chaque changement
- Hors réseau commun : `ngrok http 5000`
- Plage hotspot iPhone : `172.20.10.x`

---

## Données de test

- `reset_db=True` dans `main.py` → base remise à zéro à chaque redémarrage
- Données configurées pour **vendredi** (jour_semaine = 5)
- `taches_collecte` vide au départ — générées via le bouton "Générer les tournées" dans Planning
- Bug data connu : `donnee.sql` lignes 171-172 — `heure_debut_service = '03:00:00'` à corriger en `'06:30:00'`

---

## Bugs back connus

1. `get_tournees_detaillees` ~ligne 314 : manque `AND t.tournee_id = ?` → tous les chauffeurs voient tous les arrêts
2. `sauvegarder_resultat_optimisation` : `vehicule_id` direct au lieu de `vehicule_id // MAX_TOURS` → mapping OR-Tools incorrect

---

## Règles de développement

1. **StyleSheet uniquement** — jamais NativeWind
2. **Animations** : `React Native Animated` API (pas Reanimated sauf TruckAnimation existant)
3. **Dates** : toujours dynamiques (`new Date().toISOString().split('T')[0]`)
4. **git add** : `front-expo/` uniquement
5. Ne pas toucher au back sauf chirurgicalement avec accord
6. Consulter `/front/*.html` comme référence design
