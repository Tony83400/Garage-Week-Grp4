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
-- JEU DE DONNÉES DE TEST : SIMULATION OR-TOOLS (VRPTW)
-- Date de simulation : Lundi 15 Juin 2026
-- =============================================================================

-- 1. CRÉATION DU PERSONNEL (3 Chauffeurs)
INSERT INTO utilisateurs (email, mot_de_passe, role) VALUES 
('jean@logistic.fr', '1234', 'chauffeur'),
('alice@logistic.fr', '1234', 'chauffeur'),
('paul@logistic.fr', '1234', 'chauffeur');

INSERT INTO chauffeurs (utilisateur_id, nom, prenom, telephone) VALUES 
(1, 'Dupont', 'Jean', '0601000000'),
(2, 'Martin', 'Alice', '0602000000'),
(3, 'Bernard', 'Paul', '0603000000');

-- 2. CRÉATION DE LA FLOTTE (3 Camions avec capacités différentes)
INSERT INTO camions (immatriculation, charge_max_kg, bacs_max) VALUES 
('AB-123-CD', 1500, 20), -- Camion standard
('EF-456-GH', 1000, 15), -- Petit camion
('IJ-789-KL', 2000, 25); -- Gros porteur

-- 3. CRÉATION DES CLIENTS (10 clients répartis autour de l'agglomération)
INSERT INTO clients (nom_entreprise, latitude, longitude) VALUES 
('Supermarché Port', 43.1200, 5.9300),      -- 1 (Toulon Centre)
('Restaurant Plage', 43.1000, 5.9000),      -- 2 (Mourillon)
('Usine Tech', 43.1400, 5.9500),            -- 3 (La Valette)
('Hôpital Sainte-Marie', 43.1300, 5.9100),  -- 4 (Toulon Nord)
('Lycée Lumière', 43.1100, 5.8800),         -- 5 (La Seyne)
('Centre Commercial', 43.1250, 6.0100),     -- 6 (La Garde)
('Hôtel de la Baie', 43.1205, 6.1286),      -- 7 (Hyères)
('Boulangerie Matin', 43.1396, 5.8474),     -- 8 (Ollioules)
('Cinéma Central', 43.1242, 5.9280),        -- 9 (Toulon Centre)
('Gare Routière', 43.1280, 5.9250);         -- 10 (Toulon Centre)

-- 4. CONTRAINTES HORAIRES POUR LE LUNDI (jour_semaine = 1)
-- C'est ici que l'algorithme va transpirer !
INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin) VALUES 
(1, 1, '06:00:00', '12:00:00'), -- Supermarché : Matin uniquement
(2, 1, '14:00:00', '18:00:00'), -- Restaurant : Après-midi uniquement
(3, 1, '08:00:00', '17:00:00'), -- Usine : Journée complète
(4, 1, '08:00:00', '10:00:00'), -- Hôpital : Fenêtre très stricte (priorité absolue)
(5, 1, '07:00:00', '16:00:00'), -- Lycée : Avant la sortie des classes
(6, 1, '09:00:00', '20:00:00'), -- Centre commercial : Très flexible
(7, 1, '10:00:00', '14:00:00'), -- Hôtel : Milieu de journée
(8, 1, '05:00:00', '11:00:00'), -- Boulangerie : Très tôt le matin
(9, 1, '09:00:00', '12:00:00'), -- Cinéma : Matin
(10, 1, '00:00:00', '23:59:00');-- Gare : Ouvert 24/24

-- 5. PLANIFICATION POUR LE 15 JUIN 2026
-- Création des 3 tournées vides (Les chauffeurs sont prêts, les camions assignés)
INSERT INTO tournees_jour (date_tournee, chauffeur_id, camion_id, statut) VALUES 
('2026-06-15', 1, 1, 'brouillon'),
('2026-06-15', 2, 2, 'brouillon'),
('2026-06-15', 3, 3, 'brouillon');

-- Création des demandes de collecte (Total = 38 bacs à répartir dans les 60 places de la flotte)
-- On ne met pas de tournee_id, c'est OR-Tools qui va faire des UPDATE sur ces lignes !
INSERT INTO taches_collecte (client_id, date_planifiee, bacs_prevus, statut) VALUES 
(1, '2026-06-15', 6, 'en_attente'),
(2, '2026-06-15', 3, 'en_attente'),
(3, '2026-06-15', 10, 'en_attente'), -- L'usine prend beaucoup de place
(4, '2026-06-15', 4, 'en_attente'),
(5, '2026-06-15', 5, 'en_attente'),
(6, '2026-06-15', 2, 'en_attente'),
(7, '2026-06-15', 1, 'en_attente'),
(8, '2026-06-15', 2, 'en_attente'),
(9, '2026-06-15', 3, 'en_attente'),
(10, '2026-06-15', 2, 'en_attente');