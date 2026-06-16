# AlchiRoute

> Application mobile/web de gestion de tournées de collecte de biodéchets
> **Les Alchimistes Côte d'Azur** · Var (83) · Garage Week — Groupe 4

---

## Démarrage rapide

```bash
# 1. Backend (depuis /serveur)
# Créer serveur/.env à partir de .env.exemple (optionnel)
pip install -r requirements.txt
python main.py
# → http://localhost:5000  (reset DB automatique au démarrage)

# 2. Frontend (depuis /front-expo)
npm install
npx expo start --clear
# W → navigateur   |   QR → Expo Go mobile
```

> **IP mobile** : créer `front-expo/.env.local` (gitignored)
> ```
> EXPO_PUBLIC_API_URL=http://TON_IP:5000
> ```
> L'IP change selon le réseau (WiFi ≠ hotspot iPhone `172.20.10.x`). Hors réseau commun : `ngrok http 5000`.

---

## Comptes de test

| Email | Mot de passe | Rôle | Accès |
|---|---|---|---|
| `admin@logistic.fr` | `1234` | Admin | Dashboard, Planning, Imprévus, Sites |
| `jean@logistic.fr` | `1234` | Chauffeur (id=1) | Vue conducteur (Jean Dupont) |
| `alice@logistic.fr` | `1234` | Chauffeur (id=2) | Vue conducteur (Alice Martin) |

> La base est remise à zéro (`reset_db=True` dans `main.py`) à chaque redémarrage du serveur. Les tâches de collecte sont générées via le bouton « Générer les tournées » dans l'écran Planning.

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Mobile / Web | Expo + Expo Router | ~54 / ~6 |
| Framework RN | React Native | 0.81.5 |
| Langage front | TypeScript | 5 |
| Style | React Native `StyleSheet` (pas NativeWind) | — |
| Animations | React Native `Animated` API + Reanimated (Login uniquement) | ~4.1.1 |
| SVG | react-native-svg | 15.12.1 |
| Backend | Python + Flask + flask-cors | — |
| Base de données | SQLite (fichier `serveur/ma_base.db`) | — |
| Optimisation | Google OR-Tools | — |
| Distances routes | OSRM (API publique) + fallback euclidien | — |
| Géocodage | Nominatim / OpenStreetMap | — |

---

## Structure du dépôt

```
GarageGrp4/
├── front/                    # Pages HTML/CSS d'origine (référence design)
├── front-expo/               # Application Expo — zone de travail principale
│   ├── app/                  # Écrans (Expo Router file-based routing)
│   ├── components/           # Composants réutilisables
│   ├── services/             # Couche API (fetch + types TypeScript)
│   ├── constants/            # Couleurs, URL API
│   └── assets/               # Images (logo Les Alchimistes)
└── serveur/                  # Backend Flask + OR-Tools
    ├── main.py               # Définition de toutes les routes Flask
    ├── solveur_ortools.py    # Moteur d'optimisation Google OR-Tools
    ├── client.py             # Classe modèle Client
    ├── donnee.sql            # Script SQL — schéma + données de test
    ├── requirements.txt      # Dépendances Python
    ├── .env.exemple          # Modèle de variables d'environnement
    └── database/             # Couche accès données (4 repositories)
        ├── db_core.py
        ├── database_manager.py
        ├── repo_utilisateurs.py
        ├── repo_clients.py
        ├── repo_ressources.py
        └── repo_tournees.py
```

---

## Architecture backend

### 1. Initialisation de la base

Au démarrage, `DatabaseCore.__init__` exécute `donnee.sql` via `conn.executescript()` si `reset_db=True`. Cela DROP toutes les tables existantes et les recrée à zéro avec les données de test (20 clients, 2 chauffeurs, 2 camions, tournées pré-configurées pour la semaine du 16–20 juin 2026).

```python
# main.py
db = DatabaseManager(reset_db=True)
```

### 2. Couche base de données — 4 niveaux

```
Routes Flask (main.py)
      ↓
DatabaseManager          # Façade unique — délègue à chaque repo
      ↓
┌─────────────────────────────────────────────────────┐
│  UtilisateurRepository  │  ClientRepository          │
│  RessourceRepository    │  TourneeRepository         │
└─────────────────────────────────────────────────────┘
      ↓
DatabaseCore             # Connexion SQLite, PRAGMA foreign_keys = ON
```

Chaque repository reçoit `db_core` en injection de dépendance. Toutes les connexions sont ouvertes/fermées dans un bloc `with self.db_core.get_connection() as conn`.

### 3. Schéma de la base de données

**`utilisateurs`** — authentification
| Colonne | Type | Contrainte |
|---|---|---|
| id | INTEGER PK | AUTOINCREMENT |
| email | TEXT | UNIQUE NOT NULL |
| mot_de_passe | TEXT | NOT NULL |
| role | TEXT | CHECK IN ('admin', 'chauffeur') |

**`chauffeurs`** — profil terrain
| Colonne | Type |
|---|---|
| id | INTEGER PK |
| utilisateur_id | FK → utilisateurs |
| nom, prenom, telephone | TEXT |

**`camions`** — flotte
| Colonne | Type | Description |
|---|---|---|
| immatriculation | TEXT UNIQUE | ex: AB-123-CD |
| charge_max_kg | INTEGER | Poids maximal (ex: 1500 kg) |
| bacs_max | INTEGER | Capacité en bacs (ex: 20) |

**`clients`** — sites de collecte
| Colonne | Type | Description |
|---|---|---|
| nom_entreprise | TEXT | Nom du site |
| latitude, longitude | REAL | Coordonnées GPS |
| adresse | TEXT | Adresse complète (Nominatim reverse geocoding) |
| date_debut_contrat | TEXT | ISO 8601 (YYYY-MM-DD) |
| date_fin_contrat | TEXT | ISO 8601 — statut contrat calculé côté front |

**`disponibilites_clients`** — créneaux récurrents
| Colonne | Type | Description |
|---|---|---|
| client_id | FK → clients CASCADE |  |
| jour_semaine | INTEGER | 1=Lundi … 7=Dimanche |
| heure_debut, heure_fin | TEXT | Format HH:MM:SS |
| poids_prevu_kg | REAL | Poids estimé de biodéchets (défaut 100 kg) |

**`tournees_jour`** — planning par chauffeur/camion/date
| Colonne | Type | Description |
|---|---|---|
| date_tournee | TEXT | Date ISO |
| chauffeur_id | FK → chauffeurs | |
| camion_id | FK → camions | |
| heure_debut_service | TEXT | Début de service (ex: 06:30:00) |
| heure_fin_service | TEXT | Fin de service (ex: 16:00:00) |
| distance_km | REAL | Rempli après optimisation OR-Tools |
| statut | TEXT | brouillon / affectee / demarree / terminee |

**`taches_collecte`** — arrêts individuels
| Colonne | Type | Description |
|---|---|---|
| tournee_id | FK → tournees_jour | NULL si non affectée |
| client_id | FK → clients | |
| type_tache | TEXT | 'collecte' ou 'vidage_depot' |
| date_planifiee | DATE | |
| ordre_passage | INTEGER | Position dans la tournée (1, 2, 3...) |
| heure_estimee | TEXT | Calculée par OR-Tools |
| bacs_prevus, poids_prevu_kg | INTEGER/REAL | |
| bacs_reels | INTEGER | Saisi par le chauffeur après collecte |
| statut | TEXT | en_attente / planifiee / en_cours / terminee / erreur |
| commentaire | TEXT | Remarque libre du chauffeur |
| type_imprevu | TEXT | Catégorie d'imprevu (voir ci-dessous) |

**`exceptions_calendrier_clients`** — fermetures ponctuelles
| Colonne | Type |
|---|---|
| client_id | FK → clients |
| date_exception | TEXT |
| est_ferme | BOOLEAN |

**`depots`** — dépôt central
| Colonne | Valeur de test |
|---|---|
| nom | Dépôt La Farlède |
| latitude | 43.1389 |
| longitude | 6.0222 |

---

## Algorithme d'optimisation OR-Tools

### Vue d'ensemble

L'optimisation se déclenche en deux étapes depuis le front (écran Planning) :

```
[Bouton "Générer les tournées"]  →  POST /api/planning/generer
      → generer_brouillons_jour() : crée les tâches en statut 'en_attente'
         selon disponibilites_clients pour le jour_semaine de la date cible

[Bouton "Optimiser"]  →  POST /api/planning/optimiser
      → preparer_donnees_ortools() : construit le graphe pour OR-Tools
      → resoudre_et_exporter()     : résout le VRP
      → sauvegarder_resultat_optimisation() : écrit en BDD
```

### Préparation des données (`repo_tournees.py → preparer_donnees_ortools`)

```python
coordonnees = [(depot_lat, depot_lon)]     # index 0 = dépôt
# Pour chaque tâche en_attente du jour :
coordonnees.append((lat_client, lon_client))

data['distance_matrix'] = calculer_distance_matrice(coordonnees)
# Appel OSRM /table/v1/driving/{lon,lat;...}?annotations=distance
# Résultat en mètres (entiers)
# Fallback euclidien si OSRM indisponible : dist * 100000

data['time_matrix'] = [[int(v/60) if v > 500 else v for v in row]
                        for row in data['distance_matrix']]
# Conversion distance (m) → temps (min) : division par 60
# Seuil 500 m pour distinguer mètres/secondes selon la réponse OSRM
```

**Fenêtres horaires** : toutes les fenêtres clients sont actuellement `(180, 1200)` (3h00–20h00 en minutes) car les données de `disponibilites_clients` ne sont pas encore injectées dans OR-Tools. Les fenêtres chauffeurs sont issues de `tournees_jour.heure_debut_service` / `heure_fin_service` converties en minutes :
```python
def heure_vers_minutes(heure_str):  # "06:30:00" → 390
    h, m, s = map(int, heure_str.split(':'))
    return h * 60 + m
```

**Multi-trip** : chaque chauffeur peut avoir plusieurs `tournees_jour` le même jour (N lignes en BDD = N véhicules virtuels dans OR-Tools). Le champ `groupes_vehicules` associe chaque véhicule virtuel à son `chauffeur_id`.

### Solveur (`solveur_ortools.py → resoudre_et_exporter`)

**Modèle de routage :**
```python
manager = pywrapcp.RoutingIndexManager(
    nb_noeuds,       # = 1 dépôt + N clients
    nb_vehicules,    # = total tournees_jour du jour
    depot=0
)
routing = pywrapcp.RoutingModel(manager)
```

**Contrainte 1 — Distance (fonction objectif à minimiser) :**
```python
def distance_callback(from_index, to_index):
    return data['distance_matrix'][from_node][to_node]  # en mètres
routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
```

**Contrainte 2A — Capacité bacs :**
```python
routing.AddDimensionWithVehicleCapacity(
    demand_callback_index,
    slack_max=0,
    vehicle_capacities=data['vehicle_capacities'],  # ex: [20, 15]
    fix_start_cumul_to_zero=True,
    name='Capacity_Bacs'
)
```

**Contrainte 2B — Capacité poids (kg) :**
```python
routing.AddDimensionWithVehicleCapacity(
    weight_callback_index,
    slack_max=0,
    vehicle_capacities=data['vehicle_weights'],     # ex: [1500, 1000]
    fix_start_cumul_to_zero=True,
    name='Capacity_Weight'
)
```

**Contrainte 3 — Temps de service et trajet :**
```python
def time_callback(from_index, to_index):
    temps_service = 15 if from_node != depot else 0   # 15 min par arrêt
    temps_trajet  = distance_matrix[from_node][to_node] // 500
    # distance(m) ÷ 500 ≈ minutes à ~30 km/h
    return temps_service + temps_trajet

routing.AddDimension(
    time_callback_index,
    slack=60,        # attente max sur place : 60 min
    capacity=1440,   # horizon : 24h en minutes
    fix_start_cumul_to_zero=False,
    name='Time'
)
```

**Formule vitesse de déplacement :**
```
distance (mètres) ÷ 500 = durée (minutes)
→ 500 m/min = 30 km/h (vitesse terrain urbain/péri-urbain Var)
```

**Contrainte 4 — Multi-trip (DUREE_VIDAGE = 30 min) :**
```python
# Si véhicule v et v+1 appartiennent au même chauffeur :
time_dim.CumulVar(start_v2) >= time_dim.CumulVar(end_v1) + 30
# Le 2e trip ne démarre qu'après le retour dépôt + 30 min de vidage
```

**Coût fixe de sortie :** `routing.SetFixedCostOfAllVehicles(10000)` — pénalise l'utilisation d'un véhicule supplémentaire, favorise le regroupement.

**Disjonctions (points optionnels) :**
```python
penalty = 1_000_000
for node in range(1, nb_noeuds):
    routing.AddDisjunction([manager.NodeToIndex(node)], penalty)
# Si un arrêt est impossible à caser, le solveur le "laisse tomber"
# plutôt que de retourner AUCUNE SOLUTION, avec une pénalité de 1M
```

**Stratégie de recherche :**
```python
search_parameters.first_solution_strategy = PARALLEL_CHEAPEST_INSERTION
# Insère les noeuds un à un à l'endroit le moins coûteux

search_parameters.local_search_metaheuristic = GUIDED_LOCAL_SEARCH
# Améliore la solution initiale en guidant l'exploration par des pénalités

search_parameters.time_limit.seconds = 10
# Limite de calcul : 10 secondes
```

**Sortie du solveur :**
```python
resultat = {
  "routes": {
    0: [{"node_index": 0, "heure_estimee": "06:30"},
        {"node_index": 3, "heure_estimee": "07:15"}, ...],
    1: [...]
  },
  "distances": {
    0: 47.3,   # km, arrondi à 1 décimale
    1: 38.1
  }
}
# distance route_distance (mètres) ÷ 1000 = km
```

### Sauvegarde (`sauvegarder_resultat_optimisation`)

Pour chaque véhicule OR-Tools `vehicule_id` → `tournees_reelles_ids[vehicule_id]` (ligne en BDD) :
- UPDATE `taches_collecte` : `tournee_id`, `ordre_passage`, `heure_estimee`, `statut='planifiee'`
- UPDATE `tournees_jour` : `distance_km`, `statut='affectee'`

---

## Algorithme de réassignation des imprévus

Quand un chauffeur signale un imprevu (`statut='erreur'`), l'admin peut déclencher une réassignation temps réel sans relancer OR-Tools.

### Types d'imprévus

| Valeur DB | Label UI | Réassignable |
|---|---|---|
| `poids_atteint` | Benne pleine | Oui |
| `client_absent` | Client absent | Oui |
| `bac_absent` | Bac absent | **Non** — replanifier demain uniquement |
| `acces_impossible` | Accès impossible | Oui |
| `chauffeur_indisponible` | Chauffeur indispo | Oui |
| `autre` | Autre | Oui |

### Heuristique greedy (`trouver_candidat_reassignation`)

```python
# 1. Récupérer la tâche orpheline
poids_orphelin, bacs_orphelin, lat_o, lon_o,
hd_str, hf_str = SELECT ... FROM taches_collecte t
                  JOIN clients c ... JOIN disponibilites_clients dc
                  WHERE dc.jour_semaine = weekday(date_jour) + 1

client_debut = heure_vers_minutes(hd_str)   # fenêtre client
client_fin   = heure_vers_minutes(hf_str)
heure_actuelle = now.hour * 60 + now.minute

if heure_actuelle >= client_fin: return None  # trop tard

# 2. Pour chaque tournée avec des arrêts encore 'planifiee' (hors tournée d'origine) :

# Vérification capacité poids restante
poids_utilise = SUM(poids_prevu_kg) WHERE statut='terminee'
if (charge_max - poids_utilise) < poids_orphelin: skip

# Estimation position du chauffeur = dernier arrêt terminé (sinon dépôt)
pos_lat, pos_lon = SELECT ... WHERE statut='terminee' ORDER BY ordre_passage DESC LIMIT 1

# Calcul OSRM (3 points : position → orphelin → dépôt)
mat = calculer_distance_matrice([(pos_lat,pos_lon), (lat_o,lon_o), (DEPOT_LAT,DEPOT_LON)])
t_vers_client = mat[0][1] // 500   # m ÷ 500 = minutes (≈30 km/h)
t_vers_depot  = mat[1][2] // 500

arrivee    = heure_actuelle + t_vers_client
fin_tournee = arrivee + 15 + t_vers_depot    # 15 min service

if arrivee > client_fin: skip        # fenêtre client dépassée
if fin_tournee > fin_service: skip   # chauffeur finirait trop tard

# Sélectionne le candidat avec t_vers_client le plus petit (greedy)
```

### Réassignation (`executer_reassignation`)

```python
if tournee_id is None:
    # Aucun chauffeur disponible → replanifier demain
    UPDATE taches_collecte SET date_planifiee=demain, statut='en_attente', tournee_id=NULL

else:
    # Insertion en fin de tournée
    max_ordre = SELECT MAX(ordre_passage) FROM taches_collecte WHERE tournee_id=?
    UPDATE taches_collecte SET tournee_id=?, ordre_passage=max_ordre+1, statut='planifiee'
```

---

## Géocodage Nominatim

**Reverse geocoding (`backfill_adresses_nominatim`)** — remplit la colonne `adresse` pour les clients sans adresse :
```
GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json
Header: User-Agent: AlchiRoute/1.0 contact@les-alchimistes.fr
→ data['display_name'] → UPDATE clients SET adresse=?
sleep(1)   # respecte la limite Nominatim : max 1 req/seconde
```

**Forward geocoding (front SiteModal)** — autocomplétion lors de l'ajout d'un site :
```
GET https://nominatim.openstreetmap.org/search?q={query}+Var+France&format=json&limit=5&countrycodes=fr
→ suggestions avec display_name, lat, lon
Debounce : 500 ms après la dernière frappe
```

---

## Routes API Flask complètes

| Méthode | Route | Description |
|---|---|---|
| POST | `/login` | Auth email+mot_de_passe → user_id, role, nom |
| GET | `/clients` | Liste tous les sites clients |
| POST | `/clients` | Ajouter un site (nom, lat, lon, adresse, dates contrat) |
| DELETE | `/clients/<id>` | Supprimer un client (CASCADE tâches + dispos) |
| GET | `/clients/<id>/disponibilites` | Créneaux de collecte d'un client |
| POST | `/disponibilites` | Ajouter un créneau (client_id, jour, heure_debut, heure_fin) |
| POST | `/clients/backfill-adresses` | Lancer reverse geocoding Nominatim (thread daemon) |
| GET | `/api/dashboard/stats?date=` | KPIs : poids, collectes, alertes, km, flotte |
| GET | `/api/dashboard/activite?date=` | 5 dernières actions (terminee/erreur) |
| GET | `/api/admin/planning?date=` | Tournées détaillées pour l'admin |
| GET | `/api/planning/preview?date=` | clients_dispo + chauffeurs_dispo pour la PrepCard |
| POST | `/api/planning/generer` | Étape 1 : créer les brouillons de tâches |
| POST | `/api/planning/optimiser` | Étape 2 : OR-Tools → affectation tournées |
| GET | `/api/chauffeur/<id>/tournee?date=` | Tournée du chauffeur (arrets, statuts, poids) |
| POST | `/api/chauffeur/tache/<id>/statut` | Valider (terminee) ou signaler (erreur + type_imprevu) |
| GET | `/api/imprevus?date=` | Tâches en erreur du jour |
| POST | `/api/imprevus/<id>/reassigner` | Réassignation greedy ou report au lendemain |
| POST | `/api/imprevus/<id>/replanifier` | Remettre en_attente sans réassigner |

---

## Architecture frontend

### Routing (Expo Router file-based)

```
app/
  _layout.tsx     SafeAreaProvider + Stack (toutes les transitions en 'fade')
  index.tsx       Login
  dashboard.tsx   Admin — tableau de bord
  planning.tsx    Admin — génération et supervision des tournées
  driver.tsx      Chauffeur — vue terrain
  imprevus.tsx    Admin — gestion des erreurs du jour
  sites.tsx       Admin — annuaire des clients
```

### Couche services (`services/`)

Toutes les fonctions passent par un wrapper `api` unique (`services/api.ts`) :

```typescript
// Auto-détection de l'IP du serveur
// 1. EXPO_PUBLIC_API_URL (variable d'environnement)
// 2. localhost:5000 (navigateur web)
// 3. IP du PC Metro via Constants.expoGoConfig.debuggerHost (Expo Go mobile)

const api = {
  get:  <T>(path) => fetch(BASE + path, GET)  → throw si !res.ok
  post: <T>(path, body) → fetch(BASE + path, POST+JSON)
  del:  <T>(path) → fetch(BASE + path, DELETE)
}
```

| Fichier | Fonctions exportées |
|---|---|
| `auth.ts` | `login(email, mdp)` |
| `clients.ts` | `getClients`, `addClient`, `deleteClient`, `addDisponibilite`, `getClientDisponibilites`, `backfillAdresses` |
| `planning.ts` | `getPlanningAdmin`, `genererBrouillons`, `optimiserTournees`, `getPlanningPreview` |
| `dashboard.ts` | `getDashboardStats`, `getActiviteRecente` |
| `chauffeur.ts` | `getTournee`, `updateStatutTache` |
| `imprevus.ts` | `getImprevus`, `replanifierImprevu`, `reassignerImprevu` |

### Écrans principaux

**`index.tsx` — Login**
- `TruckAnimation` (SVG animé Reanimated) avec 5 phases : `arriving → idle → starting → departing / error`
- La carte de login « tombe » du camion via `withSpring` sur l'`opacity` et le `translateY`
- Phase `departing` déclenchée sur succès, `error` sur identifiants incorrects

**`dashboard.tsx` — Tableau de bord Admin**
- BriefingCard : 3 états (non généré, en cours, terminé) selon `collectes_validees / collectes_total`
- 4 StatCards avec count-up animé : biodéchets (kg), collectes validées, alertes actives, distance (km)
- Section flotte : point coloré (vert = terminé, amber = en cours, coral = erreur) + dernier point connu
- Section activité récente : 5 dernières actions

**`planning.tsx` — Planning Admin**
- Mode **Préparation** (aucune tournée affectée) : PrepCard avec contexte jour (clients dispo / chauffeurs) + bouton « Générer » en 2 étapes (brouillons → OR-Tools)
- Mode **Supervision** (tournées affectées) : StatsBar (camions / arrêts / validées / km) + AlertBanner + toggle Tournées/Carte + liste VehicleCard
- GenerationModal : résumé post-optimisation OR-Tools (véhicules utilisés, nombre d'arrêts)
- MapTournees : carte Leaflet rendue dans une WebView (mobile) ou iframe (web)

**`driver.tsx` — Vue Chauffeur**
- Header : avatar gradient + nom chauffeur + immatriculation + bouton déconnexion (double-tap)
- Progress strip : kg collectés / kg prévus + pourcentage + barre animée (`Animated.timing`)
- HeroCard : prochain arrêt avec validation ou signalement imprevu
- Sélecteur de type d'imprevu (6 chips) dans la modale de confirmation
- Bouton BlueBoB (lien externe vers la plateforme de tracking)
- Liste lecture seule des arrêts suivants

**`imprevus.tsx` — Gestion Imprévus**
- Barre de progression `traités / total`
- ImprevuCard : badge type d'imprevu (coral), nom client, chauffeur, heure, raison, deux boutons :
  - **Réassigner** (vert, caché si `bac_absent`) → appel OSRM en temps réel
  - **Reporter demain** (vert foncé) → ConfirmModal avec date du lendemain
- Animation d'entrée staggerée (60 ms par carte) + animation de sortie (fadeOut + slideUp)

**`sites.tsx` — Annuaire Sites**
- Liste avec extraction de la ville depuis l'adresse (`/\d{5}\s+([^,]+)/`)
- SiteModal : ajout nouveau site avec autocomplétion Nominatim, sélection jours, créneau, durée contrat (chips 6 mois / 1 an / 2 ans)
- SiteDetailModal : statut contrat coloré (actif vert / expire bientôt ambre ≤30 jours / expiré coral), créneaux de collecte, suppression avec confirmation inline

### Statut contrat (logique front `SiteDetailModal`)

```typescript
const diffDays = (endDate - today) / 86400000

if (diffDays < 0)   → 'Expiré'     — coral  (#E76F51)
if (diffDays <= 30) → 'Expire bientôt' — ambre (#C8960C)
else                → 'Actif'      — vert   (#2D6A4F)
```

---

## Système de design

### Palette de couleurs (`constants/colors.ts`)

| Token | Valeur | Usage |
|---|---|---|
| `primaryDark` | `#1B4332` | Fond header, éléments dark |
| `primaryLight` | `#2D6A4F` | Couleur principale, boutons, liens |
| `accent` | `#52B788` | Barre de progression, accents |
| `secondary` | `#1A759F` | Statut planifiée, éléments secondaires |
| `background` | `#F0F7F4` | Fond général app |
| `card` | `#FFFFFF` | Fond des cartes |
| `text` | `#1B2D27` | Texte principal |
| `textMuted` | `#6B8F7E` | Texte secondaire, metadata |
| `coral` | `#E76F51` | Alertes, imprévus, erreurs |
| `coralLight` | `#FFF0EB` | Fond badge erreur |

**Statuts (source de vérité unique) :**

| Statut | `bg` | `fg` | `border` |
|---|---|---|---|
| `en_attente` | `#F0F4F3` | `#8FA99F` | `#D4E0DC` |
| `planifiee` | `#E6F4FA` | `#1A759F` | `#B8DDE8` |
| `en_cours` | `#FFF5E6` | `#C17D1A` | `#F5D9A0` |
| `terminee` | `#E8F5EE` | `#2D6A4F` | `#C8E8D4` |
| `erreur` | `#FFF0EB` | `#E76F51` | `rgba(231,111,81,0.25)` |

### TruckAnimation (`components/TruckAnimation.tsx`)

SVG 240×100 viewBox animé via Reanimated. Éléments animés :

| Élément | `SharedValue` | Animation |
|---|---|---|
| Camion entier | `truckX` | `withSpring` arrivée, `withTiming` départ |
| Vibration moteur | `vibX` | `withRepeat(withSequence(±3px))` |
| Roues | `wheelRot` | `withRepeat(withTiming(360°))` |
| Hayon | `tailgateScaleY` | `withTiming(0→1)` rétraction depuis le bas |
| Bac email | `bin1Scale/Y/Opacity` | `withSpring` apparition quand email rempli |
| Bac password | `bin2Scale/Y/Opacity` | `withSpring` apparition quand mdp rempli |

Constantes physiques des ressorts :
```typescript
SPRING_BIN  = { damping: 14, stiffness: 180 }  // bacs — rebond modéré
SPRING_FAST = { damping: 18, stiffness: 220 }  // éléments rapides
```

---

## Données de test

La base de test couvre **20 sites clients** dans le Var (Toulon, Hyères, Fréjus, Saint-Tropez, etc.) avec des disponibilités réalistes :
- Supermarché Port : Lun/Mer/Ven — 250 kg/passage
- Hôpital Sud : Lun/Mer/Ven — 300 kg, créneau 06h00–10h00
- Boulangerie Matin : tous les jours — 60 kg, créneau 06h30–09h00
- Marché Provençal : Mercredi uniquement — 220 kg (320 kg le samedi)
- etc.

Quelques contrats proches de l'expiration ou expirés sont inclus pour tester les badges colorés dans Sites.

**Tournées pré-configurées** : Jean Dupont (camion 1500 kg / 20 bacs) + Alice Martin (camion 1000 kg / 15 bacs), du 13 au 20 juin 2026, statut `brouillon`. Aucune tâche n'est insérée au démarrage — elles sont créées via le bouton « Générer les tournées ».

---

## Règles de développement

1. **StyleSheet uniquement** — jamais NativeWind (conflits avec Expo Router)
2. **Animations** : `React Native Animated` API pour toutes les pages sauf `TruckAnimation` (Reanimated)
3. **Dates** : toujours dynamiques — `new Date().toISOString().split('T')[0]`
4. **Réseau** : définir `EXPO_PUBLIC_API_URL` dans `.env.local` en mobilité
5. **Commits** : `front-expo/` et `serveur/` — éviter `node_modules/`, `.expo/`
6. **`.gitattributes`** : `* text=auto` — normalisation LF en dépôt, conversion CRLF locale Windows (comportement attendu)
