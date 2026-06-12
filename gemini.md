# 🧠 Contexte Projet : App Logistique Biodéchets (Var - 83)
*Fichier de contexte pour l'assistant IA (Gemini). À lire avant toute intervention sur le code.*

## 🎯 Objectif du Projet
Application de planification, d'optimisation (IA) et de suivi des tournées de collecte de biodéchets.
Le dépôt central est situé à **La Farlède (83)**. 

## 🛠️ Stack Technique
*   **Frontend :** React Native / Expo (TypeScript) - Web & Mobile.
*   **Backend :** Python (Flask).
*   **Base de Données :** SQLite (`ma_base.db`). Accès géré via `DatabaseManager` et `TourneeRepository`.
*   **Moteur IA :** Google OR-Tools (VRP - Vehicle Routing Problem avec Time Windows et Capacités).
*   **Routing / Cartographie :** API OSRM (Open Source Routing Machine).

---

## 🗄️ Schéma de Base de Données (SQLite)
*Initialisation via `serveur/donnee.sql`.*
*   `utilisateurs`, `chauffeurs`, `camions`, `clients`, `depots`.
*   `disponibilites_clients` : Jours (1-7) et heures d'ouverture.
*   `exceptions_calendrier_clients` : Jours de fermeture exceptionnels.
*   `tournees_jour` : Représente le *shift* d'un chauffeur avec un camion donné pour une date (`statut`: brouillon, affectee, demarree, terminee).
*   `taches_collecte` : Unité de travail liée à un client et à une tournée (`statut`: en_attente, planifiee, terminee, erreur). Contient `bacs_prevus` et `poids_prevu_kg`.

---

## 🧠 Moteur d'Optimisation (Google OR-Tools)
*Fichier clé : `serveur/solveur_ortools.py`*

**Règles de survie et correctifs critiques appliqués :**
1.  **Typage Strict (C++) :** OR-Tools n'accepte QUE des entiers (`int`). Les poids (`poids_prevu_kg`) issus de la BDD (SQLite `REAL`) sont castés en `int` lors des callbacks de capacité.
2.  **Mode Anti-Crash (OSRM vs OR-Tools) :** OSRM renvoie parfois des matrices en secondes ou mètres avec de très grandes valeurs. Si la valeur `val > 500`, elle est divisée par 60 pour la ramener en minutes.
3.  **Flexibilité de l'IA (Drop Penalty) :** Pour éviter l'erreur `Aucune solution n'a pu être trouvée`, on utilise `routing.AddDisjunction([node], penalite)` sur tous les points. L'IA a le droit d'ignorer un point impossible sans faire crasher le solveur.
4.  **Amplitudes Horaires (Time Windows) :** La dimension `Time` a un slack très large (2880) et un plafond infini (100000) pour éviter les blocages de fenêtres de tir trop strictes.

---

## ⚙️ Logique Backend & Pièges Résolus
*Fichier clé : `serveur/database/repo_tournees.py`*

*   **Extraction des données (`preparer_donnees_ortools`) :** On crée **1 véhicule virtuel OR-Tools = 1 ligne dans `tournees_jour`**. Pas de duplication artificielle, sinon l'IA "oublie" les chauffeurs suivants.
*   **Sauvegarde des tournées (`sauvegarder_resultat_optimisation`) :** 
    *   Alignement strict : L'ID du véhicule OR-Tools correspond exactement à l'index du tableau `tournees_reelles_ids` récupéré en BDD.
    *   Sécurité anti-clonage : Utilisation d'un `set()` (`taches_deja_assignees`) pour garantir qu'une tâche n'est jamais affectée à deux camions différents, évitant ainsi le "Produit Cartésien".
*   **Récupération pour le Front (`get_tournees_detaillees`) :** Toujours filtrer par `tournee_id` pour éviter que le backend ne renvoie toutes les tâches de la journée à tous les chauffeurs.

---

## 📱 Structure Frontend (React Native / Expo)
*   `app/planning.tsx` (Vue Admin) : Dashboard + Carte interactive. Déclenche `/api/planning/generer` puis `/api/planning/optimiser`.
    *   *Attention :* Toujours utiliser des clés React composites uniques (ex: `key={'vehicle-card-${v.chauffeurId}-${i}'}`) lors du rendu des tableaux de tournées.
*   `app/driver.tsx` (Vue Chauffeur) : Visualisation de l'itinéraire, validation des bacs réels, mise à jour des statuts (`terminee`, `erreur`).
*   `app/imprevus.tsx` : Gestion des tâches en statut `erreur`.

---

## 🔄 Protocole de Test Rapide
Pour tester l'algorithme :
1.  S'assurer que `serveur/donnee.sql` contient un jeu de données valide (ex: 20 points, 2 à 4 shifts de chauffeurs).
2.  Relancer l'API Flask avec `reset_db=True` dans `main.py` pour vider et repeupler la BDD.
3.  Cliquer sur **Générer les tournées (IA)** dans le Front-end.

---

## 🤖 Instructions Directives pour Gemini
Si je te demande de corriger un bug ou d'ajouter une *feature* :
1.  **Référence-toi toujours à ce fichier.**
2.  Ne suggère **jamais** de repasser les valeurs OR-Tools en `float`.
3.  Si le JSON renvoie des doublons, vérifie immédiatement les requêtes SQL avec des `JOIN` dans `repo_tournees.py`.
4.  Si l'optimisation crash en erreur 500, le problème vient à 99% du cast en entier dans les callbacks ou des `Time Windows` trop étriquées.