import sqlite3
import math

def heure_vers_minutes(heure_str):
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

class TourneeRepository:
    def __init__(self, db_core):
        self.db_core = db_core

    def ajouter_disponibilite_client(self, client_id, jour_semaine, heure_debut, heure_fin):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin) VALUES (?, ?, ?, ?)',
                (client_id, jour_semaine, heure_debut, heure_fin)
            )
            conn.commit()

    def planifier_tache_collecte(self, client_id, date_planifiee, bacs_prevus):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO taches_collecte (client_id, date_planifiee, bacs_prevus, statut) VALUES (?, ?, ?, ?)',
                (client_id, date_planifiee, bacs_prevus, 'en_attente')
            )
            conn.commit()
            return cursor.lastrowid

    def recuperer_taches_du_jour(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.id, t.bacs_prevus, c.nom_entreprise, c.latitude, c.longitude 
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.date_planifiee = ? AND t.statut = 'en_attente'
            ''', (date_jour,))
            return cursor.fetchall()

    def preparer_donnees_ortools(self, date_jour, depot_lat, depot_lon):
        data = {}
        MIN_GLOBAL = 180 
        MAX_GLOBAL = 825 
        
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT c.bacs_max, c.charge_max_kg, ch.nom
                FROM tournees_jour tj
                JOIN camions c ON tj.camion_id = c.id
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                WHERE tj.date_tournee = ?
            ''', (date_jour,))
            camions_jour = cursor.fetchall()
            
            data['vehicle_capacities'] = []
            data['vehicle_weights'] = []
            data['vehicle_time_windows'] = []
            data['driver_names'] = []
            
            for c in camions_jour:
                data['vehicle_capacities'].append(c[0])
                data['vehicle_weights'].append(c[1])
                data['driver_names'].append(f"{c[2]} (T1)")
                data['vehicle_time_windows'].append((MIN_GLOBAL, MAX_GLOBAL))
                
                data['vehicle_capacities'].append(c[0])
                data['vehicle_weights'].append(c[1])
                data['driver_names'].append(f"{c[2]} (T2)")
                data['vehicle_time_windows'].append((MIN_GLOBAL, MAX_GLOBAL))
            
            data['num_vehicles'] = len(data['vehicle_capacities'])
            data['depot'] = 0 
            
            cursor.execute('''
                SELECT t.id, t.bacs_prevus, t.poids_prevu_kg, c.latitude, c.longitude, c.nom_entreprise
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.date_planifiee = ? AND t.statut = 'en_attente'
            ''', (date_jour,))
            taches = cursor.fetchall()

            coordonnees = [(depot_lat, depot_lon)]
            data['demands'] = [0]
            data['weight_demands'] = [0]
            data['time_windows'] = [(MIN_GLOBAL, MAX_GLOBAL)]
            data['tache_ids'] = [None]
            data['infos_geo'] = {
                0: {"nom": "Dépôt", "lat": depot_lat, "lon": depot_lon}
            }
            
            for index, tache in enumerate(taches, start=1):
                tache_id, bacs, poids, lat, lon, nom = tache
                data['tache_ids'].append(tache_id)
                coordonnees.append((lat, lon))
                data['demands'].append(bacs)
                data['weight_demands'].append(poids)
                data['infos_geo'][index] = {"nom": nom, "lat": lat, "lon": lon}
                data['time_windows'].append((MIN_GLOBAL, MAX_GLOBAL))

            data['distance_matrix'] = calculer_distance_matrice(coordonnees)
            return data

    def valider_collecte(self, tache_id, bacs_reels):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE taches_collecte 
                SET bacs_reels = ?, statut = 'terminee' 
                WHERE id = ?
            ''', (bacs_reels, tache_id))
            conn.commit()
            return cursor.rowcount > 0

    def mettre_a_jour_statut_etape(self, tache_id, statut, bacs_reels=None, commentaire=None):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE taches_collecte 
                SET statut = ?, 
                    bacs_reels = ?,
                    commentaire = ?
                WHERE id = ?
            ''', (statut, bacs_reels, commentaire, tache_id))
            conn.commit()
            return cursor.rowcount > 0

    def recuperer_tournee_chauffeur(self, chauffeur_id, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.id, t.statut, t.bacs_prevus, t.poids_prevu_kg, t.ordre_passage,
                       c.nom_entreprise, c.latitude, c.longitude
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                JOIN tournees_jour tj ON t.date_planifiee = tj.date_tournee 
                WHERE tj.chauffeur_id = ? AND t.date_planifiee = ?
                ORDER BY t.ordre_passage ASC
            ''', (chauffeur_id, date_jour))
            
            lignes = cursor.fetchall()
            arrets = []
            for l in lignes:
                arrets.append({
                    "tache_id": l[0],
                    "statut": l[1],
                    "bacs_prevus": l[2],
                    "poids_prevu_kg": l[3],
                    "ordre": l[4],
                    "client_nom": l[5],
                    "latitude": l[6],
                    "longitude": l[7]
                })
            return arrets

    def get_dashboard_stats(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 
                    SUM(poids_prevu_kg),
                    COUNT(id),
                    SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END)
                FROM taches_collecte
                WHERE date_planifiee = ?
            ''', (date_jour,))
            resultat = cursor.fetchone()
            
            poids_total = resultat[0] or 0
            total_collectes = resultat[1] or 0
            collectes_validees = resultat[2] or 0
            
            cursor.execute('''
                SELECT COUNT(id) FROM taches_collecte 
                WHERE date_planifiee = ? AND statut = 'erreur'
            ''', (date_jour,))
            alertes = cursor.fetchone()[0] or 0

            return {
                "poids_prevu_kg": poids_total,
                "collectes_total": total_collectes,
                "collectes_validees": collectes_validees,
                "alertes": alertes
            }

    def get_activite_recente(self, date_jour, limite=5):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.statut, c.nom_entreprise, c.latitude, c.longitude
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.date_planifiee = ? AND t.statut != 'en_attente'
                ORDER BY t.id DESC LIMIT ?
            ''', (date_jour, limite))
            lignes = cursor.fetchall()
            
            activites = []
            for ligne in lignes:
                activites.append({
                    "statut": ligne[0],
                    "client": ligne[1],
                    "coordonnees": {"lat": ligne[2], "lon": ligne[3]}
                })
            return activites

    def get_tournees_detaillees(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT tj.id, c.immatriculation, c.charge_max_kg, ch.nom, ch.prenom
                FROM tournees_jour tj
                JOIN camions c ON tj.camion_id = c.id
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                WHERE tj.date_tournee = ?
            ''', (date_jour,))
            tournees = cursor.fetchall()
            
            resultat = []
            for t in tournees:
                tournee_id, immatriculation, charge_max, nom, prenom = t
                cursor.execute('''
                    SELECT t.id, t.statut, t.poids_prevu_kg, c.nom_entreprise, c.latitude, c.longitude
                    FROM taches_collecte t
                    JOIN clients c ON t.client_id = c.id
                    WHERE t.date_planifiee = ?
                ''', (date_jour,)) 
                arrets = cursor.fetchall()
                
                liste_arrets = []
                charge_actuelle = 0
                for a in arrets:
                    charge_actuelle += (a[2] or 0)
                    liste_arrets.append({
                        "id": a[0],
                        "statut": a[1],
                        "client": a[3],
                        "lat": a[4],
                        "lon": a[5]
                    })
                
                resultat.append({
                    "tournee_id": tournee_id,
                    "vehicule": immatriculation,
                    "capacite_max": charge_max,
                    "charge_actuelle": charge_actuelle,
                    "chauffeur": f"{prenom} {nom}",
                    "arrets": liste_arrets
                })
                
            return resultat