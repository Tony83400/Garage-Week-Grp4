import sqlite3
import math
import datetime

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
        
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. On récupère les horaires réels des chauffeurs
            cursor.execute('''
                SELECT c.bacs_max, c.charge_max_kg, ch.nom, tj.heure_debut_service, tj.heure_fin_service
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
            data['groupes_vehicules'] = [] # NOUVEAU : Pour lier les tournées virtuelles à un seul chauffeur
            
            MAX_TOURS = 3 # On autorise jusqu'à 3 retours au dépôt par chauffeur
            
            for index_chauffeur, c in enumerate(camions_jour):
                bacs_max, charge_max, nom_chauffeur, heure_debut, heure_fin = c
                
                # Conversion des heures du chauffeur en minutes (ex: 08:00 = 480)
                debut_min = heure_vers_minutes(heure_debut)
                fin_min = heure_vers_minutes(heure_fin)
                
                # On génère 3 "slots" de tournées potentiels pour CE chauffeur
                # OR-Tools n'utilisera le T2 ou T3 que s'il y a assez de place dans son amplitude horaire
                for numero_tournee in range(1, MAX_TOURS + 1):
                    data['vehicle_capacities'].append(bacs_max)
                    data['vehicle_weights'].append(charge_max)
                    data['driver_names'].append(f"{nom_chauffeur} (T{numero_tournee})")
                    
                    # La "Time Window" du véhicule virtuel est strictement limitée au shift du chauffeur
                    data['vehicle_time_windows'].append((debut_min, fin_min))
                    
                    # On mémorise que ce véhicule virtuel appartient à 'index_chauffeur'
                    data['groupes_vehicules'].append(index_chauffeur)
            
            data['num_vehicles'] = len(data['vehicle_capacities'])
            data['depot'] = 0 
            
            # ... (La suite du code pour récupérer les tâches reste identique) ...
            
            cursor.execute('''
                SELECT t.id, t.bacs_prevus, t.poids_prevu_kg, c.latitude, c.longitude, c.nom_entreprise
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.date_planifiee = ? 
                AND t.statut = 'en_attente' 
                AND t.type_tache = 'collecte'
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
            
            # 1. Infos globales de la tournée
            cursor.execute('''
                SELECT ch.prenom || ' ' || ch.nom, c.immatriculation, c.charge_max_kg, tj.heure_debut_service
                FROM tournees_jour tj
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                JOIN camions c ON tj.camion_id = c.id
                WHERE tj.chauffeur_id = ? AND tj.date_tournee = ?
            ''', (chauffeur_id, date_jour))
            
            tournee_info = cursor.fetchone()
            if not tournee_info:
                return None
                
            chauffeur_nom, immatriculation, capacite, heure_depart = tournee_info

            # 2. Liste des arrêts
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
                
            return {
                "chauffeur": chauffeur_nom,
                "vehicule": f"VL{chauffeur_id}", 
                "immatriculation": immatriculation,
                "capacite_max_kg": capacite,
                "heure_depart": heure_depart,
                "arrets": arrets
            }

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
                SELECT tj.id, tj.chauffeur_id, c.immatriculation, c.charge_max_kg, ch.nom, ch.prenom, tj.heure_debut_service
                FROM tournees_jour tj
                JOIN camions c ON tj.camion_id = c.id
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                WHERE tj.date_tournee = ?
            ''', (date_jour,))
            tournees = cursor.fetchall()
            
            resultat = []
            for t in tournees:
                tournee_id, chauffeur_id, immatriculation, charge_max, nom, prenom, heure_depart = t
                
                # Récupération basique des arrêts du jour 
                cursor.execute('''
                    SELECT t.id, t.statut, t.poids_prevu_kg, c.nom_entreprise, t.ordre_passage
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
                        "tache_id": a[0],
                        "statut": a[1],
                        "poids_prevu_kg": a[2],
                        "client_nom": a[3],
                        "ordre": a[4] or 0
                    })
                
                resultat.append({
                    "chauffeur_id": chauffeur_id,
                    "chauffeur": f"{prenom} {nom}",
                    "vehicule": f"VL{chauffeur_id}",
                    "immatriculation": immatriculation,
                    "capacite_max_kg": charge_max,
                    "heure_depart": heure_depart,
                    "arrets": liste_arrets
                })
            return resultat
        
    def recuperer_imprevus(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.id, c.nom_entreprise, t.commentaire
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.date_planifiee = ? AND t.statut = 'erreur'
            ''', (date_jour,))
            
            lignes = cursor.fetchall()
            imprevus = []
            for l in lignes:
                imprevus.append({
                    "tache_id": l[0],
                    "client_nom": l[1],
                    "adresse": "À compléter", 
                    "ville": "À compléter",
                    "chauffeur": "Inconnu", 
                    "raison": l[2] or "Site inaccessible ou erreur signalée",
                    "heure": "N/A"
                })
            return imprevus
    
    def generer_brouillons_jour(self, date_jour):
        """
        Génère automatiquement les tâches de collecte pour un jour donné,
        en se basant sur les disponibilités des clients et en ignorant ceux 
        qui sont en exception (ex: fermés ce jour-là).
        """
        # 1. Calcul du jour de la semaine (1 = Lundi, ..., 7 = Dimanche)
        date_obj = datetime.datetime.strptime(date_jour, '%Y-%m-%d')
        jour_semaine = date_obj.weekday() + 1

        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # 2. Sécurité : Vérifier qu'on n'a pas déjà généré les tâches pour ce jour
            cursor.execute('''
                SELECT COUNT(*) FROM taches_collecte 
                WHERE date_planifiee = ? AND type_tache = 'collecte'
            ''', (date_jour,))
            
            if cursor.fetchone()[0] > 0:
                return {"status": "erreur", "message": "Les tâches pour cette date existent déjà."}

            # 3. La Super-Requête : Trouver les clients prévus ce jour, SAUF s'ils sont fermés
            cursor.execute('''
                SELECT d.client_id
                FROM disponibilites_clients d
                WHERE d.jour_semaine = ?
                AND d.client_id NOT IN (
                    SELECT client_id 
                    FROM exceptions_calendrier_clients 
                    WHERE date_exception = ? AND est_ferme = 1
                )
            ''', (jour_semaine, date_jour))
            
            clients_a_collecter = cursor.fetchall()
            
            # 4. Création des tâches
            taches_inserees = 0
            for client in clients_a_collecter:
                client_id = client[0]
                
                # Pour le prototype, on met une estimation moyenne (ex: 3 bacs, 120kg)
                # Plus tard, cela pourrait venir d'une moyenne historique par client
                bacs_estimes = 3
                poids_estime = 120.0
                
                cursor.execute('''
                    INSERT INTO taches_collecte 
                    (client_id, date_planifiee, type_tache, bacs_prevus, poids_prevu_kg, statut) 
                    VALUES (?, ?, 'collecte', ?, ?, 'en_attente')
                ''', (client_id, date_jour, bacs_estimes, poids_estime))
                taches_inserees += 1
            
            conn.commit()
            return {"status": "succes", "taches_creees": taches_inserees}