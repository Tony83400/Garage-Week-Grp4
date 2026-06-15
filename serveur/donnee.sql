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
    longitude REAL NOT NULL,
    adresse TEXT DEFAULT NULL,
    date_debut_contrat TEXT DEFAULT NULL,
    date_fin_contrat TEXT DEFAULT NULL
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
    commentaire TEXT DEFAULT NULL,
    type_imprevu TEXT DEFAULT NULL
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


INSERT INTO clients (nom_entreprise, latitude, longitude, adresse, date_debut_contrat, date_fin_contrat) VALUES
('Supermarché Port',       43.1200, 5.9300, 'Quai de la Sinse, 83000 Toulon',                          '2025-01-01', '2026-12-31'),
('Restaurant Plage',       43.1000, 5.8800, 'Boulevard Toussaint Merle, 83500 La Seyne-sur-Mer',        '2025-01-01', '2026-12-31'),
('Usine Tech',             43.1381, 5.9822, 'Zone Industrielle du Parc, 83160 La Valette-du-Var',       '2025-01-01', '2026-12-31'),
('Hôpital Sud',            43.1205, 6.1286, 'Allée des Marguerites, 83400 Hyères',                      '2024-01-01', '2027-12-31'),
('Lycée Campus',           43.1250, 6.0100, 'Route de Toulon, 83130 La Garde',                          '2025-01-01', '2026-12-31'),
('Centre Commercial',      43.0936, 5.8385, 'Avenue du Maréchal Juin, 83140 Six-Fours-les-Plages',      '2025-01-01', '2026-12-31'),
('Hôtel de la Baie',       43.1167, 5.8000, 'Quai du Port, 83110 Sanary-sur-Mer',                       '2025-01-01', '2026-12-31'),
('Boulangerie Matin',      43.1333, 5.7500, 'Rue de la République, 83150 Bandol',                       '2025-01-01', '2026-12-31'),
('Cinéma Central',         43.4000, 6.0500, 'Place du Général de Gaulle, 83170 Brignoles',              '2025-01-01', '2026-12-31'),
('Gare Routière',          43.5333, 6.4667, 'Avenue de Montferrat, 83300 Draguignan',                   '2025-01-01', '2026-12-31'),
('Camping Les Pins',       43.4333, 6.7333, 'Boulevard de la Mer, 83600 Fréjus',                        '2025-01-01', '2026-12-31'),
('Port de Plaisance',      43.2667, 6.6333, 'Quai Jean Jaurès, 83990 Saint-Tropez',                     '2025-01-01', '2026-12-31'),
('Marché Provençal',       43.3167, 6.6333, 'Avenue Charles de Gaulle, 83120 Sainte-Maxime',            '2025-01-01', '2026-12-31'),
('Entreprise Logistique',  43.3833, 6.3167, 'Zone Artisanale les Béguinières, 83340 Le Luc',            '2025-01-01', '2026-12-31'),
('Mairie Centrale',        43.2333, 6.0833, 'Place de la Mairie, 83390 Cuers',                          '2025-01-01', '2026-07-05'),
('Clinique Vallée',        43.1833, 6.0333, 'Avenue des Palmiers, 83210 Solliès-Pont',                  '2025-01-01', '2026-06-25'),
('Magasin Bio',            43.1500, 6.0833, 'Route de Pierrefeu, 83260 La Crau',                        '2025-01-01', '2026-06-20'),
('Pharmacie Littoral',     43.1000, 6.0167, 'Rue du Littoral, 83220 Le Pradet',                         '2025-01-01', '2026-05-01'),
('Bibliothèque Municipale',43.0833, 6.0833, 'Avenue de la Plage, 83320 Carqueiranne',                   '2024-01-01', '2027-12-31'),
('Musée d''Art',           43.1500, 6.3500, 'Route de la Vieille, 83230 Bormes-les-Mimosas',            '2025-06-01', '2026-06-01');


-- =============================================================================
-- 3. DISPONIBILITÉS ET TOURNÉES — Semaine du 16 au 20 juin 2026
-- =============================================================================

-- A. Disponibilités variées par client (tous les 20 sites, jours aléatoires)
--    Lun=1  Mar=2  Mer=3  Jeu=4  Ven=5
INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin, poids_prevu_kg) VALUES
-- Supermarché Port : Lun, Mer, Ven (grosses livraisons)
(1, 1, '06:30:00', '14:00:00', 250.0),
(1, 3, '06:30:00', '14:00:00', 270.0),
(1, 5, '07:00:00', '15:00:00', 230.0),
-- Restaurant Plage : Mar, Jeu (après rush week-end)
(2, 2, '07:00:00', '12:00:00', 120.0),
(2, 4, '07:00:00', '12:00:00', 110.0),
-- Usine Tech : tous les jours
(3, 1, '06:30:00', '16:00:00', 180.0),
(3, 2, '06:30:00', '16:00:00', 175.0),
(3, 3, '06:30:00', '16:00:00', 190.0),
(3, 4, '06:30:00', '16:00:00', 185.0),
(3, 5, '06:30:00', '16:00:00', 160.0),
-- Hôpital Sud : Lun, Mer, Ven
(4, 1, '06:00:00', '10:00:00', 300.0),
(4, 3, '06:00:00', '10:00:00', 310.0),
(4, 5, '06:00:00', '10:00:00', 290.0),
-- Lycée Campus : Mar, Jeu (rythme scolaire)
(5, 2, '07:30:00', '11:30:00', 150.0),
(5, 4, '07:30:00', '11:30:00', 140.0),
-- Centre Commercial : tous les jours
(6, 1, '07:00:00', '16:00:00', 200.0),
(6, 2, '07:00:00', '16:00:00', 210.0),
(6, 3, '07:00:00', '16:00:00', 195.0),
(6, 4, '07:00:00', '16:00:00', 205.0),
(6, 5, '07:00:00', '16:00:00', 220.0),
-- Hôtel de la Baie : Lun, Jeu (après week-end et milieu de semaine)
(7, 1, '08:00:00', '13:00:00', 90.0),
(7, 4, '08:00:00', '13:00:00', 95.0),
-- Boulangerie Matin : tous les jours, tôt
(8, 1, '06:30:00', '09:00:00', 60.0),
(8, 2, '06:30:00', '09:00:00', 55.0),
(8, 3, '06:30:00', '09:00:00', 65.0),
(8, 4, '06:30:00', '09:00:00', 58.0),
(8, 5, '06:30:00', '09:00:00', 70.0),
-- Cinéma Central : Mer, Ven (après séances)
(9, 3, '10:00:00', '15:00:00', 45.0),
(9, 5, '10:00:00', '15:00:00', 50.0),
-- Gare Routière : Lun, Mer, Ven
(10, 1, '07:00:00', '14:00:00', 75.0),
(10, 3, '07:00:00', '14:00:00', 80.0),
(10, 5, '07:00:00', '14:00:00', 72.0),
-- Camping Les Pins : Mar, Jeu (saisonnier)
(11, 2, '08:00:00', '14:00:00', 110.0),
(11, 4, '08:00:00', '14:00:00', 125.0),
-- Port de Plaisance : Lun, Ven
(12, 1, '07:30:00', '13:00:00', 130.0),
(12, 5, '07:30:00', '13:00:00', 145.0),
-- Marché Provençal : Mer uniquement (jour de marché)
(13, 3, '06:00:00', '11:00:00', 220.0),
-- Entreprise Logistique : tous les jours
(14, 1, '06:30:00', '16:00:00', 85.0),
(14, 2, '06:30:00', '16:00:00', 90.0),
(14, 3, '06:30:00', '16:00:00', 88.0),
(14, 4, '06:30:00', '16:00:00', 82.0),
(14, 5, '06:30:00', '16:00:00', 92.0),
-- Mairie Centrale : Jeu uniquement (ramassage hebdo)
(15, 4, '09:00:00', '14:00:00', 95.0),
-- Clinique Vallée : Lun, Mar, Mer, Jeu, Ven
(16, 1, '06:30:00', '15:00:00', 140.0),
(16, 2, '06:30:00', '15:00:00', 135.0),
(16, 3, '06:30:00', '15:00:00', 145.0),
(16, 4, '06:30:00', '15:00:00', 138.0),
(16, 5, '06:30:00', '15:00:00', 142.0),
-- Magasin Bio : Mer, Ven
(17, 3, '08:00:00', '14:00:00', 70.0),
(17, 5, '08:00:00', '14:00:00', 75.0),
-- Pharmacie Littoral : Mar, Jeu
(18, 2, '09:00:00', '15:00:00', 55.0),
(18, 4, '09:00:00', '15:00:00', 50.0),
-- Bibliothèque Municipale : Lun uniquement
(19, 1, '09:00:00', '13:00:00', 40.0),
-- Musée d'Art : Ven + Sam + Dim (tourisme)
(20, 5, '10:00:00', '16:00:00', 65.0),
(20, 6, '10:00:00', '16:00:00', 80.0),
(20, 7, '11:00:00', '17:00:00', 70.0),
-- Week-end : clients ouverts Sam (6) et/ou Dim (7)
-- Restaurant Plage : peak week-end
(2, 6, '07:00:00', '13:00:00', 160.0),
(2, 7, '08:00:00', '13:00:00', 140.0),
-- Hôtel de la Baie : plein le week-end
(7, 6, '07:00:00', '14:00:00', 130.0),
(7, 7, '08:00:00', '14:00:00', 120.0),
-- Camping Les Pins : haute saison sam+dim
(11, 6, '07:00:00', '14:00:00', 180.0),
(11, 7, '08:00:00', '14:00:00', 165.0),
-- Port de Plaisance : samedi très chargé
(12, 6, '07:00:00', '13:00:00', 200.0),
-- Centre Commercial : samedi = gros jour
(6, 6, '07:00:00', '16:00:00', 280.0),
-- Marché Provençal : samedi = jour principal
(13, 6, '05:30:00', '11:00:00', 320.0),
-- Cinéma Central : samedi soir
(9, 6, '10:00:00', '16:00:00', 60.0);

-- B. Tournées du sam 13/06 au sam 20/06/2026
--    Lun-Ven : Jean (id=1) + Alice (id=2)
--    Sam     : Jean uniquement (service réduit)
--    Dim     : Alice uniquement (service réduit)
INSERT INTO tournees_jour (date_tournee, chauffeur_id, camion_id, heure_debut_service, heure_fin_service, statut) VALUES
-- Sam 13 juin
('2026-06-13', 1, 1, '06:30:00', '14:00:00', 'brouillon'),
-- Dim 14 juin
('2026-06-14', 2, 2, '07:00:00', '14:00:00', 'brouillon'),
-- Lun 15 juin
('2026-06-15', 1, 1, '06:30:00', '16:00:00', 'brouillon'),
('2026-06-15', 2, 2, '06:30:00', '16:00:00', 'brouillon'),
-- Mar 16 juin
('2026-06-16', 1, 1, '06:30:00', '16:00:00', 'brouillon'),
('2026-06-16', 2, 2, '06:30:00', '16:00:00', 'brouillon'),
-- Mer 17 juin
('2026-06-17', 1, 1, '06:30:00', '16:00:00', 'brouillon'),
('2026-06-17', 2, 2, '06:30:00', '16:00:00', 'brouillon'),
-- Jeu 18 juin
('2026-06-18', 1, 1, '06:30:00', '16:00:00', 'brouillon'),
('2026-06-18', 2, 2, '06:30:00', '16:00:00', 'brouillon'),
-- Ven 19 juin
('2026-06-19', 1, 1, '06:30:00', '16:00:00', 'brouillon'),
('2026-06-19', 2, 2, '06:30:00', '16:00:00', 'brouillon'),
-- Sam 20 juin
('2026-06-20', 1, 1, '06:30:00', '14:00:00', 'brouillon');

-- C. AUCUNE TÂCHE N'EST INSÉRÉE — créées par le bouton "Générer les tournées (IA)"