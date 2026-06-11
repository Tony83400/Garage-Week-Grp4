import sqlite3
import os
import math
from client import Client

def heure_vers_minutes(heure_str):
    """Convertit '08:30:00' en 510 (minutes depuis minuit)."""
    h, m, s = map(int, heure_str.split(':'))
    return h * 60 + m

def calculer_distance_matrice(coordonnees):
    """
    Génère une matrice de distances (en entiers) entre tous les points.
    """
    n = len(coordonnees)
    matrice = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                dist = math.sqrt((coordonnees[i][0] - coordonnees[j][0])**2 + 
                                 (coordonnees[i][1] - coordonnees[j][1])**2)
                matrice[i][j] = int(dist * 1000)
    return matrice

class DatabaseManager:
    def __init__(self, db_name='ma_base.db', reset_db=False):
        self.db_name = db_name
        if reset_db:
            self.init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self):
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
            print("Base de données initialisée avec succès !")
        except sqlite3.Error as e:
            print(f"Erreur lors de l'initialisation : {e}")

    def verifier_login(self, email, mdp):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM utilisateurs WHERE email = ? AND mot_de_passe = ?', (email, mdp))
            return cursor.fetchone() is not None

    def ajouter_client(self, client):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('INSERT INTO clients (nom_entreprise, latitude, longitude) VALUES (?, ?, ?)',
                               (client.nom_entreprise, client.latitude, client.longitude))
                conn.commit()
                client.id = cursor.lastrowid
                return True
        except sqlite3.IntegrityError:
            return False

    def recuperer_tous_les_clients(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nom_entreprise, latitude, longitude FROM clients')
            lignes = cursor.fetchall()
            return [Client(id=l[0], nom_entreprise=l[1], latitude=l[2], longitude=l[3]) for l in lignes]

    def ajouter_camion(self, immatriculation, charge_max_kg, bacs_max):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO camions (immatriculation, charge_max_kg, bacs_max) VALUES (?, ?, ?)',
                           (immatriculation, charge_max_kg, bacs_max))
            conn.commit()
            return cursor.lastrowid

    def planifier_tache_collecte(self, client_id, date_planifiee, bacs_prevus):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO taches_collecte (client_id, date_planifiee, bacs_prevus, statut) VALUES (?, ?, ?, ?)',
                           (client_id, date_planifiee, bacs_prevus, 'en_attente'))
            conn.commit()
            return cursor.lastrowid

    def preparer_donnees_ortools(self, date_jour, depot_lat, depot_lon):
        """
        Extrait les données de la base et les formate pour OR-Tools.
        """
        data = {
            'vehicle_capacities': [],
            'num_vehicles': 0,
            'depot': 0,
            'demands': [0],
            'time_windows': [(0, 1440)],
            'tache_ids': [None],
            'infos_geo': {0: {"nom": "Dépôt / Point de départ", "lat": depot_lat, "lon": depot_lon}}
        }
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT bacs_max FROM camions")
            camions = cursor.fetchall()
            data['vehicle_capacities'] = [c[0] for c in camions]
            data['num_vehicles'] = len(camions)
            
            cursor.execute('''
                SELECT t.id, t.bacs_prevus, c.latitude, c.longitude,
                       IFNULL(d.heure_debut, '08:00:00'), 
                       IFNULL(d.heure_fin, '18:00:00'),
                       c.nom_entreprise
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                LEFT JOIN disponibilites_clients d ON c.id = d.client_id
                WHERE t.date_planifiee = ? AND t.statut = 'en_attente'
            ''', (date_jour,))
            taches = cursor.fetchall()

        for index, tache in enumerate(taches, start=1):
            tache_id, bacs, lat, lon, h_debut, h_fin, nom_entreprise = tache
            data['tache_ids'].append(tache_id)
            data['demands'].append(bacs)
            data['infos_geo'][index] = {"nom": nom_entreprise, "lat": lat, "lon": lon}
            data['time_windows'].append((heure_vers_minutes(h_debut), heure_vers_minutes(h_fin)))

        coordonnees = [(depot_lat, depot_lon)] + [(item['lat'], item['lon']) for item in data['infos_geo'].values() if item != data['infos_geo'][0]]
        data['distance_matrix'] = calculer_distance_matrice(coordonnees)
        return data