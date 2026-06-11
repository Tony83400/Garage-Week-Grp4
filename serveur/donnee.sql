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
PRAGMA foreign_keys = ON;

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
    CHECK (heure_debut < heure_fin)
);

CREATE TABLE exceptions_calendrier_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date_exception TEXT NOT NULL,
    est_ferme BOOLEAN DEFAULT 1
);

CREATE TABLE tournees_jour (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_tournee TEXT NOT NULL,
    chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
    camion_id INTEGER NOT NULL REFERENCES camions(id) ON DELETE CASCADE,
    statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'affectee', 'demarree', 'terminee'))
);

CREATE TABLE taches_collecte (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    tournee_id INTEGER REFERENCES tournees_jour(id) ON DELETE SET NULL, 
    date_planifiee TEXT NOT NULL,
    bacs_prevus INTEGER NOT NULL,
    bacs_reels INTEGER,
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'terminee', 'annulee', 'echec_client_absent'))
);


-- =============================================================================
-- JEU DE DONNÉES DE TEST : DÉPARTEMENT DU VAR (83)
-- =============================================================================

-- 1. CRÉATION DU PERSONNEL (5 Chauffeurs)
INSERT INTO utilisateurs (email, mot_de_passe, role) VALUES 
('jean@logistic.fr', '1234', 'chauffeur'),
('alice@logistic.fr', '1234', 'chauffeur'),
('paul@logistic.fr', '1234', 'chauffeur'),
('marie@logistic.fr', '1234', 'chauffeur'),
('luc@logistic.fr', '1234', 'chauffeur');

INSERT INTO chauffeurs (utilisateur_id, nom, prenom, telephone) VALUES 
(1, 'Dupont', 'Jean', '0601000000'),
(2, 'Martin', 'Alice', '0602000000'),
(3, 'Bernard', 'Paul', '0603000000'),
(4, 'Lefevre', 'Marie', '0604000000'),
(5, 'Durand', 'Luc', '0605000000');

-- 2. CRÉATION DE LA FLOTTE (5 Camions pour couvrir le Var)
INSERT INTO camions (immatriculation, charge_max_kg, bacs_max) VALUES 
('AB-123-CD', 1500, 20),
('EF-456-GH', 1000, 15),
('IJ-789-KL', 2000, 25),
('MN-012-OP', 1500, 20),
('QR-345-ST', 2000, 25);

-- 3. CRÉATION DES CLIENTS (20 points répartis dans le 83)
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

-- 4. CONTRAINTES HORAIRES POUR LE LUNDI
-- Des créneaux plus larges pour prendre en compte les longs trajets (Fréjus, Draguignan...)
INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin) VALUES 
(1, 1, '06:00:00', '14:00:00'),
(2, 1, '10:00:00', '18:00:00'),
(3, 1, '08:00:00', '17:00:00'),
(4, 1, '06:00:00', '12:00:00'),
(5, 1, '07:00:00', '16:00:00'),
(6, 1, '09:00:00', '20:00:00'),
(7, 1, '10:00:00', '16:00:00'),
(8, 1, '05:00:00', '13:00:00'),
(9, 1, '09:00:00', '18:00:00'),
(10, 1, '00:00:00', '23:59:00'),
(11, 1, '08:00:00', '18:00:00'),
(12, 1, '06:00:00', '14:00:00'),
(13, 1, '08:00:00', '15:00:00'),
(14, 1, '09:00:00', '17:00:00'),
(15, 1, '08:00:00', '12:00:00'),
(16, 1, '06:00:00', '14:00:00'),
(17, 1, '09:00:00', '19:00:00'),
(18, 1, '08:00:00', '18:00:00'),
(19, 1, '10:00:00', '17:00:00'),
(20, 1, '09:00:00', '16:00:00');

-- 5. PLANIFICATION POUR LE 15 JUIN 2026
INSERT INTO tournees_jour (date_tournee, chauffeur_id, camion_id, statut) VALUES 
('2026-06-15', 1, 1, 'brouillon'),
('2026-06-15', 2, 2, 'brouillon'),
('2026-06-15', 3, 3, 'brouillon'),
('2026-06-15', 4, 4, 'brouillon'),
('2026-06-15', 5, 5, 'brouillon');

INSERT INTO taches_collecte (client_id, date_planifiee, bacs_prevus, statut) VALUES 
(1, '2026-06-15', 4, 'en_attente'),
(2, '2026-06-15', 3, 'en_attente'),
(3, '2026-06-15', 8, 'en_attente'), 
(4, '2026-06-15', 4, 'en_attente'),
(5, '2026-06-15', 5, 'en_attente'),
(6, '2026-06-15', 2, 'en_attente'),
(7, '2026-06-15', 2, 'en_attente'),
(8, '2026-06-15', 2, 'en_attente'),
(9, '2026-06-15', 5, 'en_attente'),
(10, '2026-06-15', 3, 'en_attente'),
(11, '2026-06-15', 6, 'en_attente'),
(12, '2026-06-15', 4, 'en_attente'),
(13, '2026-06-15', 3, 'en_attente'),
(14, '2026-06-15', 7, 'en_attente'),
(15, '2026-06-15', 2, 'en_attente'),
(16, '2026-06-15', 3, 'en_attente'),
(17, '2026-06-15', 2, 'en_attente'),
(18, '2026-06-15', 1, 'en_attente'),
(19, '2026-06-15', 1, 'en_attente'),
(20, '2026-06-15', 2, 'en_attente');