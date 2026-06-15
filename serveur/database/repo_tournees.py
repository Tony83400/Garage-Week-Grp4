import sqlite3
import math
import datetime
import requests
import random
import os

def heure_vers_minutes(heure_str):
    if not heure_str:
        return 0
    h, m, s = map(int, heure_str.split(':'))
    return h * 60 + m

def calculer_distance_matrice(coordonnees):
    """
    Appelle l'API OpenRouteService pour obtenir la matrice de distances pour CAMIONS.
    """
    locations = [[lon, lat] for lat, lon in coordonnees]
    API_KEY = os.getenv('OPENROUTESERVICE_KEY')
    if not API_KEY or API_KEY == 'votre_cle_ici':
        return calculer_distance_euclidienne_fallback(coordonnees)
    url = 'https://api.openrouteservice.org/v2/matrix/driving-hgv'
    headers = {'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8', 'Authorization': API_KEY, 'Content-Type': 'application/json; charset=utf-8'}
    body = {'locations': locations, 'metrics': ['distance', 'duration']}
    try:
        response = requests.post(url, json=body, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            distances = [[int(dist) for dist in row] for row in data['distances']]
            durations = [[int(dur // 60) for dur in row] for row in data['durations']]
            return {'distances': distances, 'durations': durations}
        return calculer_distance_euclidienne_fallback(coordonnees)
    except Exception:
        return calculer_distance_euclidienne_fallback(coordonnees)

def calculer_distance_euclidienne_fallback(coordonnees):
    n = len(coordonnees)
    matrice_dist = [[0] * n for _ in range(n)]
    matrice_time = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                dist = math.sqrt((coordonnees[i][0] - coordonnees[j][0]) ** 2 + (coordonnees[i][1] - coordonnees[j][1]) ** 2)
                dist_metres = int(dist * 100000)
                matrice_dist[i][j] = dist_metres
                matrice_time[i][j] = dist_metres // 500
    return {'distances': matrice_dist, 'durations': matrice_time}

class TourneeRepository:

    def __init__(self, db_core):
        self.db_core = db_core

    def ajouter_disponibilite_client(self, client_id, jour_semaine, heure_debut, heure_fin):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO disponibilites_clients (client_id, jour_semaine, heure_debut, heure_fin) VALUES (?, ?, ?, ?)', (client_id, jour_semaine, heure_debut, heure_fin))
            conn.commit()

    def planifier_tache_collecte(self, client_id, date_planifiee, bacs_prevus):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO taches_collecte (client_id, date_planifiee, bacs_prevus, statut) VALUES (?, ?, ?, ?)', (client_id, date_planifiee, bacs_prevus, 'en_attente'))
            conn.commit()
            return cursor.lastrowid

    def recuperer_taches_du_jour(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT t.id, t.bacs_prevus, c.nom_entreprise, c.latitude, c.longitude FROM taches_collecte t JOIN clients c ON t.client_id = c.id WHERE t.date_planifiee = ? AND t.statut = 'en_attente' ", (date_jour,))
            return cursor.fetchall()

    def recuperer_depot_principal(self):
        """Récupère les coordonnées du premier dépôt (La Farlède)."""
        with self.db_core.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM depots LIMIT 1')
            row = cursor.fetchone()
            return dict(row) if row else None

    def preparer_donnees_ortools(self, date_jour, depot_lat, depot_lon):
        data = {}
        MIN_GLOBAL = 180
        MAX_GLOBAL = 1200
        TRIPS_PAR_CHAUFFEUR = 3
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('\n                SELECT c.bacs_max, c.charge_max_kg, ch.nom, tj.heure_debut_service, tj.heure_fin_service, ch.id, tj.id\n                FROM tournees_jour tj\n                JOIN camions c ON tj.camion_id = c.id\n                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id\n                WHERE tj.date_tournee = ?\n                ORDER BY tj.id ASC\n            ', (date_jour,))
            camions_jour = cursor.fetchall()
            data['vehicle_capacities'] = []
            data['vehicle_weights'] = []
            data['vehicle_time_windows'] = []
            data['driver_names'] = []
            data['groupes_vehicules'] = []
            data['tournee_bdd_ids'] = []
            for index, c in enumerate(camions_jour):
                bacs_max, charge_max, nom_chauffeur, heure_debut, heure_fin, chauffeur_id, tournee_bdd_id = c
                debut_min = heure_vers_minutes(heure_debut)
                fin_min = heure_vers_minutes(heure_fin)
                for trip in range(TRIPS_PAR_CHAUFFEUR):
                    data['vehicle_capacities'].append(bacs_max)
                    data['vehicle_weights'].append(charge_max)
                    data['driver_names'].append(f'{nom_chauffeur} (Trip {trip + 1})')
                    data['vehicle_time_windows'].append((debut_min, fin_min))
                    data['groupes_vehicules'].append(chauffeur_id)
                    data['tournee_bdd_ids'].append(tournee_bdd_id)
            data['num_vehicles'] = len(data['vehicle_capacities'])
            data['depot'] = 0
            cursor.execute("\n                SELECT t.id, t.bacs_prevus, t.poids_prevu_kg, c.latitude, c.longitude, c.nom_entreprise\n                FROM taches_collecte t\n                JOIN clients c ON t.client_id = c.id\n                WHERE t.date_planifiee = ? \n                AND t.statut = 'en_attente' \n                AND t.type_tache = 'collecte'\n            ", (date_jour,))
            taches = cursor.fetchall()
            coordonnees = [(depot_lat, depot_lon)]
            data['demands'] = [0]
            data['weight_demands'] = [0]
            data['time_windows'] = [(MIN_GLOBAL, MAX_GLOBAL)]
            data['tache_ids'] = [None]
            data['infos_geo'] = {0: {'nom': 'Dépôt', 'lat': depot_lat, 'lon': depot_lon}}
            for index, tache in enumerate(taches, start=1):
                tache_id, bacs, poids, lat, lon, nom = tache
                data['tache_ids'].append(tache_id)
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
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE tournees_jour SET statut = ? WHERE id = ?', (statut, tournee_id))
            conn.commit()
            return cursor.rowcount > 0

    def valider_collecte(self, tache_id, bacs_reels):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE taches_collecte SET bacs_reels = ?, statut = "terminee" WHERE id = ?', (bacs_reels, tache_id))
            conn.commit()
            return cursor.rowcount > 0

    def mettre_a_jour_statut_etape(self, tache_id, statut, bacs_reels=None, commentaire=None, type_imprevu=None):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE taches_collecte SET statut = ?, bacs_reels = ?, commentaire = ?, type_imprevu = ? WHERE id = ?', (statut, bacs_reels, commentaire, type_imprevu, tache_id))
            conn.commit()
            return cursor.rowcount > 0

    def recuperer_tournee_chauffeur(self, chauffeur_id, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("\n                SELECT tj.id, ch.prenom || ' ' || ch.nom, c.immatriculation, c.charge_max_kg, tj.heure_debut_service, tj.statut\n                FROM tournees_jour tj\n                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id\n                JOIN camions c ON tj.camion_id = c.id\n                WHERE tj.chauffeur_id = ? AND tj.date_tournee = ? \n                AND tj.statut IN ('demarree', 'affectee')\n                ORDER BY CASE WHEN tj.statut = 'demarree' THEN 0 ELSE 1 END ASC, tj.id ASC\n                LIMIT 1\n            ", (chauffeur_id, date_jour))
            tournee_info = cursor.fetchone()
            if not tournee_info:
                return None
            tournee_bdd_id, chauffeur_nom, immatriculation, capacite, heure_depart, statut = tournee_info
            cursor.execute('\n                SELECT t.id, t.statut, t.bacs_prevus, t.poids_prevu_kg, t.ordre_passage,\n                       c.nom_entreprise, c.latitude, c.longitude\n                FROM taches_collecte t\n                JOIN clients c ON t.client_id = c.id\n                WHERE t.tournee_id = ?\n                ORDER BY t.ordre_passage ASC\n            ', (tournee_bdd_id,))
            lignes = cursor.fetchall()
            arrets = []
            for l in lignes:
                arrets.append({'tache_id': l[0], 'statut': l[1], 'bacs_prevus': l[2], 'poids_prevu_kg': l[3], 'ordre': l[4], 'client_nom': l[5], 'latitude': l[6], 'longitude': l[7]})
            return {'tournee_id': tournee_bdd_id, 'chauffeur': chauffeur_nom, 'vehicule': f'VL{chauffeur_id}', 'immatriculation': immatriculation, 'capacite_max_kg': capacite, 'heure_depart': heure_depart, 'statut': statut, 'arrets': arrets}

    def get_dashboard_stats(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT SUM(poids_prevu_kg), COUNT(id), SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END), SUM(CASE WHEN statut = 'terminee' THEN poids_prevu_kg ELSE 0 END) FROM taches_collecte WHERE date_planifiee = ? AND type_tache = 'collecte' AND tournee_id IS NOT NULL", (date_jour,))
            res = cursor.fetchone()
            p_total, t_coll, c_val, p_coll = (res[0] or 0, res[1] or 0, res[2] or 0, res[3] or 0)
            cursor.execute('SELECT COUNT(id) FROM taches_collecte WHERE date_planifiee = ? AND statut = "erreur"', (date_jour,))
            alertes = cursor.fetchone()[0] or 0
            cursor.execute('SELECT SUM(distance_km) FROM tournees_jour WHERE date_tournee = ?', (date_jour,))
            km_total = cursor.fetchone()[0] or 0
            cursor.execute("SELECT ch.prenom, c.nom_entreprise, COUNT(CASE WHEN t.type_tache = 'collecte' THEN 1 END), COUNT(CASE WHEN t.type_tache = 'collecte' AND t.statut = 'terminee' THEN 1 END), COUNT(CASE WHEN t.type_tache = 'collecte' AND t.statut = 'erreur' THEN 1 END) FROM tournees_jour tj JOIN chauffeurs ch ON tj.chauffeur_id = ch.id JOIN taches_collecte t ON tj.id = t.tournee_id LEFT JOIN clients c ON t.client_id = c.id AND t.statut = 'terminee' AND t.ordre_passage = (SELECT MAX(t2.ordre_passage) FROM taches_collecte t2 WHERE t2.tournee_id = tj.id AND t2.statut = 'terminee' AND t2.type_tache = 'collecte') WHERE tj.date_tournee = ? GROUP BY tj.id, ch.prenom", (date_jour,))
            flotte = []
            for prenom, dernier_client, total, done, erreurs in cursor.fetchall():
                flotte.append({'chauffeur': prenom, 'dernier_point': 'Retour dépôt · La Farlède' if (total or 0) > 0 and (done or 0) + (erreurs or 0) >= total else dernier_client or 'En route', 'termine': total > 0 and done + erreurs >= total, 'erreurs': erreurs})
            return {'poids_prevu_kg': p_total, 'poids_collecte_kg': p_coll, 'collectes_total': t_coll, 'collectes_validees': c_val, 'alertes': alertes, 'km_total': round(km_total, 1), 'flotte': flotte}

    def get_activite_recente(self, date_jour, limite=5):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT t.statut, c.nom_entreprise, c.latitude, c.longitude FROM taches_collecte t JOIN clients c ON t.client_id = c.id WHERE t.date_planifiee = ? AND t.statut IN ("terminee", "erreur") ORDER BY t.id DESC LIMIT ?', (date_jour, limite))
            return [{'statut': l[0], 'client': l[1], 'coordonnees': {'lat': l[2], 'lon': l[3]}} for l in cursor.fetchall()]

    def get_tournees_detaillees(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT nom, latitude, longitude FROM depots LIMIT 1')
            depot_row = cursor.fetchone()
            depot_info = {'client_nom': depot_row[0] if depot_row else 'Dépôt (La Farlède)', 'latitude': depot_row[1] if depot_row else 43.167, 'longitude': depot_row[2] if depot_row else 6.043, 'statut': 'depot'}
            cursor.execute('SELECT tj.id, tj.chauffeur_id, c.immatriculation, c.charge_max_kg, ch.nom, ch.prenom, tj.heure_debut_service, tj.heure_fin_service, tj.distance_km FROM tournees_jour tj JOIN camions c ON tj.camion_id = c.id JOIN chauffeurs ch ON tj.chauffeur_id = ch.id WHERE tj.date_tournee = ?', (date_jour,))
            resultat = []
            for tid, cid, immat, c_max, nom, prenom, h_dep, h_fin, d_km in cursor.fetchall():
                cursor.execute('SELECT t.id, t.statut, t.poids_prevu_kg, c.nom_entreprise, t.ordre_passage, c.latitude, c.longitude, t.heure_estimee FROM taches_collecte t JOIN clients c ON t.client_id = c.id WHERE t.date_planifiee = ? AND t.tournee_id = ? ORDER BY t.ordre_passage ASC', (date_jour, tid))
                arrets_clients = [{'tache_id': a[0], 'statut': a[1], 'poids_prevu_kg': a[2], 'client_nom': a[3], 'ordre': a[4] or 0, 'latitude': a[5], 'longitude': a[6], 'heure_estimee': a[7]} for a in cursor.fetchall()]
                if arrets_clients:
                    depot_depart = depot_info.copy()
                    depot_depart['heure_estimee'] = h_dep
                    depot_depart['ordre'] = 0
                    depot_retour = depot_info.copy()
                    depot_retour['heure_estimee'] = h_fin
                    depot_retour['ordre'] = len(arrets_clients) + 1
                    full_arrets = [depot_depart] + arrets_clients + [depot_retour]
                    resultat.append({'chauffeur_id': cid, 'chauffeur': f'{prenom} {nom}', 'vehicule': f'VL{cid}', 'immatriculation': immat, 'capacite_max_kg': c_max, 'heure_depart': h_dep, 'heure_fin': h_fin, 'distance_km': d_km, 'arrets': full_arrets})
            return resultat

    def recuperer_imprevus(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT t.id, c.nom_entreprise, c.adresse, t.commentaire, t.type_imprevu, t.heure_estimee, ch.prenom || ' ' || ch.nom FROM taches_collecte t JOIN clients c ON t.client_id = c.id LEFT JOIN tournees_jour tj ON t.tournee_id = tj.id LEFT JOIN chauffeurs ch ON tj.chauffeur_id = ch.id WHERE t.date_planifiee = ? AND t.statut = 'erreur' ORDER BY t.id DESC", (date_jour,))
            return [{'tache_id': l[0], 'client_nom': l[1], 'adresse': l[2] or 'N/A', 'raison': l[3] or 'N/A', 'type_imprevu': l[4] or 'autre', 'heure': l[5] or 'N/A', 'chauffeur': l[6] or 'N/A'} for l in cursor.fetchall()]

    def get_planning_preview(self, date_jour):
        date_obj = datetime.datetime.strptime(date_jour, '%Y-%m-%d')
        jour_semaine = date_obj.weekday() + 1
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(DISTINCT d.client_id) FROM disponibilites_clients d WHERE d.jour_semaine = ? AND d.client_id NOT IN (SELECT client_id FROM exceptions_calendrier_clients WHERE date_exception = ? AND est_ferme = 1)', (jour_semaine, date_jour))
            c_dispo = cursor.fetchone()[0] or 0
            cursor.execute('SELECT COUNT(chauffeur_id) FROM disponibilites_chauffeurs WHERE jour_semaine = ?', (jour_semaine,))
            return {'clients_dispo': c_dispo, 'chauffeurs_dispo': cursor.fetchone()[0] or 0}

    def generer_brouillons_jour(self, date_jour):
        date_obj = datetime.datetime.strptime(date_jour, '%Y-%m-%d')
        jour_semaine = date_obj.weekday() + 1
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM tournees_jour WHERE date_tournee = ?', (date_jour,))
            cursor.execute('SELECT chauffeur_id, heure_debut, heure_fin FROM disponibilites_chauffeurs WHERE jour_semaine = ?', (jour_semaine,))
            ch_dispo = cursor.fetchall()
            if ch_dispo:
                cursor.execute('SELECT id FROM camions ORDER BY id ASC')
                camions = [r[0] for r in cursor.fetchall()]
                if camions:
                    for i, (cid, hd, hf) in enumerate(ch_dispo):
                        cursor.execute('INSERT INTO tournees_jour (date_tournee, chauffeur_id, camion_id, depot_id, heure_debut_service, heure_fin_service, statut) VALUES (?, ?, ?, 1, ?, ?, "brouillon")', (date_jour, cid, camions[i % len(camions)], hd, hf))
            cursor.execute('DELETE FROM taches_collecte WHERE date_planifiee = ? AND type_tache = "collecte"', (date_jour,))
            cursor.execute('SELECT d.client_id, d.poids_prevu_kg FROM disponibilites_clients d WHERE d.jour_semaine = ? AND d.client_id NOT IN (SELECT client_id FROM exceptions_calendrier_clients WHERE date_exception = ? AND est_ferme = 1)', (jour_semaine, date_jour))
            t_ins = 0
            for client_id, p_est in cursor.fetchall():
                cursor.execute('INSERT INTO taches_collecte (client_id, date_planifiee, type_tache, bacs_prevus, poids_prevu_kg, statut) VALUES (?, ?, "collecte", ?, ?, "en_attente")', (client_id, date_jour, math.ceil(p_est / 40), p_est))
                t_ins += 1
            conn.commit()
            return {'status': 'succes', 'taches_creees': t_ins}

    def sauvegarder_resultat_optimisation(self, date_jour, resultats_ia, data_ortools):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("\n                UPDATE taches_collecte \n                SET tournee_id = NULL, ordre_passage = NULL, statut = 'en_attente'\n                WHERE date_planifiee = ?\n            ", (date_jour,))
            ids_base = list(set(data_ortools['tournee_bdd_ids']))
            if ids_base:
                placeholders = ','.join(('?' for _ in ids_base))
                cursor.execute(f'\n                    DELETE FROM tournees_jour \n                    WHERE date_tournee = ? AND id NOT IN ({placeholders})\n                ', [date_jour] + ids_base)
            cursor.execute('\n                UPDATE tournees_jour \n                SET distance_km = 0 \n                WHERE date_tournee = ?\n            ', (date_jour,))
            routes_optimales = resultats_ia['routes']
            distances_optimales = resultats_ia['distances']
            tournees_traitees = {}
            for vehicule_id, sequence_noeuds in routes_optimales.items():
                if len(sequence_noeuds) <= 2:
                    continue
                base_tournee_id = data_ortools['tournee_bdd_ids'][vehicule_id]
                dist_km = distances_optimales.get(vehicule_id, 0)
                if base_tournee_id not in tournees_traitees:
                    tournees_traitees[base_tournee_id] = 1
                    tournee_id_a_utiliser = base_tournee_id
                    cursor.execute('\n                        UPDATE tournees_jour \n                        SET distance_km = ?\n                        WHERE id = ?\n                    ', (dist_km, tournee_id_a_utiliser))
                else:
                    tournees_traitees[base_tournee_id] += 1
                    cursor.execute('\n                        SELECT date_tournee, chauffeur_id, camion_id, depot_id, heure_debut_service, heure_fin_service \n                        FROM tournees_jour WHERE id = ?\n                    ', (base_tournee_id,))
                    base_info = cursor.fetchone()
                    cursor.execute("\n                        INSERT INTO tournees_jour \n                        (date_tournee, chauffeur_id, camion_id, depot_id, heure_debut_service, heure_fin_service, distance_km, statut)\n                        VALUES (?, ?, ?, ?, ?, ?, ?, 'affectee')\n                    ", (*base_info, dist_km))
                    tournee_id_a_utiliser = cursor.lastrowid
                ordre_passage = 1
                for etape in sequence_noeuds:
                    noeud_index = etape['node_index']
                    heure_estimee = etape['heure_estimee']
                    if noeud_index == 0:
                        continue
                    tache_id = data_ortools['tache_ids'][noeud_index]
                    if tache_id:
                        cursor.execute("\n                            UPDATE taches_collecte \n                            SET tournee_id = ?, ordre_passage = ?, heure_estimee = ?, statut = 'planifiee'\n                            WHERE id = ?\n                        ", (tournee_id_a_utiliser, ordre_passage, heure_estimee, tache_id))
                        ordre_passage += 1
            cursor.execute("\n                UPDATE tournees_jour \n                SET statut = 'affectee' \n                WHERE date_tournee = ? AND statut = 'brouillon'\n            ", (date_jour,))
            conn.commit()
            print("Résultats de l'optimisation IA enregistrés (Multi-trips séparés avec succès) !")