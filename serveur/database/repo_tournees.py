"""
Dépôt principal pour la gestion des tournées et de la logique de planification.
Gère la préparation des données pour OR-Tools et la sauvegarde des résultats.
"""

import sqlite3
import math
import datetime
import requests
import os

def heure_vers_minutes(heure_str):
    """Convertit une chaîne 'HH:MM' en nombre de minutes depuis minuit."""
    if not heure_str:
        return 0
    parts = list(map(int, heure_str.split(':')))
    if len(parts) >= 2:
        return parts[0] * 60 + parts[1]
    return 0

def minutes_en_heure(minutes):
    """Convertit un nombre de minutes en chaîne 'HH:MM'."""
    h = int(minutes // 60)
    m = int(minutes % 60)
    return f"{h:02d}:{m:02d}"

def calculer_distance_matrice(coordonnees):
    """
    Calcule la matrice des distances et des temps de trajet.
    Utilise OpenRouteService si une clé API est présente, sinon bascule sur l'euclidien.
    """
    locations = [[lon, lat] for lat, lon in coordonnees]
    API_KEY = os.getenv('OPENROUTESERVICE_KEY')
    
    if not API_KEY or API_KEY == 'votre_cle_ici':
        return calculer_distance_euclidienne_fallback(coordonnees)
    
    url = 'https://api.openrouteservice.org/v2/matrix/driving-hgv'
    headers = {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8', 
        'Authorization': API_KEY, 
        'Content-Type': 'application/json; charset=utf-8'
    }
    body = {'locations': locations, 'metrics': ['distance', 'duration']}
    
    try:
        response = requests.post(url, json=body, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # On cast en int pour OR-Tools
            distances = [[int(dist) for dist in row] for row in data['distances']]
            durations = [[int(dur // 60) for dur in row] for row in data['durations']]
            return {'distances': distances, 'durations': durations}
        return calculer_distance_euclidienne_fallback(coordonnees)
    except Exception:
        return calculer_distance_euclidienne_fallback(coordonnees)

def calculer_distance_euclidienne_fallback(coordonnees):
    """Calcul d'approximation par distance à vol d'oiseau."""
    n = len(coordonnees)
    matrice_dist = [[0] * n for _ in range(n)]
    matrice_time = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                dist = math.sqrt((coordonnees[i][0] - coordonnees[j][0]) ** 2 + (coordonnees[i][1] - coordonnees[j][1]) ** 2)
                dist_metres = int(dist * 100000)
                matrice_dist[i][j] = dist_metres
                # Approximation : 1 minute par km
                matrice_time[i][j] = dist_metres // 500
    return {'distances': matrice_dist, 'durations': matrice_time}

class TourneeRepository:
    """Gère la planification, l'optimisation et le suivi des tournées de collecte."""

    def __init__(self, db_core):
        self.db_core = db_core

    def ajouter_disponibilite_client(self, client_id, jour_semaine, heure_debut, heure_fin):
        """Définit un créneau de disponibilité pour un client."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin) VALUES (?, ?, ?, ?)', 
                (client_id, jour_semaine, heure_debut, heure_fin)
            )
            conn.commit()

    def planifier_tache_collecte(self, client_id, date_planifiee, bacs_prevus):
        """Crée une tâche de collecte individuelle."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO taches_collecte (client_id, date_planifiee, bacs_prevus, statut) VALUES (?, ?, ?, ?)', 
                (client_id, date_planifiee, bacs_prevus, 'en_attente')
            )
            conn.commit()
            return cursor.lastrowid

    def recuperer_taches_du_jour(self, date_jour):
        """Récupère les tâches non affectées pour une date donnée."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.id, t.bacs_prevus, c.nom_entreprise, c.latitude, c.longitude 
                FROM taches_collecte t 
                JOIN clients c ON t.client_id = c.id 
                WHERE t.date_planifiee = ? AND t.statut = 'en_attente'
            ''', (date_jour,))
            return cursor.fetchall()

    def recuperer_depot_principal(self):
        """Récupère les coordonnées du dépôt central."""
        with self.db_core.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM depots LIMIT 1')
            row = cursor.fetchone()
            return dict(row) if row else None

    def preparer_donnees_ortools(self, date_jour, depot_lat, depot_lon):
        """
        Prépare les données structurées pour le solveur Google OR-Tools.
        Gère la flotte, les capacités et les fenêtres horaires globales.
        """
        data = {}
        MIN_GLOBAL = 180  # 03:00
        MAX_GLOBAL = 1200 # 20:00
        TRIPS_PAR_CHAUFFEUR = 3 # Nombre de tournées max par shift (multi-trip)

        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            # Récupération des shifts actifs pour la journée
            cursor.execute('''
                SELECT c.bacs_max, c.charge_max_kg, ch.nom, tj.heure_debut_service, tj.heure_fin_service, ch.id, tj.id
                FROM tournees_jour tj
                JOIN camions c ON tj.camion_id = c.id
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                WHERE tj.date_tournee = ? 
                AND tj.statut NOT IN ('demarree', 'terminee')
                ORDER BY ch.id ASC, tj.heure_debut_service ASC
            ''', (date_jour,))
            
            camions_jour = cursor.fetchall()
            
            data['vehicle_capacities'] = []
            data['vehicle_weights'] = []
            data['vehicle_time_windows'] = []
            data['driver_names'] = []
            data['groupes_vehicules'] = []
            data['tournee_bdd_ids'] = []
            
            for index, c in enumerate(camions_jour):
                bacs_max, charge_max, nom_chauffeur, h_debut, h_fin, chauffeur_id, tournee_bdd_id = c
                debut_min = heure_vers_minutes(h_debut)
                fin_min = heure_vers_minutes(h_fin)
                
                # Multiplication des véhicules virtuels pour simuler le multi-trip
                for trip in range(TRIPS_PAR_CHAUFFEUR):
                    data['vehicle_capacities'].append(bacs_max)
                    data['vehicle_weights'].append(charge_max)
                    data['driver_names'].append(f'{nom_chauffeur} (Trip {trip + 1})')
                    data['vehicle_time_windows'].append((debut_min, fin_min))
                    data['groupes_vehicules'].append(chauffeur_id)
                    data['tournee_bdd_ids'].append(tournee_bdd_id)
            
            data['num_vehicles'] = len(data['vehicle_capacities'])
            data['depot'] = 0
            
            # Récupération des tâches à planifier
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
            data['infos_geo'] = {0: {'nom': 'Dépôt', 'lat': depot_lat, 'lon': depot_lon}}
            
            for index, tache in enumerate(taches, start=1):
                t_id, bacs, poids, lat, lon, nom = tache
                data['tache_ids'].append(t_id)
                coordonnees.append((lat, lon))
                data['demands'].append(bacs)
                data['weight_demands'].append(poids)
                data['infos_geo'][index] = {'nom': nom, 'lat': lat, 'lon': lon}
                data['time_windows'].append((MIN_GLOBAL, MAX_GLOBAL))
            
            matrices = calculer_distance_matrice(coordonnees)
            data['distance_matrix'] = matrices['distances']
            data['time_matrix'] = matrices['durations']
            
            return data

    def mettre_a_jour_statut_tournee(self, tournee_id, statut):
        """Met à jour le statut d'une tournée (affectee, demarree, terminee)."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE tournees_jour SET statut = ? WHERE id = ?', (statut, tournee_id))
            conn.commit()
            return cursor.rowcount > 0

    def mettre_a_jour_statut_etape(self, tache_id, statut, bacs_reels=None, commentaire=None, type_imprevu=None):
        """Enregistre le résultat d'une collecte sur le terrain."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE taches_collecte 
                SET statut = ?, bacs_reels = ?, commentaire = ?, type_imprevu = ? 
                WHERE id = ?
            ''', (statut, bacs_reels, commentaire, type_imprevu, tache_id))
            conn.commit()
            return cursor.rowcount > 0

    def recuperer_tournee_chauffeur(self, chauffeur_id, date_jour):
        """Récupère la feuille de route active pour un chauffeur."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            # Récupération de la tournée prioritaire (démarrée ou à venir)
            cursor.execute("""
                SELECT tj.id, ch.prenom || ' ' || ch.nom, c.immatriculation, c.charge_max_kg, tj.heure_debut_service, tj.statut
                FROM tournees_jour tj
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                JOIN camions c ON tj.camion_id = c.id
                WHERE tj.chauffeur_id = ? AND tj.date_tournee = ? 
                AND tj.statut IN ('demarree', 'affectee')
                ORDER BY CASE WHEN tj.statut = 'demarree' THEN 0 ELSE 1 END ASC, tj.id ASC
                LIMIT 1
            """, (chauffeur_id, date_jour))
            
            tournee_info = cursor.fetchone()
            if not tournee_info:
                return None
                
            t_bdd_id, ch_nom, immat, capacite, h_dep, statut = tournee_info
            
            # Récupération des étapes de la tournée
            cursor.execute('''
                SELECT t.id, t.statut, t.bacs_prevus, t.poids_prevu_kg, t.ordre_passage,
                       c.nom_entreprise, c.latitude, c.longitude
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.tournee_id = ?
                ORDER BY t.ordre_passage ASC
            ''', (t_bdd_id,))
            
            arrets = []
            for l in cursor.fetchall():
                arrets.append({
                    'tache_id': l[0], 'statut': l[1], 'bacs_prevus': l[2], 
                    'poids_prevu_kg': l[3], 'ordre': l[4], 'client_nom': l[5], 
                    'latitude': l[6], 'longitude': l[7]
                })
                
            return {
                'tournee_id': t_bdd_id, 'chauffeur': ch_nom, 'vehicule': f'VL{chauffeur_id}', 
                'immatriculation': immat, 'capacite_max_kg': capacite, 
                'heure_depart': h_dep, 'statut': statut, 'arrets': arrets
            }

    def get_dashboard_stats(self, date_jour):
        """Calcule les statistiques globales pour le tableau de bord."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # Statistiques de collecte (poids, volume)
            cursor.execute('''
                SELECT SUM(poids_prevu_kg), COUNT(id), 
                       SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END), 
                       SUM(CASE WHEN statut = 'terminee' THEN poids_prevu_kg ELSE 0 END) 
                FROM taches_collecte 
                WHERE date_planifiee = ? AND type_tache = 'collecte' AND tournee_id IS NOT NULL
            ''', (date_jour,))
            res = cursor.fetchone()
            p_total, t_coll, c_val, p_coll = (res[0] or 0, res[1] or 0, res[2] or 0, res[3] or 0)
            
            # Alertes (erreurs signalées par les chauffeurs)
            cursor.execute('SELECT COUNT(id) FROM taches_collecte WHERE date_planifiee = ? AND statut = "erreur"', (date_jour,))
            alertes = cursor.fetchone()[0] or 0
            
            # Kilométrage total
            cursor.execute('SELECT SUM(distance_km) FROM tournees_jour WHERE date_tournee = ?', (date_jour,))
            km_total = cursor.fetchone()[0] or 0
            
            # État de la flotte (par chauffeur)
            cursor.execute("""
                SELECT
                  ch.prenom || ' ' || SUBSTR(ch.nom, 1, 1) || '.',
                  COUNT(DISTINCT tj.id),
                  ROUND(SUM(tj.distance_km), 1),
                  COUNT(CASE WHEN t.type_tache = 'collecte' THEN 1 END),
                  COUNT(CASE WHEN t.type_tache = 'collecte' AND t.statut = 'terminee' THEN 1 END),
                  COUNT(CASE WHEN t.type_tache = 'collecte' AND t.statut = 'erreur' THEN 1 END)
                FROM tournees_jour tj
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                LEFT JOIN taches_collecte t ON tj.id = t.tournee_id
                WHERE tj.date_tournee = ?
                GROUP BY tj.chauffeur_id, ch.prenom, ch.nom
            """, (date_jour,))
            
            flotte = []
            for ch, nb_t, km, total, done, err in cursor.fetchall():
                flotte.append({
                    'chauffeur': ch,
                    'nb_tournees': nb_t,
                    'km': km or 0,
                    'arrets_total': total or 0,
                    'arrets_done': done or 0,
                    'erreurs': err or 0,
                    'termine': (total or 0) > 0 and (done or 0) + (err or 0) >= (total or 0),
                })
                
            return {
                'poids_prevu_kg': p_total, 'poids_collecte_kg': p_coll, 
                'collectes_total': t_coll, 'collectes_validees': c_val, 
                'alertes': alertes, 'km_total': round(km_total, 1), 'flotte': flotte
            }

    def get_activite_recente(self, date_jour, limite=5):
        """Retourne les dernières actions validées sur le terrain."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.statut, c.nom_entreprise, c.latitude, c.longitude 
                FROM taches_collecte t 
                JOIN clients c ON t.client_id = c.id 
                WHERE t.date_planifiee = ? AND t.statut IN ("terminee", "erreur") 
                ORDER BY t.id DESC LIMIT ?
            ''', (date_jour, limite))
            return [
                {'statut': l[0], 'client': l[1], 'coordonnees': {'lat': l[2], 'lon': l[3]}} 
                for l in cursor.fetchall()
            ]

    def get_tournees_detaillees(self, date_jour):
        """
        Retourne la liste complète des tournées avec leurs étapes pour l'interface Admin.
        Inclus le calcul des heures de départ/retour au dépôt.
        """
        def ajouter_minutes(heure_str, minutes):
            if not heure_str or heure_str == 'N/A': return heure_str
            try:
                parts = heure_str.split(':')
                h, m = int(parts[0]), int(parts[1])
                total_m = h * 60 + m + minutes
                new_h = (total_m // 60) % 24
                new_m = total_m % 60
                return f"{new_h:02d}:{new_m:02d}"
            except:
                return heure_str

        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            # Coordonnées du dépôt pour les points de départ/retour
            cursor.execute('SELECT nom, latitude, longitude FROM depots LIMIT 1')
            d_row = cursor.fetchone()
            depot_info = {
                'client_nom': d_row[0] if d_row else 'Dépôt', 
                'latitude': d_row[1] if d_row else 43.167, 
                'longitude': d_row[2] if d_row else 6.043, 
                'statut': 'depot'
            }
            
            cursor.execute('''
                SELECT tj.id, tj.chauffeur_id, c.immatriculation, c.charge_max_kg, ch.nom, ch.prenom, 
                       tj.heure_debut_service, tj.heure_fin_service, tj.distance_km 
                FROM tournees_jour tj 
                JOIN camions c ON tj.camion_id = c.id 
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id 
                WHERE tj.date_tournee = ?
            ''', (date_jour,))
            
            resultat = []
            for tid, cid, immat, c_max, nom, prenom, h_dep_shift, h_fin_shift, d_km in cursor.fetchall():
                cursor.execute('''
                    SELECT t.id, t.statut, t.poids_prevu_kg, c.nom_entreprise, 
                           t.ordre_passage, c.latitude, c.longitude, t.heure_estimee, 
                           t.type_imprevu 
                    FROM taches_collecte t 
                    JOIN clients c ON t.client_id = c.id 
                    WHERE t.date_planifiee = ? AND t.tournee_id = ? 
                    ORDER BY t.ordre_passage ASC
                ''', (date_jour, tid))
                
                arrets_clients = [{
                    'tache_id': a[0], 'statut': a[1], 'poids_prevu_kg': a[2], 
                    'client_nom': a[3], 'ordre': a[4] or 0, 'latitude': a[5], 
                    'longitude': a[6], 'heure_estimee': a[7], 'type_imprevu': a[8]
                } for a in cursor.fetchall()]
                
                if arrets_clients:
                    # Calcul de l'heure estimée au dépôt (départ/retour)
                    h_premier = arrets_clients[0].get('heure_estimee')
                    vrai_depart = ajouter_minutes(h_premier, -20) if h_premier else h_dep_shift
                    
                    h_dernier = arrets_clients[-1].get('heure_estimee')
                    vrai_retour = ajouter_minutes(h_dernier, 20) if h_dernier else h_fin_shift

                    d_depart = depot_info.copy()
                    d_depart.update({'heure_estimee': vrai_depart, 'ordre': 0})
                    
                    d_retour = depot_info.copy()
                    d_retour.update({'heure_estimee': vrai_retour, 'ordre': len(arrets_clients) + 1})
                    
                    full_arrets = [d_depart] + arrets_clients + [d_retour]
                    
                    resultat.append({
                        'tournee_id': tid,
                        'chauffeur_id': cid,
                        'chauffeur': f'{prenom} {nom}',
                        'vehicule': f'VL{cid}',
                        'immatriculation': immat,
                        'capacite_max_kg': c_max,
                        'heure_depart': vrai_depart, 
                        'heure_fin': vrai_retour,    
                        'distance_km': d_km,
                        'arrets': full_arrets
                    })
                    
            return resultat

    def recuperer_imprevus(self, date_jour):
        """Récupère les détails des collectes en statut erreur."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT t.id, c.nom_entreprise, c.adresse, t.commentaire, t.type_imprevu, 
                       t.heure_estimee, ch.prenom || ' ' || ch.nom 
                FROM taches_collecte t 
                JOIN clients c ON t.client_id = c.id 
                LEFT JOIN tournees_jour tj ON t.tournee_id = tj.id 
                LEFT JOIN chauffeurs ch ON tj.chauffeur_id = ch.id 
                WHERE t.date_planifiee = ? AND t.statut = 'erreur' 
                ORDER BY t.id DESC
            """, (date_jour,))
            
            return [{
                'tache_id': l[0], 'client_nom': l[1], 'adresse': l[2] or 'N/A', 
                'raison': l[3] or 'N/A', 'type_imprevu': l[4] or 'autre', 
                'heure': l[5] or 'N/A', 'chauffeur': l[6] or 'N/A'
            } for l in cursor.fetchall()]

    def get_planning_preview(self, date_jour):
        """Affiche les ressources disponibles pour une date de planification."""
        date_obj = datetime.datetime.strptime(date_jour, '%Y-%m-%d')
        j_semaine = date_obj.weekday() + 1
        
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            # Clients ayant une collecte récurrente ce jour-là (hors exceptions)
            cursor.execute('''
                SELECT c.id, c.nom_entreprise, c.latitude, c.longitude
                FROM clients c
                JOIN disponibilites_clients d ON d.client_id = c.id
                WHERE d.jour_semaine = ?
                AND c.id NOT IN (
                    SELECT client_id FROM exceptions_calendrier_clients
                    WHERE date_exception = ? AND est_ferme = 1
                )
                GROUP BY c.id
            ''', (j_semaine, date_jour))
            
            clients_jour = [
                {'id': r[0], 'nom_entreprise': r[1], 'latitude': r[2], 'longitude': r[3]}
                for r in cursor.fetchall()
            ]
            
            cursor.execute('SELECT COUNT(chauffeur_id) FROM disponibilites_chauffeurs WHERE jour_semaine = ?', (j_semaine,))
            ch_dispo = cursor.fetchone()[0] or 0
            
            return {
                'clients_dispo': len(clients_jour),
                'chauffeurs_dispo': ch_dispo,
                'clients_jour': clients_jour,
            }

    def generer_brouillons_jour(self, date_jour):
        """
        Initialise les tournées et les tâches de collecte pour une journée.
        Supprime les plannings existants non validés.
        """
        date_obj = datetime.datetime.strptime(date_jour, '%Y-%m-%d')
        j_semaine = date_obj.weekday() + 1
        
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Nettoyage des tournées non commencées
            cursor.execute("DELETE FROM tournees_jour WHERE date_tournee = ? AND statut NOT IN ('demarree', 'terminee')", (date_jour,))
            
            # 2. Création des enveloppes de tournées (une par chauffeur disponible)
            cursor.execute('SELECT chauffeur_id, heure_debut, heure_fin FROM disponibilites_chauffeurs WHERE jour_semaine = ?', (j_semaine,))
            chauffeurs = cursor.fetchall()
            
            if chauffeurs:
                cursor.execute('SELECT id FROM camions ORDER BY id ASC')
                camions = [r[0] for r in cursor.fetchall()]
                
                if camions:
                    for i, (cid, hd, hf) in enumerate(chauffeurs):
                        # Ajustement de l'heure de début si le chauffeur a déjà fini une tournée
                        cursor.execute("""
                            SELECT MAX(heure_fin_service) FROM tournees_jour 
                            WHERE chauffeur_id = ? AND date_tournee = ? AND statut IN ('demarree', 'terminee')
                        """, (cid, date_jour))
                        derniere_fin = cursor.fetchone()[0]
                        
                        h_debut_ajustee = hd
                        if derniere_fin:
                            # Pause obligatoire de 30 minutes au dépôt entre deux shifts
                            fin_m = heure_vers_minutes(derniere_fin) + 30
                            hd_m = heure_vers_minutes(hd)
                            h_debut_ajustee = minutes_en_heure(max(hd_m, fin_m))
                            
                        if heure_vers_minutes(h_debut_ajustee) < heure_vers_minutes(hf):
                            cursor.execute('''
                                INSERT INTO tournees_jour (date_tournee, chauffeur_id, camion_id, depot_id, heure_debut_service, heure_fin_service, statut) 
                                VALUES (?, ?, ?, 1, ?, ?, "brouillon")
                            ''', (date_jour, cid, camions[i % len(camions)], h_debut_ajustee, hf))
            
            # 3. Nettoyage des tâches non protégées (non validées ou replanifiées)
            cursor.execute("""
                DELETE FROM taches_collecte 
                WHERE date_planifiee = ? AND type_tache = "collecte"
                AND (tournee_id IS NULL OR tournee_id IN (SELECT id FROM tournees_jour WHERE statut NOT IN ('demarree', 'terminee')))
                AND statut NOT IN ('terminee', 'erreur')
                AND (commentaire IS NULL OR commentaire != "Replanifié par l'administration")
            """, (date_jour,))
            
            # 4. Import des clients programmés pour ce jour de la semaine
            cursor.execute("""
                SELECT d.client_id, d.poids_prevu_kg 
                FROM disponibilites_clients d 
                WHERE d.jour_semaine = ? 
                AND d.client_id NOT IN (SELECT client_id FROM exceptions_calendrier_clients WHERE date_exception = ? AND est_ferme = 1)
                AND d.client_id NOT IN (SELECT client_id FROM taches_collecte WHERE date_planifiee = ?)
            """, (j_semaine, date_jour, date_jour))
            
            ins = 0
            for c_id, p_est in cursor.fetchall():
                # Estimation du nombre de bacs (poids / 40kg)
                cursor.execute('''
                    INSERT INTO taches_collecte (client_id, date_planifiee, type_tache, bacs_prevus, poids_prevu_kg, statut) 
                    VALUES (?, ?, "collecte", ?, ?, "en_attente")
                ''', (c_id, date_jour, math.ceil(p_est / 40), p_est))
                ins += 1
                
            conn.commit()
            return {'status': 'succes', 'taches_creees': ins}

    def sauvegarder_resultat_optimisation(self, date_jour, resultats_ia, data_ortools):
        """
        Persiste les résultats du solveur OR-Tools dans la base de données.
        Gère la création de tournées physiques à partir de trips virtuels.
        """
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # Reset des affectations actuelles (non démarrées)
            cursor.execute("""
                UPDATE taches_collecte 
                SET tournee_id = NULL, ordre_passage = NULL, statut = 'en_attente'
                WHERE date_planifiee = ?
                AND (tournee_id IS NULL OR tournee_id IN (SELECT id FROM tournees_jour WHERE statut NOT IN ('demarree', 'terminee')))
                AND statut NOT IN ('terminee', 'erreur')
            """, (date_jour,))
            
            # Nettoyage des tournées brouillons orphelines
            ids_valides = list(set(data_ortools['tournee_bdd_ids']))
            if ids_valides:
                p = ','.join(('?' for _ in ids_valides))
                cursor.execute(f'''
                    DELETE FROM tournees_jour 
                    WHERE date_tournee = ? AND id NOT IN ({p})
                    AND statut NOT IN ('demarree', 'terminee')
                ''', [date_jour] + ids_valides)
                
            cursor.execute("UPDATE tournees_jour SET distance_km = 0 WHERE date_tournee = ? AND statut NOT IN ('demarree', 'terminee')", (date_jour,))    
            
            routes = resultats_ia['routes']
            distances = resultats_ia['distances']
            tournees_utilisees = {}
            
            for v_id, sequence in routes.items():
                if len(sequence) <= 2: continue
                
                base_tid = data_ortools['tournee_bdd_ids'][v_id]
                dist = distances.get(v_id, 0)
                times = resultats_ia['times'].get(v_id, {})
                h_dep_ia = times.get('depart', '06:00')
                h_ret_ia = times.get('retour', '16:00')

                # Si c'est le premier trip du chauffeur, on met à jour la tournée existante
                if base_tid not in tournees_utilisees:
                    tournees_utilisees[base_tid] = 1
                    current_tid = base_tid
                    cursor.execute('''
                        UPDATE tournees_jour 
                        SET distance_km = ?, heure_debut_service = ?, heure_fin_service = ?
                        WHERE id = ?
                    ''', (dist, h_dep_ia, h_ret_ia, current_tid))
                else:
                    # Pour les trips suivants, on crée de nouvelles lignes de tournée
                    cursor.execute('SELECT date_tournee, chauffeur_id, camion_id, depot_id FROM tournees_jour WHERE id = ?', (base_tid,))
                    info = cursor.fetchone()
                    cursor.execute("""
                        INSERT INTO tournees_jour 
                        (date_tournee, chauffeur_id, camion_id, depot_id, heure_debut_service, heure_fin_service, distance_km, statut)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'affectee')
                    """, (*info, h_dep_ia, h_ret_ia, dist))
                    current_tid = cursor.lastrowid
                
                # Mise à jour des tâches avec leur ordre de passage et heure estimée
                ordre = 1
                for etape in sequence:
                    idx = etape['node_index']
                    h_est = etape['heure_estimee']
                    if idx == 0: continue
                    t_id = data_ortools['tache_ids'][idx]
                    if t_id:
                        cursor.execute("""
                            UPDATE taches_collecte 
                            SET tournee_id = ?, ordre_passage = ?, heure_estimee = ?, statut = 'planifiee'
                            WHERE id = ?
                        """, (current_tid, ordre, h_est, t_id))
                        ordre += 1
            
            cursor.execute("UPDATE tournees_jour SET statut = 'affectee' WHERE date_tournee = ? AND statut = 'brouillon'", (date_jour,))
            conn.commit()

    def preparer_donnees_recalcul_dynamique(self, tournee_id, imprevu_tache_id):
        """Prépare un problème de ré-optimisation à partir de la position actuelle d'un camion."""
        data = {}
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Localisation actuelle du camion (dernier point servi)
            cursor.execute("""
                SELECT c.latitude, c.longitude FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.tournee_id = ? AND t.statut IN ('terminee', 'erreur')
                ORDER BY t.ordre_passage DESC LIMIT 1
            """, (tournee_id,))
            dernier = cursor.fetchone()
            
            if dernier:
                depot_lat, depot_lon = dernier[0], dernier[1]
            else:
                depot = self.recuperer_depot_principal()
                depot_lat, depot_lon = depot['latitude'], depot['longitude']

            # 2. Points restants à parcourir
            cursor.execute("""
                SELECT t.id, t.bacs_prevus, t.poids_prevu_kg, c.latitude, c.longitude, c.nom_entreprise
                FROM taches_collecte t JOIN clients c ON t.client_id = c.id
                WHERE t.tournee_id = ? AND t.statut = 'planifiee' ORDER BY t.ordre_passage ASC
            """, (tournee_id,))
            reste = cursor.fetchall()

            # 3. Données de l'imprévu à insérer
            cursor.execute("""
                SELECT t.id, t.bacs_prevus, t.poids_prevu_kg, c.latitude, c.longitude, c.nom_entreprise
                FROM taches_collecte t JOIN clients c ON t.client_id = c.id WHERE t.id = ?
            """, (imprevu_tache_id,))
            imprevu = cursor.fetchone()
            
            if not imprevu: return None
            taches_futures = reste + [imprevu]

            # 4. Formatage
            coordonnees = [(depot_lat, depot_lon)]
            data.update({
                'demands': [0], 'weight_demands': [0], 'tache_ids': [None], 
                'num_vehicles': 1, 'depot': 0, 'vehicle_capacities': [9999], 
                'vehicle_weights': [99999], 'time_windows': [(0, 1440)] * (len(taches_futures) + 1),
                'vehicle_time_windows': [(0, 1440)], 'tournee_bdd_ids': [tournee_id], 
                'groupes_vehicules': [1], 'driver_names': ["Recalcul Dynamique"]
            })
            
            for t in taches_futures:
                data['tache_ids'].append(t[0])
                coordonnees.append((t[3], t[4]))
                data['demands'].append(t[1] or 0)
                data['weight_demands'].append(t[2] or 0)
            
            matrices = calculer_distance_matrice(coordonnees)
            data['distance_matrix'] = matrices['distances']
            data['time_matrix'] = matrices['durations']
            return data

    def sauvegarder_fusion_dynamique(self, tournee_id, sequence, tache_ids):
        """Injecte les résultats du recalcul dynamique dans le planning existant."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT MAX(ordre_passage) FROM taches_collecte WHERE tournee_id = ? AND statut IN ('terminee', 'erreur')", (tournee_id,))
            max_ordre = cursor.fetchone()[0] or 0
            
            nouvel_ordre = max_ordre + 1
            for etape in sequence:
                idx = etape['node_index']
                if idx == 0: continue
                
                t_id = tache_ids[idx]
                cursor.execute("""
                    UPDATE taches_collecte 
                    SET tournee_id = ?, ordre_passage = ?, statut = 'planifiee', type_imprevu = 'integre_dynamiquement'
                    WHERE id = ?
                """, (tournee_id, nouvel_ordre, t_id))
                nouvel_ordre += 1
                
            conn.commit()
            return True
    
    def remettre_imprevu_en_attente(self, tache_id):
        """Détache une tâche de sa tournée pour permettre sa ré-optimisation future."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE taches_collecte 
                SET statut = 'en_attente', bacs_reels = 0, 
                    commentaire = "Replanifié par l'administration",
                    type_imprevu = 'replanifie', tournee_id = NULL, ordre_passage = NULL
                WHERE id = ?
            """, (tache_id,))
            conn.commit()
            return cursor.rowcount > 0
