# AlchiRoute — Front Expo

App mobile/web de gestion de tournées de collecte de biodéchets.
**Les Alchimistes Côte d'Azur — Garage Week Grp4**

---

## Lancer le projet

```bash
# Back (dans /serveur)
python main.py

# Front
npx expo start --clear
# Web : W  |  Mobile : scanner le QR avec Expo Go
```

Comptes de test (donnee.sql) :

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@logistic.fr | 1234 | Admin → `/dashboard` |
| jean@logistic.fr | 1234 | Chauffeur → `/driver?id=1` |
| alice@logistic.fr | 1234 | Chauffeur → `/driver?id=2` |

Données disponibles pour la date : **aujourd'hui (vendredi)** — générées via le bouton "Générer" dans Planning.

---

## IP / réseau

Créer `.env.local` à la racine de `front-expo/` avec l'IP du PC **sur le réseau courant** :

```
EXPO_PUBLIC_API_URL=http://192.168.X.X:5000
```

Trouver l'IP : `ipconfig` → IPv4 de l'adaptateur WiFi/Ethernet actif.

> Sans ce fichier, l'IP est détectée automatiquement via Metro (Expo Go uniquement).
> L'IP change selon le réseau (WiFi, hotspot…) — mettre à jour `.env.local` à chaque changement.
> Hors réseau commun → utiliser `ngrok http 5000` pour exposer le serveur.

---

## Stack

- **Expo ~54** + **Expo Router ~6** — routing file-based
- **React Native 0.81.5** + **StyleSheet** — pas de NativeWind, pas de Tailwind
- **react-native-reanimated ~4.1.1** — animations
- **react-native-svg 15.12.1** — SVG animés (camion login)
- **TypeScript 5**
- **Flask** (port 5000) + flask-cors — backend Python

---

## Architecture

```
front-expo/
├── app/
│   ├── _layout.tsx           # Stack navigator + SafeAreaProvider
│   ├── index.tsx             # Login — animation camion SVG
│   ├── dashboard.tsx         # Dashboard admin
│   ├── planning.tsx          # Planning & tournées (carte + IA OR-Tools)
│   ├── driver.tsx            # Vue conducteur (ID depuis URL params ?id=X)
│   └── imprevus.tsx          # Gestion des imprévus
│
├── components/
│   ├── TruckAnimation.tsx    # Camion SVG animé (login) ← session 3
│   ├── AnimatedBlob.tsx      # Blobs fond login
│   ├── InputField.tsx        # Champ de saisie
│   ├── LoginButton.tsx       # Bouton gradient + spinner
│   ├── ErrorMessage.tsx      # Message d'erreur animé
│   ├── StatCard.tsx          # Carte KPI
│   ├── ActivityItem.tsx      # Ligne activité récente
│   ├── Sidebar.tsx           # Nav latérale (safe area insets mobile)
│   ├── MobileDrawer.tsx      # Overlay animé hamburger → sidebar
│   ├── VehicleCard.tsx       # Carte tournée véhicule (capaciteMaxKg back)
│   ├── StopCard.tsx          # Arrêt conducteur (valider / passer)
│   ├── SiteModal.tsx         # Modal ajout site de collecte
│   └── MapTournees.tsx       # Carte Leaflet (WebView mobile / iframe web)
│
├── services/
│   ├── api.ts                # Wrapper fetch
│   ├── auth.ts               # POST /login
│   ├── dashboard.ts          # GET stats + activite
│   ├── planning.ts           # GET planning + POST generer + POST optimiser
│   ├── chauffeur.ts          # GET tournee + POST statut tache
│   └── clients.ts            # GET + POST /clients
│
├── constants/
│   ├── colors.ts             # Palette couleurs
│   └── api.ts                # URL API (auto-détection IP Metro + .env.local)
│
└── assets/
    └── télécharger.png       # Logo Les Alchimistes (utilisé dans TruckAnimation)
```

---

## Services ↔ Routes Flask

| Fichier | Fonction | Route |
|---|---|---|
| auth.ts | `login()` | POST `/login` |
| dashboard.ts | `getDashboardStats()` | GET `/api/dashboard/stats?date=` |
| dashboard.ts | `getActiviteRecente()` | GET `/api/dashboard/activite?date=` |
| planning.ts | `getPlanningAdmin()` | GET `/api/admin/planning?date=` |
| planning.ts | `genererBrouillons()` | POST `/api/planning/generer` |
| planning.ts | `optimiserTournees()` | POST `/api/planning/optimiser` |
| chauffeur.ts | `getTournee(id)` | GET `/api/chauffeur/<id>/tournee?date=` |
| chauffeur.ts | `updateStatutTache(id)` | POST `/api/chauffeur/tache/<id>/statut` |
| clients.ts | `getClients()` | GET `/clients` |
| clients.ts | `addClient(data)` | POST `/clients` |
| imprevus.ts | `getImprevus(date)` | GET `/api/imprevus?date=` |
| imprevus.ts | `replanifierImprevu(id)` | POST `/api/imprevus/<id>/replanifier` |

---

## Animation login (TruckAnimation)

Le camion est le personnage principal du login. Phases :

| Phase | Déclencheur | Animation |
|---|---|---|
| `arriving` | Montage | Camion slide depuis la gauche, hayon s'ouvre, formulaire tombe |
| `idle` | Après arrivée | Camion statique |
| `starting` | Clic connexion | Vibration moteur + roues tournent |
| `departing` | Connexion OK | Hayon se referme, camion accélère et quitte l'écran |
| `error` | Connexion KO | Secousse, hayon s'ouvre, bacs s'éjectent |

Bacs dans la benne : apparaissent quand email (avec @) et mot de passe sont remplis.

---

## État session 4 — UX/UI redesign complet

| Fichier | Changement |
|---|---|
| `constants/colors.ts` | Objet `colors.status` — source de vérité sémantique pour les statuts |
| `components/StatCard.tsx` | Fade+slide à l'entrée, count-up animé 0 → valeur |
| `app/dashboard.tsx` | BriefingCard 3 états, stats décalées, notifDot conditionnel |
| `app/planning.tsx` | Deux modes : préparation (bouton Générer) / supervision (stats + carte + cascade) |
| `app/driver.tsx` | Hero card 1er arrêt, progress bar kg, sous-titre dynamique |
| `app/imprevus.tsx` | Stagger entry, bordure coral, exit animé, spinner loading |
| `components/SiteModal.tsx` | 3 sections, focus states, spinner submit, erreur inline |
| `app/_layout.tsx` | Transitions : fade (écrans principaux), slide_from_right (imprevus) |
| `components/VehicleCard.tsx` | Nom chauffeur réel, heure départ réelle, entry animation |

**Features fonctionnelles restantes :**
- Date picker sur Planning (aujourd'hui hardcodé `DATE_DEMO = today`)
- SiteModal — champs date début/fin + jours de semaine (nécessite migration DB)
- Replanification — déjà câblé, à tester

**Fix data à faire :**
- `donnee.sql` lignes 171-172 : `'03:00:00'` → `'06:30:00'` pour les 2 chauffeurs

---

## Bugs back connus (à transmettre)

1. **`get_tournees_detaillees`** (`repo_tournees.py` ~ligne 314) : manque `AND t.tournee_id = ?` → tous les chauffeurs voient tous les arrêts
2. **`sauvegarder_resultat_optimisation`** : `vehicule_id` direct au lieu de `vehicule_id // MAX_TOURS` → mapping OR-Tools → chauffeurs incorrect

---

## Règles

- **StyleSheet uniquement** — NativeWind v4 cause des conflits
- **Dates dynamiques** : `new Date().toISOString().split('T')[0]` partout
- **Git** : `git add front-expo/` uniquement
- **Back** : ne toucher que chirurgicalement, avec accord
