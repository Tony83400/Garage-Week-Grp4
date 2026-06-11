-- =============================================================================
-- SCRIPT D'INITIALISATION : BASE DE DONNÉES LOGISTIQUE (VERSION SQLITE)
-- =============================================================================

-- 1. NETTOYAGE DES ANCIENNES TABLES (Pour pouvoir réinitialiser proprement)
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS taches_collecte;
DROP TABLE IF EXISTS tournees_jour;
DROP TABLE IF EXISTS exceptions_calendrier_clients;
DROP TABLE IF EXISTS disponibilites_clients;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS camions;
DROP TABLE IF EXISTS chauffeurs;
DROP TABLE IF EXISTS utilisateurs;
PRAGMA foreign_keys = ON;

-- =============================================================================
-- 2. TABLES FONDAMENTALES (ENTITÉS)
-- =============================================================================

CREATE TABLE utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'chauffeur'))
);

CREATE TABLE chauffeurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT
);

CREATE TABLE camions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    immatriculation TEXT UNIQUE NOT NULL,
    charge_max_kg INTEGER NOT NULL,
    bacs_max INTEGER NOT NULL
);

CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_entreprise TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
);

-- =============================================================================
-- 3. TABLES DES DISPONIBILITÉS (CONTRAINTES HORAIRES)
-- =============================================================================

CREATE TABLE disponibilites_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    jour_semaine INTEGER NOT NULL CHECK (jour_semaine BETWEEN 1 AND 7),
    heure_debut TEXT NOT NULL, -- Format 'HH:MM:SS'
    heure_fin TEXT NOT NULL,
    CHECK (heure_debut < heure_fin)
);

CREATE TABLE exceptions_calendrier_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date_exception TEXT NOT NULL, -- Format 'YYYY-MM-DD'
    est_ferme BOOLEAN DEFAULT 1
);

-- =============================================================================
-- 4. TABLES OPÉRATIONNELLES (LE TERRAIN)
-- =============================================================================

-- La tournée de la journée : affectation d'un camion et d'un chauffeur
CREATE TABLE tournees_jour (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_tournee TEXT NOT NULL,          -- Format 'YYYY-MM-DD'
    chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
    camion_id INTEGER NOT NULL REFERENCES camions(id) ON DELETE CASCADE,
    statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'affectee', 'demarree', 'terminee'))
);

-- La mission de collecte : ce que le chauffeur doit faire (prévu) et ce qu'il fait (réel)
CREATE TABLE taches_collecte (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    tournee_id INTEGER REFERENCES tournees_jour(id) ON DELETE SET NULL, 
    date_planifiee TEXT NOT NULL,        -- Format 'YYYY-MM-DD'
    bacs_prevus INTEGER NOT NULL,
    bacs_reels INTEGER,                  -- Sera rempli par le chauffeur sur le terrain
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'terminee', 'annulee', 'echec_client_absent'))
);

-- =============================================================================
-- 5. JEU DE DONNÉES DE TEST (SIMULATION D'UNE JOURNÉE)
-- =============================================================================

-- Création du personnel et de la flotte
INSERT INTO utilisateurs (email, mot_de_passe, role) VALUES ('jean@logistic.fr', '1234', 'chauffeur');
INSERT INTO chauffeurs (utilisateur_id, nom, prenom, telephone) VALUES (1, 'Dupont', 'Jean', '0600000000');
INSERT INTO camions (immatriculation, charge_max_kg, bacs_max) VALUES ('AB-123-CD', 1500, 20);

-- Création des clients et de leurs horaires
INSERT INTO clients (nom_entreprise, latitude, longitude) VALUES ('Supermarché Nord', 48.8566, 2.3522);
INSERT INTO clients (nom_entreprise, latitude, longitude) VALUES ('Restaurant Le Sud', 48.8466, 2.3422);

-- Dispo : Le supermarché est ouvert le Lundi (1) de 08h à 12h
INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin) VALUES (1, 1, '08:00:00', '12:00:00');

-- PLANIFICATION DE LA JOURNÉE DU 2026-06-15
-- 1. On crée la tournée et on affecte Jean au camion AB-123-CD
INSERT INTO tournees_jour (date_tournee, chauffeur_id, camion_id, statut) VALUES ('2026-06-15', 1, 1, 'affectee');

-- 2. On affecte les tâches à cette tournée (tournee_id = 1)
-- Le supermarché doit donner 5 bacs
INSERT INTO taches_collecte (client_id, tournee_id, date_planifiee, bacs_prevus, statut) 
VALUES (1, 1, '2026-06-15', 5, 'en_attente');

-- Le restaurant doit donner 2 bacs
INSERT INTO taches_collecte (client_id, tournee_id, date_planifiee, bacs_prevus, statut) 
VALUES (2, 1, '2026-06-15', 2, 'en_attente');