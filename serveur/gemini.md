# Architecture de l'Application de Logistique et Planification de Tournées

## 1. Objectif du Projet
L'objectif de cette application est de résoudre un problème d'optimisation complexe connu sous le nom de **VRPTW (Vehicle Routing Problem with Time Windows)**, combiné à une logique de **Multi-Trip**. 

L'application permet d'optimiser les parcours de collecte (environ 30 clients/jour) pour une flotte de véhicules, en respectant des contraintes strictes :
* **Capacité des véhicules :** Limite de charge (kg) et de volume (nombre de bacs).
* **Fenêtres horaires :** Heures d'ouverture et de fermeture spécifiques pour chaque client.
* **Flotte restreinte :** Gestion de plusieurs tournées successives par camion dans une même journée.
* **Réalité du terrain :** Comparaison entre le volume prévisionnel et le volume réellement collecté par le chauffeur.

---

## 2. Stack Technique
* **Back-end & Logique Métier :** Python 3
* **Moteur d'Optimisation :** Google OR-Tools (Métaheuristique de Recherche Locale Guidée)
* **Base de données :** SQLite (via le module `sqlite3` de Python)
* **Interface (Prévue) :** API pour communiquer avec une application mobile (chauffeurs) et un tableau de bord (administration).

---

## 3. Architecture de la Base de Données
Le schéma relationnel (SQL) sépare strictement les entités physiques, les contraintes temporelles et les opérations quotidiennes.

### A. Les Entités (Données Statiques)
* `utilisateurs` : Gestion des accès (rôles `admin` et `chauffeur`).
* `chauffeurs` : Profils des conducteurs, liés à un utilisateur.
* `camions` : Flotte physique avec leurs capacités maximales (`charge_max_kg`, `bacs_max`).
* `clients` : Coordonnées géographiques fixes (`latitude`, `longitude`).

### B. Les Contraintes (Données Temporelles)
* `disponibilites_clients` : Semainier récurrent des fenêtres horaires de chaque client (ex: Lundi, 08h-12h).
* `exceptions_calendrier_clients` : Gestion des jours de fermeture exceptionnels (ex: jours fériés).

### C. Le Terrain (Opérations Quotidiennes)
* `tournees_jour` : L'affectation d'un couple `(Chauffeur + Camion)` pour une date précise.
* `taches_collecte` : Les arrêts à effectuer. Cette table est cruciale car elle lie un client à une tournée, et permet de confronter le **Prévu** (`bacs_prevus`) au **Réel** (`bacs_reels` saisis par le chauffeur).

---

## 4. Le Moteur d'Optimisation (Google OR-Tools)
Au lieu d'utiliser une simple heuristique géographique ("plus proche voisin" qui échoue avec les contraintes horaires), l'application s'appuie sur le *Routing Model* de Google.

**Stratégie de résolution :**
1. **Véhicules virtuels :** Pour simuler le "Multi-Trip" (un camion faisant 3 tournées dans la journée), le solveur modélise N camions virtuels qui sont ensuite regroupés physiquement.
2. **Dimensions :** Le solveur accumule la charge et le temps de service (fixé à 15 min par arrêt) le long du trajet pour garantir qu'aucune capacité ni fenêtre horaire n'est violée.
3. **Optimisation locale :** Le solveur teste des milliers de permutations de trajets (Recherche Locale) pour trouver le chemin minimisant la distance totale.

---

## 5. Flux Opérationnel (Cycle de vie d'une journée)

L'application est pensée pour suivre ce cycle en trois étapes :

### Étape 1 : La Planification (Serveur)
* Le système génère les besoins de collecte du jour (les `taches_collecte`) en fonction des disponibilités des clients.
* L'algorithme Google OR-Tools s'exécute pour trouver le chemin optimal et crée les `tournees_jour`.

### Étape 2 : L'Exécution (Chauffeur sur le terrain)
* Le chauffeur se connecte et récupère sa feuille de route (camion assigné, liste ordonnée des clients).
* À chaque arrêt, l'application métier appelle la méthode `valider_collecte(tache_id, bacs_reels)`.

### Étape 3 : Le Réajustement et le Suivi
* La base de données est mise à jour en temps réel.
* L'administration peut voir les écarts entre les volumes prévus et collectés, permettant de réagir en direct (ex: un camion a plus de place que prévu pour absorber une urgence).

---

## 6. Structure du Code Python (Core)
* `structure.sql` : Fichier maître contenant la définition des tables et le jeu de données initial, exécutable en un bloc.
* `client.py` : Modèle Objet représentant l'entité géographique (avec méthode d'export `to_dict()` pour l'API).
* `database_manager.py` : Interface sécurisée entre l'application Python et SQLite (exécution du script SQL, requêtes de planification, et remontées terrain).