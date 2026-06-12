-- =============================================================================
-- SCRIPT D'INITIALISATION : BASE DE DONNÉES LOGISTIQUE (VERSION SQLITE)
-- Dépôt : La Farlède (Var, 83) - 20 Points de Collecte
-- =============================================================================

PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS taches_collecte;
DROP TABLE IF EXISTS tournees_jour;
DROP TABLE IF EXISTS exceptions_calendrier_clients;
DROP TABLE IF EXISTS disponibilites_clients;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS camions;
DROP TABLE IF EXISTS chauffeurs;
DROP TABLE IF EXISTS utilisateurs;
DROP TABLE IF EXISTS depots;
PRAGMA foreign_keys = ON;

-- =============================================================================
-- 1. CRÉATION DES TABLES
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

CREATE TABLE disponibilites_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    jour_semaine INTEGER NOT NULL CHECK (jour_semaine BETWEEN 1 AND 7),
    heure_debut TEXT NOT NULL,
    heure_fin TEXT NOT NULL,
    poids_prevu_kg REAL DEFAULT 100.0,
    CHECK (heure_debut < heure_fin)
);

CREATE TABLE exceptions_calendrier_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date_exception TEXT NOT NULL,
    est_ferme BOOLEAN DEFAULT 1
);

CREATE TABLE depots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
);

CREATE TABLE tournees_jour (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_tournee TEXT NOT NULL,
    chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
    camion_id INTEGER NOT NULL REFERENCES camions(id) ON DELETE CASCADE,
    depot_id INTEGER NOT NULL DEFAULT 1 REFERENCES depots(id),
    heure_debut_service TEXT NOT NULL,
    heure_fin_service TEXT NOT NULL,
    distance_km REAL DEFAULT 0,
    statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'affectee', 'demarree', 'terminee'))
);

CREATE TABLE taches_collecte (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournee_id INTEGER REFERENCES tournees_jour(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    type_tache TEXT DEFAULT 'collecte' CHECK (type_tache IN ('collecte', 'vidage_depot')),
    date_planifiee DATE NOT NULL,
    ordre_passage INTEGER DEFAULT NULL,
    heure_estimee TEXT DEFAULT NULL,
    bacs_prevus INTEGER DEFAULT 0,
    poids_prevu_kg REAL DEFAULT 0,
    duree_estimee_min INTEGER DEFAULT 15,
    bacs_reels INTEGER DEFAULT NULL,
    statut TEXT DEFAULT 'en_attente', 
    commentaire TEXT DEFAULT NULL
);

-- =============================================================================
-- 2. INSERTION DES DONNÉES DE BASE (DÉPÔT, PERSONNEL, FLOTTE, CLIENTS)
-- =============================================================================

INSERT INTO depots (nom, latitude, longitude) VALUES 
('Dépôt La Farlède', 43.1389, 6.0222);

INSERT INTO utilisateurs (email, mot_de_passe, role) VALUES 
('admin@logistic.fr', '1234', 'admin'),
('jean@logistic.fr', '1234', 'chauffeur'),
('alice@logistic.fr', '1234', 'chauffeur'),
('paul@logistic.fr', '1234', 'chauffeur'),
('marie@logistic.fr', '1234', 'chauffeur'),
('luc@logistic.fr', '1234', 'chauffeur');

INSERT INTO chauffeurs (utilisateur_id, nom, prenom, telephone) VALUES 
(2, 'Dupont', 'Jean', '0601000000'),
(3, 'Martin', 'Alice', '0602000000');


INSERT INTO camions (immatriculation, charge_max_kg, bacs_max) VALUES 
('AB-123-CD', 1500, 20),
('EF-456-GH', 1000, 15);


INSERT INTO clients (nom_entreprise, latitude, longitude) VALUES 
('Supermarché Port', 43.1200, 5.9300),      -- 1 (Toulon)
('Restaurant Plage', 43.1000, 5.8800),      -- 2 (La Seyne-sur-Mer)
('Usine Tech', 43.1381, 5.9822),            -- 3 (La Valette-du-Var)
('Hôpital Sud', 43.1205, 6.1286),           -- 4 (Hyères)
('Lycée Campus', 43.1250, 6.0100),          -- 5 (La Garde)
('Centre Commercial', 43.0936, 5.8385),     -- 6 (Six-Fours-les-Plages)
('Hôtel de la Baie', 43.1167, 5.8000),      -- 7 (Sanary-sur-Mer)
('Boulangerie Matin', 43.1333, 5.7500),     -- 8 (Bandol)
('Cinéma Central', 43.4000, 6.0500),        -- 9 (Brignoles)
('Gare Routière', 43.5333, 6.4667),         -- 10 (Draguignan)
('Camping Les Pins', 43.4333, 6.7333),      -- 11 (Fréjus)
('Port de Plaisance', 43.2667, 6.6333),     -- 12 (Saint-Tropez)
('Marché Provençal', 43.3167, 6.6333),      -- 13 (Sainte-Maxime)
('Entreprise Logistique', 43.3833, 6.3167), -- 14 (Le Luc)
('Mairie Centrale', 43.2333, 6.0833),       -- 15 (Cuers)
('Clinique Vallée', 43.1833, 6.0333),       -- 16 (Solliès-Pont)
('Magasin Bio', 43.1500, 6.0833),           -- 17 (La Crau)
('Pharmacie Littoral', 43.1000, 6.0167),    -- 18 (Le Pradet)
('Bibliothèque Municipale', 43.0833, 6.0833),-- 19 (Carqueiranne)
('Musée d''Art', 43.1500, 6.3500);          -- 20 (Bormes-les-Mimosas)


-- =============================================================================
-- 3. CONFIGURATION PARFAITE POUR LE TEST IA (Jour 5 - Vendredi)
-- =============================================================================

-- A. Les clients ouverts le vendredi (Disponibilité de 3h à 16h)
INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin, poids_prevu_kg) VALUES
(1, 5, '03:00:00', '16:00:00', 250.5),
(2, 5, '03:00:00', '16:00:00', 120.0),
(3, 5, '03:00:00', '16:00:00', 180.0),
(4, 5, '03:00:00', '16:00:00', 300.0),
(5, 5, '03:00:00', '16:00:00', 150.0),
(6, 5, '03:00:00', '16:00:00', 200.0),
(7, 5, '03:00:00', '16:00:00', 90.0),
(8, 5, '03:00:00', '16:00:00', 60.0),
(9, 5, '03:00:00', '16:00:00', 45.0),
(10, 5, '03:00:00', '16:00:00', 75.0);

-- B. Les plannings de travail des chauffeurs (Où l'IA va répartir les tâches)
-- On affecte 2 camions en service de 3h00 à 16h00 sans interruption.
INSERT INTO tournees_jour (date_tournee, chauffeur_id, camion_id, heure_debut_service, heure_fin_service, statut) VALUES
('2026-06-12', 1, 1, '03:00:00', '16:00:00', 'brouillon'),
('2026-06-12', 2, 2, '03:00:00', '16:00:00', 'brouillon');

-- C. AUCUNE TÂCHE N'EST INSÉRÉE (La table taches_collecte reste vide). 
-- C'est le clic sur le bouton "Générer les tournées (IA)" qui va les créer !