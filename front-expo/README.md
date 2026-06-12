# ArchAppli — Front Expo

App mobile/web de gestion de tournées de collecte de biodéchets.  
**Les Alchimistes Côte d'Azur — Garage Week Grp4**

## Lancer le projet

```bash
# Back (dans /serveur)
python main.py

# Front
npx expo start
# Web : W  |  Mobile : scanner le QR avec Expo Go
```

Comptes de test : `admin@archappli.fr` (admin) · `driver@archappli.fr` (chauffeur)  
Mot de passe : n'importe lequel  
Données disponibles pour la date : `2026-06-15`

---

## IP mobile

Si le mobile n'est pas sur le même réseau que le PC, créer `.env.local` à la racine de `front-expo/` :

```
EXPO_PUBLIC_API_URL=http://TON_IP:5000
```

Sans ce fichier, l'IP est détectée automatiquement via Metro en Expo Go.

---

## Stack

- **Expo ~54** + **Expo Router ~6** — routing file-based
- **React Native 0.81.5** + **StyleSheet** — pas de NativeWind, pas de Tailwind
- **TypeScript 5**
- **Flask** (port 5000) + flask-cors — backend Python

---

## Architecture

```
front-expo/
├── app/                      # Écrans (1 fichier = 1 route)
│   ├── _layout.tsx           # Stack navigator + SafeAreaProvider
│   ├── index.tsx             # / → Login
│   ├── dashboard.tsx         # /dashboard → Dashboard admin
│   ├── planning.tsx          # /planning → Planning & tournées admin
│   ├── driver.tsx            # /driver → Vue conducteur (file d'arrêts)
│   └── imprevus.tsx          # /imprevus → Gestion des imprévus
│
├── components/               # Briques UI réutilisables
│   ├── AnimatedBlob.tsx      # Cercle animé (fond login)
│   ├── InputField.tsx        # Champ de saisie glassmorphism
│   ├── LoginButton.tsx       # Bouton gradient + spinner
│   ├── ErrorMessage.tsx      # Message d'erreur animé
│   ├── StatCard.tsx          # Carte KPI (icône, valeur, badge)
│   ├── ActivityItem.tsx      # Ligne d'activité succès/erreur
│   ├── Sidebar.tsx           # Barre de navigation latérale
│   ├── MobileDrawer.tsx      # Overlay animé (hamburger → sidebar)
│   ├── VehicleCard.tsx       # Carte tournée véhicule (expandable)
│   ├── StopCard.tsx          # Arrêt conducteur (valider / passer, slide-out)
│   └── SiteModal.tsx         # Modal ajout site de collecte (bottom sheet)
│
├── services/                 # Appels HTTP vers le back
│   ├── api.ts                # Wrapper fetch (gestion erreurs)
│   ├── auth.ts               # POST /login
│   ├── dashboard.ts          # GET /api/dashboard/stats|activite
│   ├── planning.ts           # GET /api/admin/planning
│   ├── chauffeur.ts          # GET+POST /api/chauffeur/...
│   └── clients.ts            # GET+POST /clients
│
└── constants/
    ├── colors.ts             # Palette de couleurs
    └── api.ts                # URL API — détection auto IP + .env.local
```

---

## Flux d'une requête

```
Écran (app/)
  → service (services/)       # quoi envoyer
    → api.ts                  # comment fetcher
      → constants/api.ts      # où (URL)
        → Flask backend
```

---

## Services ↔ Routes Flask

| Fichier | Fonction | Route |
|---|---|---|
| auth.ts | `login()` | POST `/login` |
| dashboard.ts | `getDashboardStats()` | GET `/api/dashboard/stats?date=` |
| dashboard.ts | `getActiviteRecente()` | GET `/api/dashboard/activite?date=` |
| planning.ts | `getPlanningAdmin()` | GET `/api/admin/planning?date=` |
| chauffeur.ts | `getTournee(id)` | GET `/api/chauffeur/<id>/tournee?date=` |
| chauffeur.ts | `updateStatutTache(id, data)` | POST `/api/chauffeur/tache/<id>/statut` |
| clients.ts | `getClients()` | GET `/clients` |
| clients.ts | `addClient(data)` | POST `/clients` |

---

## Règles du projet

- **StyleSheet uniquement** — NativeWind v4 cause des conflits de dépendances
- **`/front` est la source de vérité design** — chaque page HTML devient un écran Expo
- **Navigation** : hamburger universel → `MobileDrawer` overlay sur tous les écrans
- **Git** : `git add front-expo/` uniquement pour ne pas écraser le back du collègue

---

## Connexion / rôles

| Email | Rôle | Destination |
|---|---|---|
| admin@archappli.fr | Admin (via back) | `/dashboard` |
| driver@archappli.fr | Chauffeur (hardcodé) | `/driver` |

Le chauffeur est identifié par email avant l'appel API. Le back doit retourner `"role": "chauffeur"` pour les vrais comptes conducteurs (cf. `BACK_PLANNING.md` à la racine).

---

## État des pages

| Page | Route | Branché back | Notes |
|---|---|---|---|
| Login | `/` | ✅ | Logo leaf+sync-outline, bypass `driver@archappli.fr` |
| Dashboard admin | `/dashboard` | ✅ | KPIs + activité récente |
| Planning admin | `/planning` | ✅ partiel | SiteModal, bouton imprévus fonctionnels |
| Vue conducteur | `/driver` | ❌ hardcodé | 5 arrêts fictifs, en attente back |
| Imprévus | `/imprevus` | ❌ hardcodé | 3 imprévus fictifs, en attente back |
