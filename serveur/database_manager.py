import sqlite3
import os
import math
import requests

def heure_vers_minutes(heure_str):
    """Convertit '08:30:00' en 510 (minutes depuis minuit)."""
    h, m, s = map(int, heure_str.split(':'))
    return h * 60 + m


def calculer_distance_matrice(coordonnees):
    """
    Appelle l'API OSRM pour obtenir la matrice de distances réelles.
    OSRM attend des coordonnées au format : lon,lat
    """
    n = len(coordonnees)
    
    # 1. Formatage des coordonnées pour OSRM (lon,lat;lon,lat;...)
    coords_str = ";".join([f"{lon},{lat}" for lat, lon in coordonnees])
    
    # 2. Appel de l'API OSRM (Service /table)
    url = f"http://router.project-osrm.org/table/v1/driving/{coords_str}?annotations=distance"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # La matrice est renvoyée en mètres. 
            # OR-Tools préfère des entiers (1m = 1 unité)
            return [[int(dist) for dist in row] for row in data['distances']]
        else:
            print("Erreur OSRM, fallback vers distance euclidienne.")
            return calculer_distance_euclidienne_fallback(coordonnees)
            
    except Exception as e:
        print(f"OSRM indisponible ({e}), fallback vers euclidienne.")
        return calculer_distance_euclidienne_fallback(coordonnees)


def calculer_distance_euclidienne_fallback(coordonnees):
    """Ton ancienne fonction de secours si OSRM échoue"""
    n = len(coordonnees)
    matrice = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                dist = math.sqrt((coordonnees[i][0] - coordonnees[j][0])**2 + 
                                 (coordonnees[i][1] - coordonnees[j][1])**2)
                matrice[i][j] = int(dist * 100000) # Un peu plus grand pour la précision
    return matrice


# Remplacez par votre propre import
from client import Client 

class DatabaseManager:
    def __init__(self, db_name='ma_base.db', reset_db=False):
        """Initialise la connexion. Ne recrée les tables que si reset_db=True."""
        self.db_name = db_name
        if reset_db:
            self.init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self):
        """Lit le fichier sql et l'exécute pour initialiser/réinitialiser la base."""
        sql_file_path = os.path.join(os.path.dirname(__file__), 'donnee.sql')
        
        if not os.path.exists(sql_file_path):
            print(f"Erreur : Le fichier '{sql_file_path}' est introuvable.")
            return

        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()

        try:
            with self._get_connection() as conn:
                conn.executescript(sql_script)
                conn.commit()
            print("Base de données initialisée (et remise à zéro) avec succès !")
        except sqlite3.Error as e:
            print(f"Erreur lors de l'initialisation : {e}")

    # ==========================================
    # 1. UTILISATEURS ET CLIENTS (Vos fonctions)
    # ==========================================
    # ... (Gardez vos méthodes ajouter_utilisateur, verifier_login, ajouter_client, recuperer_tous_les_clients ici) ...
    def verifier_login(self, email, mdp):
        """
        Vérifie si le couple email / mdp est correct.
        Retourne True si c'est bon, False sinon.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT * FROM utilisateurs WHERE email = ? AND mot_de_passe = ?', 
                (email, mdp)
            )
            resultat = cursor.fetchone()
            
            # Si résultat n'est pas None, c'est que le login/mdp correspond
            return resultat is not None

    def ajouter_client(self, client):
        """Permet d'ajouter un client et met à jour son ID avec celui de la base."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO clients (nom_entreprise, latitude, longitude) VALUES (?, ?, ?)',
                    (client.nom_entreprise, client.latitude, client.longitude)
                )
                conn.commit()
                # On récupère l'ID généré par SQLite et on l'assigne à l'objet
                client.id = cursor.lastrowid 
                return True
                
        except sqlite3.IntegrityError:
            print(f"Erreur : Le client '{client.nom_entreprise}' n'a pas pu être ajouté.")
            return False

    def recuperer_tous_les_clients(self):
        """Récupère et retourne la liste de tous les clients sous forme d'objets Client."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nom_entreprise, latitude, longitude FROM clients')
            lignes = cursor.fetchall()
            
            return [Client(id=l[0], nom_entreprise=l[1], latitude=l[2], longitude=l[3]) for l in lignes]

    # ==========================================
    # 2. GESTION DES RESSOURCES (Flotte)
    # ==========================================
    def ajouter_camion(self, immatriculation, charge_max_kg, bacs_max):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO camions (immatriculation, charge_max_kg, bacs_max) VALUES (?, ?, ?)',
                (immatriculation, charge_max_kg, bacs_max)
            )
            conn.commit()
            return cursor.lastrowid

    def ajouter_chauffeur(self, utilisateur_id, nom, prenom, telephone):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO chauffeurs (utilisateur_id, nom, prenom, telephone) VALUES (?, ?, ?, ?)',
                (utilisateur_id, nom, prenom, telephone)
            )
            conn.commit()
            return cursor.lastrowid

    # ==========================================
    # 3. CONTRAINTES ET PLANIFICATION
    # ==========================================
    def ajouter_disponibilite_client(self, client_id, jour_semaine, heure_debut, heure_fin):
        """Définit une fenêtre de passage (ex: jour_semaine=1 pour Lundi)."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin) VALUES (?, ?, ?, ?)',
                (client_id, jour_semaine, heure_debut, heure_fin)
            )
            conn.commit()

    def planifier_tache_collecte(self, client_id, date_planifiee, bacs_prevus):
        """Crée une demande de collecte pour un jour J."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO taches_collecte (client_id, date_planifiee, bacs_prevus, statut) VALUES (?, ?, ?, ?)',
                (client_id, date_planifiee, bacs_prevus, 'en_attente')
            )
            conn.commit()
            return cursor.lastrowid

    def recuperer_taches_du_jour(self, date_jour):
        """
        Crucial pour OR-Tools : Récupère toutes les collectes à faire aujourd'hui,
        avec les infos géographiques du client associé.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.id, t.bacs_prevus, c.nom_entreprise, c.latitude, c.longitude 
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.date_planifiee = ? AND t.statut = 'en_attente'
            ''', (date_jour,))
            return cursor.fetchall()

    # ==========================================
    # 4. RETOUR TERRAIN (Pour l'App Chauffeur)
    # ==========================================
    def valider_collecte(self, tache_id, bacs_reels):
        """Méthode appelée par l'application mobile quand le chauffeur a terminé l'arrêt."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE taches_collecte 
                SET bacs_reels = ?, statut = 'terminee' 
                WHERE id = ?
            ''', (bacs_reels, tache_id))
            conn.commit()
            return cursor.rowcount > 0

    def ajouter_utilisateur(self, email, mdp, role='chauffeur'):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO utilisateurs (email, mot_de_passe, role) VALUES (?, ?, ?)', 
                    (email, mdp, role)
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            print(f"Erreur : L'email '{email}' existe déjà.")
            return False
        
    def preparer_donnees_ortools(self, date_jour, depot_lat, depot_lon):
        """
        Extrait les données de la base et les formate pour OR-Tools.
        Gère le Multi-Trip en créant deux tournées virtuelles par camion.
        """
        data = {}
        
        # Constantes pour les horaires (3h00 = 180min, 13h45 = 825min)
        MIN_GLOBAL = 180 
        MAX_GLOBAL = 825 
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Récupération des camions
            cursor.execute('''
                SELECT c.bacs_max, c.charge_max_kg, ch.nom
                FROM tournees_jour tj
                JOIN camions c ON tj.camion_id = c.id
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                WHERE tj.date_tournee = ?
            ''', (date_jour,))
            camions_jour = cursor.fetchall()
            
            # Initialisation des listes
            data['vehicle_capacities'] = []
            data['vehicle_weights'] = []
            data['vehicle_time_windows'] = []
            data['driver_names'] = []
            
            # DÉDOUBLAGE DES CAMIONS (Multi-Trip)
            for c in camions_jour:
                # Tournée 1 (T1)
                data['vehicle_capacities'].append(c[0])
                data['vehicle_weights'].append(c[1])
                data['driver_names'].append(f"{c[2]} (T1)")
                data['vehicle_time_windows'].append((MIN_GLOBAL, MAX_GLOBAL))
                
                # Tournée 2 (T2)
                data['vehicle_capacities'].append(c[0])
                data['vehicle_weights'].append(c[1])
                data['driver_names'].append(f"{c[2]} (T2)")
                data['vehicle_time_windows'].append((MIN_GLOBAL, MAX_GLOBAL))
            
            data['num_vehicles'] = len(data['vehicle_capacities'])
            data['depot'] = 0 
            
            # 2. Récupération des tâches
            cursor.execute('''
                SELECT t.id, t.bacs_prevus, t.poids_prevu_kg, c.latitude, c.longitude, c.nom_entreprise
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.date_planifiee = ? AND t.statut = 'en_attente'
            ''', (date_jour,))
            taches = cursor.fetchall()

            # 3. Initialisation des listes avec le Dépôt
            coordonnees = [(depot_lat, depot_lon)]
            data['demands'] = [0]
            data['weight_demands'] = [0]
            data['time_windows'] = [(MIN_GLOBAL, MAX_GLOBAL)] # Dépôt aussi contraint
            data['tache_ids'] = [None]
            data['infos_geo'] = {
                0: {"nom": "Dépôt", "lat": depot_lat, "lon": depot_lon}
            }
            
            # 4. Remplissage avec les données des clients
            for index, tache in enumerate(taches, start=1):
                tache_id, bacs, poids, lat, lon, nom = tache
                data['tache_ids'].append(tache_id)
                coordonnees.append((lat, lon))
                data['demands'].append(bacs)
                data['weight_demands'].append(poids)
                data['infos_geo'][index] = {"nom": nom, "lat": lat, "lon": lon}
                # Fenêtre large pour les clients (ex: toute la journée)
                data['time_windows'].append((MIN_GLOBAL, MAX_GLOBAL))

            # 5. Matrice
            data['distance_matrix'] = calculer_distance_matrice(coordonnees)
            
            return data