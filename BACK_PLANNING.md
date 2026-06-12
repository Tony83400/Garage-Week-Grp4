# Instructions back — ce que le front a construit et ce dont il a besoin

> **À lire par le responsable back avant toute modification.**
> Ce document décrit précisément ce que le front a implémenté et ce que le back doit fournir pour que chaque page soit 100% fonctionnelle.
> Aucune modification du front n'est nécessaire — le front est prêt et attend les routes listées ci-dessous.

---

## Vue d'ensemble — pages construites côté front

| Page | Rôle | État |
|---|---|---|
| Login (`/`) | Connexion par email + mot de passe | ✅ Branché au back |
| Dashboard admin (`/dashboard`) | KPIs du jour, activité récente | ✅ Branché au back |
| Planning & Tournées (`/planning`) | Vue des tournées, sites, imprévus | ⚠️ Partiellement branché |
| Saisir un site (modal dans `/planning`) | Formulaire d'ajout d'un site de collecte | ❌ Non branché |
| Imprévus (`/imprevus`) | Sites passés par les chauffeurs à replanifier | ❌ Non branché |
| Conducteur (`/driver`) | File de collecte + validation / passage d'arrêts | ❌ Non branché |

---

## ✅ Ce qui fonctionne déjà — ne pas modifier

| Route | Utilisée par | Ce qu'elle retourne |
|---|---|---|
| `POST /login` | Page Login | `user_id`, `role` |
| `GET /api/dashboard/stats?date=` | Dashboard | KPIs du jour |
| `GET /api/dashboard/activite?date=` | Dashboard | Activité récente |
| `GET /clients` | Planning (panel sites) | Liste des sites avec lat/lng |
| `GET /api/chauffeur/<id>/tournee?date=` | Planning (cartes véhicules) | Arrêts du chauffeur |
| `POST /api/chauffeur/tache/<id>/statut` | Conducteur (à brancher) | Confirmation statut |

---

## ❌ Ce qui doit être fait — par priorité

---

### PRIORITÉ 1 — Retourner le nom de l'utilisateur au login

**Page concernée :** Dashboard, Conducteur

**Situation actuelle :** Le front affiche "Nicolas" en dur sur le dashboard et "Marc Dubois" en dur sur l'écran conducteur. Ces noms sont des données fictives.

**Ce que le back doit faire :** Ajouter le champ `nom` dans la réponse de `POST /login`.

**Réponse actuelle :**
```json
{ "user_id": 1, "role": "admin" }
```

**Réponse attendue :**
```json
{ "user_id": 1, "role": "admin", "nom": "Nicolas Dupont" }
```

**Pourquoi c'est important :** Le front lira ce nom et l'affichera dans la topbar. Pour le conducteur, le nom affiché dans son header viendra de ce champ.

---

### PRIORITÉ 1 — Clarifier les valeurs du champ `role`

**Page concernée :** Login (redirection), Conducteur

**Situation actuelle :** Le front redirige vers `/dashboard` si `role === 'admin'`, et vers `/driver` pour tout autre rôle. Pour l'instant, les conducteurs sont redirigés via un email hardcodé (`driver@archappli.fr`) en attendant que le back gère les rôles correctement.

**Ce que le back doit faire :** S'assurer que `POST /login` retourne exactement :
- `"role": "admin"` pour les administrateurs
- `"role": "chauffeur"` pour les conducteurs

Si ces valeurs sont déjà les bonnes, le front n'a rien à changer.

---

### PRIORITÉ 2 — Vue planning admin

**Page concernée :** Planning (`/planning`)

**Situation actuelle :** Le front appelle `GET /api/chauffeur/{id}/tournee` pour les IDs 1 à 5 en dur, car la route admin n'existe pas encore. C'est un contournement fragile.

**Ce que le back doit faire :** Créer `GET /api/admin/planning?date=YYYY-MM-DD` qui retourne toutes les tournées du jour en un seul appel.

La méthode `get_tournees_detaillees(date)` existe déjà dans `repo_tournees.py` (ligne 249) — il suffit de l'exposer.

**Format attendu par le front :**
```json
[
  {
    "chauffeur_id": 1,
    "chauffeur": "Marc Dubois",
    "vehicule": "VL1",
    "immatriculation": "AA-123-BB",
    "capacite_max_kg": 750,
    "heure_depart": "06:30",
    "arrets": [
      {
        "tache_id": 12,
        "ordre": 1,
        "client_nom": "McDonald's Toulon Mayol",
        "statut": "terminee",
        "poids_prevu_kg": 120
      }
    ]
  }
]
```

> ⚠️ Bug connu dans `get_tournees_detaillees` : la requête interne ne filtre pas correctement par `chauffeur_id`. À corriger dans `repo_tournees.py` avant d'exposer la route.

---

### PRIORITÉ 2 — Noms chauffeur et véhicule dans la tournée

**Page concernée :** Planning (cartes véhicules)

**Situation actuelle :** Les cartes affichent "Chauffeur #1", "Chauffeur #2" car `GET /api/chauffeur/<id>/tournee` ne retourne pas le nom ni le véhicule.

**Ce que le back doit faire :** Ajouter `chauffeur`, `vehicule`, `capacite_max_kg` et `heure_depart` dans la réponse de cette route.

**Format attendu :**
```json
{
  "chauffeur": "Marc Dubois",
  "vehicule": "VL1",
  "capacite_max_kg": 750,
  "heure_depart": "06:30",
  "arrets": [ ... ]
}
```

---

### PRIORITÉ 2 — Route conducteur avec `user_id`

**Page concernée :** Conducteur (`/driver`)

**Situation actuelle :** L'écran conducteur affiche 5 arrêts fictifs hardcodés. Il est prêt à brancher `GET /api/chauffeur/<id>/tournee` mais il faut que le front connaisse l'`id` du chauffeur connecté.

**Ce que le back doit faire :**
1. S'assurer que `POST /login` retourne `user_id` (déjà le cas)
2. S'assurer que `GET /api/chauffeur/<user_id>/tournee?date=` retourne les arrêts du chauffeur dont l'`id` correspond au `user_id` reçu au login

Le front stockera le `user_id` au moment du login et l'utilisera pour appeler la route. Aucun changement front nécessaire, juste confirmer que l'`id` dans l'URL correspond bien au `user_id` du login.

---

### PRIORITÉ 3 — Enregistrement d'un site de collecte

**Page concernée :** Modal "Saisir un site" dans Planning

**Situation actuelle :** Le formulaire existe avec les champs suivants, mais le `POST /clients` actuel n'accepte probablement pas tous ces champs. Quand l'utilisateur valide, un toast de confirmation s'affiche mais rien n'est sauvegardé.

**Champs saisis dans le formulaire front :**
- `nom` — nom de l'établissement (obligatoire)
- `categorie` — type parmi : Restaurant, Hôtel, École, Cantine, Fast-food, Supermarché, Autre
- `adresse` — adresse de rue
- `ville` — commune du Var
- `creneau_debut` — heure de début de collecte (ex: "07:00")
- `creneau_fin` — heure de fin de collecte (ex: "12:00")
- `saisonnier` — booléen (true = actif juin→sept, volume +20%)

**Ce que le back doit faire :** Accepter ces champs dans `POST /clients` et les stocker. La géolocalisation (lat/lng) peut être calculée côté back via l'adresse ou laissée vide pour l'instant.

**Format envoyé par le front :**
```json
{
  "nom": "McDonald's Toulon Mayol",
  "categorie": "Fast-food",
  "adresse": "12 rue des Oliviers",
  "ville": "Toulon",
  "creneau_debut": "07:00",
  "creneau_fin": "12:00",
  "saisonnier": false
}
```

---

### PRIORITÉ 3 — Gestion des imprévus

**Page concernée :** Imprévus (`/imprevus`)

**Situation actuelle :** La page affiche 3 imprévus fictifs hardcodés. Elle est accessible depuis le bouton "Gérer les imprévus" dans Planning. Les boutons "Replanifier" et "Supprimer" retirent l'item de l'écran mais ne persistent rien.

**Ce que le back doit faire :** Créer deux routes :

**Route 1 — Lister les imprévus du jour :**
`GET /api/imprevus?date=YYYY-MM-DD`

Un imprévu = une tâche avec statut `erreur` pour la date donnée.

**Format attendu :**
```json
[
  {
    "tache_id": 5,
    "client_nom": "McDonald's Toulon Mayol",
    "adresse": "12 av. du Maréchal Foch",
    "ville": "Toulon",
    "chauffeur": "Marc Dubois",
    "raison": "Site inaccessible",
    "heure": "09:45"
  }
]
```

**Route 2 — Replanifier un imprévu :**
`POST /api/imprevus/<tache_id>/replanifier`

Remet le statut de la tâche à `en_attente` pour qu'elle soit reprise au prochain planning.

**Réponse attendue :**
```json
{ "message": "Tâche replanifiée" }
```

---

### PRIORITÉ 4 — Génération de tournées IA

**Page concernée :** Planning (bouton "Générer les tournées (IA)")

**Situation actuelle :** Le bouton affiche un spinner pendant 1,8 secondes puis un message "Génération IA disponible après intégration OR-Tools". OR-Tools est déjà implémenté dans `solveur_ortools.py` mais pas exposé.

**Ce que le back doit faire :** Exposer `POST /api/tournees/generer` qui lance le solveur et retourne le résultat.

**Format envoyé par le front :**
```json
{ "date": "2026-06-15" }
```

**Format attendu en retour :**
```json
{ "tournees_creees": 3, "arrets_total": 18 }
```

---

## Résumé — tableau des priorités

| # | Quoi | Route(s) | Effort estimé |
|---|---|---|---|
| 1 | Nom utilisateur au login | Modifier `POST /login` | 15 min |
| 1 | Clarifier valeurs du champ `role` | Modifier `POST /login` | 15 min |
| 2 | Vue planning admin | `GET /api/admin/planning` | 30 min (méthode existe) |
| 2 | Noms chauffeur/véhicule | Modifier `GET /api/chauffeur/<id>/tournee` | 30 min |
| 2 | Route conducteur fonctionnelle | Confirmer `user_id` = `chauffeur_id` | 0 min si déjà le cas |
| 3 | Enregistrement site | Étendre `POST /clients` | 45 min |
| 3 | Imprévus | `GET/POST /api/imprevus` | 1h |
| 4 | Génération IA | `POST /api/tournees/generer` | 2-3h |

---

## Ce que le front N'attend PAS du back

- Authentification par token (le front fait confiance au retour du login sans vérification de token pour l'instant)
- Pagination sur les listes
- Websockets ou temps réel (tout est par requête manuelle)
- Géolocalisation calculée (le front utilise les lat/lng déjà dans `/clients`)
