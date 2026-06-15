import sqlite3
import math
import datetime
import requests
import random
import os

def heure_vers_minutes(heure_str):
    if not heure_str: return 0
    h, m, s = map(int, heure_str.split(':'))
    return h * 60 + m

def calculer_distance_matrice(coordonnees):
    """
    Appelle l'API OpenRouteService pour obtenir la matrice de distances pour CAMIONS.
    """
    locations = [[lon, lat] for lat, lon in coordonnees]
    API_KEY = os.getenv("OPENROUTESERVICE_KEY")
    
    if not API_KEY or API_KEY == "votre_cle_ici":
        return calculer_distance_euclidienne_fallback(coordonnees)

    url = "https://api.openrouteservice.org/v2/matrix/driving-hgv"
    headers = {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        'Authorization': API_KEY,
        'Content-Type': 'application/json; charset=utf-8'
    }
    body = {"locations": locations, "metrics": ["distance", "duration"]}
    
    try:
        response = requests.post(url, json=body, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            distances = [[int(dist) for dist in row] for row in data['distances']]
            durations = [[int(dur // 60) for dur in row] for row in data['durations']]
            return {"distances": distances, "durations": durations}
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
                dist = math.sqrt((coordonnees[i][0] - coordonnees[j][0])**2 + (coordonnees[i][1] - coordonnees[j][1])**2)
                dist_metres = int(dist * 100000)
                matrice_dist[i][j] = dist_metres
                matrice_time[i][j] = dist_metres // 500
    return {"distances": matrice_dist, "durations": matrice_time}

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
            cursor.execute('''SELECT t.id, t.bacs_prevus, c.nom_entreprise, c.latitude, c.longitude FROM taches_collecte t JOIN clients c ON t.client_id = c.id WHERE t.date_planifiee = ? AND t.statut = 'en_attente' ''', (date_jour,))
            return cursor.fetchall()

    def recuperer_depot_principal(self):
        with self.db_core.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM depots LIMIT 1')
            row = cursor.fetchone()
            return dict(row) if row else None

    def preparer_donnees_ortools(self, date_jour, depot_lat, depot_lon):
        data = {}
        MIN_GLOBAL = 180  # 3h00
        MAX_GLOBAL = 1200 # 20h00
        TRIPS_PAR_CHAUFFEUR = 3 # NOUVEAUTÉ : On autorise jusqu'à 3 allers-retours par jour
        
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # On récupère l'ID du chauffeur et tj.id (TRÈS IMPORTANT pour lier les trips ensuite)
            cursor.execute('''
                SELECT c.bacs_max, c.charge_max_kg, ch.nom, tj.heure_debut_service, tj.heure_fin_service, ch.id, tj.id
                FROM tournees_jour tj
                JOIN camions c ON tj.camion_id = c.id
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                WHERE tj.date_tournee = ?
                ORDER BY tj.id ASC
            ''', (date_jour,))
            camions_jour = cursor.fetchall()
            
            data['vehicle_capacities'] = []
            data['vehicle_weights'] = []
            data['vehicle_time_windows'] = []
            data['driver_names'] = []
            data['groupes_vehicules'] = [] 
            data['tournee_bdd_ids'] = [] # NOUVEAU
            
            for index, c in enumerate(camions_jour):
                bacs_max, charge_max, nom_chauffeur, heure_debut, heure_fin, chauffeur_id, tournee_bdd_id = c
                
                debut_min = heure_vers_minutes(heure_debut)
                fin_min = heure_vers_minutes(heure_fin)
                
                # CRÉATION DES VÉHICULES VIRTUELS (Multi-trip)
                for trip in range(TRIPS_PAR_CHAUFFEUR):
                    data['vehicle_capacities'].append(bacs_max)
                    data['vehicle_weights'].append(charge_max)
                    data['driver_names'].append(f"{nom_chauffeur} (Trip {trip+1})")
                    data['vehicle_time_windows'].append((debut_min, fin_min))
                    data['groupes_vehicules'].append(chauffeur_id) # Le même ID permet à OR-Tools de lier les trips !
                    data['tournee_bdd_ids'].append(tournee_bdd_id) # Pour relier tout ça à la même tournée finale
            
            data['num_vehicles'] = len(data['vehicle_capacities'])
            data['depot'] = 0 
            
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

            matrices = calculer_distance_matrice(coordonnees)
            data['distance_matrix'] = matrices['distances']
            data['time_matrix'] = matrices['durations']

            return data

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
            cursor.execute('''SELECT ch.prenom || ' ' || ch.nom, c.immatriculation, c.charge_max_kg, tj.heure_debut_service FROM tournees_jour tj JOIN chauffeurs ch ON tj.chauffeur_id = ch.id JOIN camions c ON tj.camion_id = c.id WHERE tj.chauffeur_id = ? AND tj.date_tournee = ?''', (chauffeur_id, date_jour))
            info = cursor.fetchone()
            if not info: return None
            chauffeur_nom, immat, cap, h_depart = info
            cursor.execute('''SELECT t.id, t.statut, t.bacs_prevus, t.poids_prevu_kg, t.ordre_passage, c.nom_entreprise, c.latitude, c.longitude FROM taches_collecte t JOIN clients c ON t.client_id = c.id JOIN tournees_jour tj ON t.tournee_id = tj.id WHERE tj.chauffeur_id = ? AND tj.date_tournee = ? ORDER BY t.ordre_passage ASC''', (chauffeur_id, date_jour))
            arrets = [{"tache_id": l[0], "statut": l[1], "bacs_prevus": l[2], "poids_prevu_kg": l[3], "ordre": l[4], "client_nom": l[5], "latitude": l[6], "longitude": l[7]} for l in cursor.fetchall()]
            return {"chauffeur": chauffeur_nom, "vehicule": f"VL{chauffeur_id}", "immatriculation": immat, "capacite_max_kg": cap, "heure_depart": h_depart, "arrets": arrets}

    def get_dashboard_stats(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''SELECT SUM(poids_prevu_kg), COUNT(id), SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END), SUM(CASE WHEN statut = 'terminee' THEN poids_prevu_kg ELSE 0 END) FROM taches_collecte WHERE date_planifiee = ? AND type_tache = 'collecte' AND tournee_id IS NOT NULL''', (date_jour,))
            res = cursor.fetchone()
            p_total, t_coll, c_val, p_coll = res[0] or 0, res[1] or 0, res[2] or 0, res[3] or 0
            cursor.execute('SELECT COUNT(id) FROM taches_collecte WHERE date_planifiee = ? AND statut = "erreur"', (date_jour,))
            alertes = cursor.fetchone()[0] or 0
            cursor.execute('SELECT SUM(distance_km) FROM tournees_jour WHERE date_tournee = ?', (date_jour,))
            km_total = cursor.fetchone()[0] or 0
            cursor.execute('''SELECT ch.prenom, c.nom_entreprise, COUNT(CASE WHEN t.type_tache = 'collecte' THEN 1 END), COUNT(CASE WHEN t.type_tache = 'collecte' AND t.statut = 'terminee' THEN 1 END), COUNT(CASE WHEN t.type_tache = 'collecte' AND t.statut = 'erreur' THEN 1 END) FROM tournees_jour tj JOIN chauffeurs ch ON tj.chauffeur_id = ch.id JOIN taches_collecte t ON tj.id = t.tournee_id LEFT JOIN clients c ON t.client_id = c.id AND t.statut = 'terminee' AND t.ordre_passage = (SELECT MAX(t2.ordre_passage) FROM taches_collecte t2 WHERE t2.tournee_id = tj.id AND t2.statut = 'terminee' AND t2.type_tache = 'collecte') WHERE tj.date_tournee = ? GROUP BY tj.id, ch.prenom''', (date_jour,))
            flotte = []
            for prenom, dernier_client, total, done, erreurs in cursor.fetchall():
                flotte.append({"chauffeur": prenom, "dernier_point": 'Retour dépôt · La Farlède' if (total or 0) > 0 and ((done or 0) + (erreurs or 0)) >= total else (dernier_client or 'En route'), "termine": total > 0 and (done + erreurs) >= total, "erreurs": erreurs})
            return {"poids_prevu_kg": p_total, "poids_collecte_kg": p_coll, "collectes_total": t_coll, "collectes_validees": c_val, "alertes": alertes, "km_total": round(km_total, 1), "flotte": flotte}

    def get_activite_recente(self, date_jour, limite=5):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT t.statut, c.nom_entreprise, c.latitude, c.longitude FROM taches_collecte t JOIN clients c ON t.client_id = c.id WHERE t.date_planifiee = ? AND t.statut IN ("terminee", "erreur") ORDER BY t.id DESC LIMIT ?', (date_jour, limite))
            return [{"statut": l[0], "client": l[1], "coordonnees": {"lat": l[2], "lon": l[3]}} for l in cursor.fetchall()]

    def get_tournees_detaillees(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # Récupération dynamique du dépôt
            cursor.execute('SELECT nom, latitude, longitude FROM depots LIMIT 1')
            depot_row = cursor.fetchone()
            depot_info = {"client_nom": depot_row[0] if depot_row else "Dépôt (La Farlède)", 
                          "latitude": depot_row[1] if depot_row else 43.167, 
                          "longitude": depot_row[2] if depot_row else 6.043,
                          "statut": "depot"}

            cursor.execute('''SELECT tj.id, tj.chauffeur_id, c.immatriculation, c.charge_max_kg, ch.nom, ch.prenom, tj.heure_debut_service, tj.heure_fin_service, tj.distance_km FROM tournees_jour tj JOIN camions c ON tj.camion_id = c.id JOIN chauffeurs ch ON tj.chauffeur_id = ch.id WHERE tj.date_tournee = ?''', (date_jour,))
            resultat = []
            for tid, cid, immat, c_max, nom, prenom, h_dep, h_fin, d_km in cursor.fetchall():
                cursor.execute('''SELECT t.id, t.statut, t.poids_prevu_kg, c.nom_entreprise, t.ordre_passage, c.latitude, c.longitude, t.heure_estimee FROM taches_collecte t JOIN clients c ON t.client_id = c.id WHERE t.date_planifiee = ? AND t.tournee_id = ? ORDER BY t.ordre_passage ASC''', (date_jour, tid))
                arrets_clients = [{"tache_id": a[0], "statut": a[1], "poids_prevu_kg": a[2], "client_nom": a[3], "ordre": a[4] or 0, "latitude": a[5], "longitude": a[6], "heure_estimee": a[7]} for a in cursor.fetchall()]
                
                if arrets_clients:
                    # On insère le dépôt au début et à la fin
                    depot_depart = depot_info.copy()
                    depot_depart["heure_estimee"] = h_dep
                    depot_depart["ordre"] = 0
                    
                    depot_retour = depot_info.copy()
                    depot_retour["heure_estimee"] = h_fin
                    depot_retour["ordre"] = len(arrets_clients) + 1
                    
                    full_arrets = [depot_depart] + arrets_clients + [depot_retour]

                    resultat.append({
                        "chauffeur_id": cid, 
                        "chauffeur": f"{prenom} {nom}", 
                        "vehicule": f"VL{cid}", 
                        "immatriculation": immat, 
                        "capacite_max_kg": c_max, 
                        "heure_depart": h_dep, 
                        "heure_fin": h_fin, 
                        "distance_km": d_km, 
                        "arrets": full_arrets
                    })
            return resultat

    def recuperer_imprevus(self, date_jour):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''SELECT t.id, c.nom_entreprise, c.adresse, t.commentaire, t.type_imprevu, t.heure_estimee, ch.prenom || ' ' || ch.nom FROM taches_collecte t JOIN clients c ON t.client_id = c.id LEFT JOIN tournees_jour tj ON t.tournee_id = tj.id LEFT JOIN chauffeurs ch ON tj.chauffeur_id = ch.id WHERE t.date_planifiee = ? AND t.statut = 'erreur' ORDER BY t.id DESC''', (date_jour,))
            return [{"tache_id": l[0], "client_nom": l[1], "adresse": l[2] or "N/A", "raison": l[3] or "N/A", "type_imprevu": l[4] or "autre", "heure": l[5] or "N/A", "chauffeur": l[6] or "N/A"} for l in cursor.fetchall()]

    def trouver_candidat_reassignation(self, tache_id, date_jour):
        date_obj = datetime.datetime.strptime(date_jour, '%Y-%m-%d')
        jour_semaine = date_obj.weekday() + 1
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''SELECT t.poids_prevu_kg, c.latitude, c.longitude, dc.heure_fin FROM taches_collecte t JOIN clients c ON t.client_id = c.id LEFT JOIN disponibilites_clients dc ON dc.client_id = c.id AND dc.jour_semaine = ? WHERE t.id = ?''', (jour_semaine, tache_id))
            info = cursor.fetchone()
            if not info: return None
            p_orphelin, lat_o, lon_o, hf_str = info
            client_fin = heure_vers_minutes(hf_str) if hf_str else 1200
            now = datetime.datetime.now()
            h_actuelle = now.hour * 60 + now.minute
            if h_actuelle >= client_fin: return None
            cursor.execute('''SELECT DISTINCT tj.id, tj.heure_fin_service, cam.charge_max_kg, ch.prenom || ' ' || ch.nom FROM tournees_jour tj JOIN camions cam ON tj.camion_id = cam.id JOIN chauffeurs ch ON tj.chauffeur_id = ch.id JOIN taches_collecte t ON t.tournee_id = tj.id WHERE tj.date_tournee = ? AND t.statut = 'planifiee' ''', (date_jour,))
            meilleur, meilleur_trajet = None, float('inf')
            for tid, hf_serv, c_max, nom in cursor.fetchall():
                fin_min = heure_vers_minutes(hf_serv)
                cursor.execute('SELECT SUM(poids_prevu_kg) FROM taches_collecte WHERE tournee_id = ? AND statut = "terminee"', (tid,))
                if (c_max - (cursor.fetchone()[0] or 0)) < p_orphelin: continue
                cursor.execute('SELECT c.latitude, c.longitude FROM taches_collecte t JOIN clients c ON t.client_id = c.id WHERE t.tournee_id = ? AND t.statut = "terminee" ORDER BY t.ordre_passage DESC LIMIT 1', (tid,))
                pos = cursor.fetchone()
                pos_lat, pos_lon = (pos[0], pos[1]) if pos else (43.1389, 6.0222)
                dist = math.sqrt((pos_lat - lat_o)**2 + (pos_lon - lon_o)**2) * 100000
                t_vers_c = dist // 500
                if h_actuelle + t_vers_c < client_fin and h_actuelle + t_vers_c + 15 + (math.sqrt((lat_o - 43.1389)**2 + (lon_o - 6.0222)**2) * 200) < fin_min:
                    if t_vers_c < meilleur_trajet: meilleur_trajet, meilleur = t_vers_c, {'tournee_id': tid, 'chauffeur_nom': nom, 'heure_arrivee_estimee': f"{int((h_actuelle+t_vers_c)//60):02d}:{int((h_actuelle+t_vers_c)%60):02d}"}
            return meilleur

    def executer_reassignation(self, tache_id, tournee_id):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            if tournee_id is None:
                cursor.execute('UPDATE taches_collecte SET date_planifiee = ?, statut = "en_attente", tournee_id = NULL, ordre_passage = NULL WHERE id = ?', ((datetime.date.today() + datetime.timedelta(days=1)).isoformat(), tache_id))
            else:
                cursor.execute('SELECT COALESCE(MAX(ordre_passage), 0) FROM taches_collecte WHERE tournee_id = ?', (tournee_id,))
                cursor.execute('UPDATE taches_collecte SET tournee_id = ?, ordre_passage = ?, statut = "planifiee" WHERE id = ?', (tournee_id, cursor.fetchone()[0] + 1, tache_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_planning_preview(self, date_jour):
        date_obj = datetime.datetime.strptime(date_jour, '%Y-%m-%d')
        jour_semaine = date_obj.weekday() + 1
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(DISTINCT d.client_id) FROM disponibilites_clients d WHERE d.jour_semaine = ? AND d.client_id NOT IN (SELECT client_id FROM exceptions_calendrier_clients WHERE date_exception = ? AND est_ferme = 1)', (jour_semaine, date_jour))
            c_dispo = cursor.fetchone()[0] or 0
            cursor.execute('SELECT COUNT(chauffeur_id) FROM disponibilites_chauffeurs WHERE jour_semaine = ?', (jour_semaine,))
            return {"clients_dispo": c_dispo, "chauffeurs_dispo": cursor.fetchone()[0] or 0}

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
                cursor.execute('INSERT INTO taches_collecte (client_id, date_planifiee, type_tache, bacs_prevus, poids_prevu_kg, statut) VALUES (?, ?, "collecte", ?, ?, "en_attente")', (client_id, date_jour, math.ceil(p_est/40), p_est))
                t_ins += 1
            conn.commit()
            return {"status": "succes", "taches_creees": t_ins}

    def sauvegarder_resultat_optimisation(self, date_jour, resultats_ia, data_ortools):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Nettoyage initial : on désaffecte les tâches de ce jour avant réécriture
            cursor.execute('''
                UPDATE taches_collecte 
                SET tournee_id = NULL, ordre_passage = NULL, statut = 'en_attente'
                WHERE date_planifiee = ?
            ''', (date_jour,))

            # 2. Nettoyage sécurité : on supprime les "clones" (Trips supplémentaires) des optimisations précédentes
            # pour éviter qu'ils ne se multiplient si tu cliques plusieurs fois sur "Optimiser"
            ids_base = list(set(data_ortools['tournee_bdd_ids']))
            if ids_base:
                placeholders = ','.join('?' for _ in ids_base)
                cursor.execute(f'''
                    DELETE FROM tournees_jour 
                    WHERE date_tournee = ? AND id NOT IN ({placeholders})
                ''', [date_jour] + ids_base)

            # On remet les kilomètres à zéro pour les tournées de base
            cursor.execute('''
                UPDATE tournees_jour 
                SET distance_km = 0 
                WHERE date_tournee = ?
            ''', (date_jour,))

            routes_optimales = resultats_ia['routes']
            distances_optimales = resultats_ia['distances']

            # Dictionnaire pour savoir si on a déjà utilisé la tournée de base du chauffeur
            tournees_traitees = {}

            for vehicule_id, sequence_noeuds in routes_optimales.items():
                # On ignore les véhicules qui n'ont rien fait (juste Dépôt -> Dépôt)
                if len(sequence_noeuds) <= 2:
                    continue
                
                base_tournee_id = data_ortools['tournee_bdd_ids'][vehicule_id]
                dist_km = distances_optimales.get(vehicule_id, 0)

                if base_tournee_id not in tournees_traitees:
                    # C'est le Trip 1 du chauffeur : on utilise la tournée de base existante
                    tournees_traitees[base_tournee_id] = 1
                    tournee_id_a_utiliser = base_tournee_id
                    cursor.execute('''
                        UPDATE tournees_jour 
                        SET distance_km = ?
                        WHERE id = ?
                    ''', (dist_km, tournee_id_a_utiliser))
                else:
                    # C'est le Trip 2 ou 3 : on CLONE la tournée dans la base de données
                    tournees_traitees[base_tournee_id] += 1
                    
                    # On récupère les infos du chauffeur et du camion de la tournée de base
                    cursor.execute('''
                        SELECT date_tournee, chauffeur_id, camion_id, depot_id, heure_debut_service, heure_fin_service 
                        FROM tournees_jour WHERE id = ?
                    ''', (base_tournee_id,))
                    base_info = cursor.fetchone()
                    
                    # On insère une NOUVELLE ligne dans tournees_jour pour représenter ce 2ème Trip
                    cursor.execute('''
                        INSERT INTO tournees_jour 
                        (date_tournee, chauffeur_id, camion_id, depot_id, heure_debut_service, heure_fin_service, distance_km, statut)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'affectee')
                    ''', (*base_info, dist_km))
                    
                    tournee_id_a_utiliser = cursor.lastrowid # On récupère le nouvel ID créé
                
                # On affecte les clients visités à ce Trip spécifique
                ordre_passage = 1
                for etape in sequence_noeuds:
                    noeud_index = etape["node_index"]
                    heure_estimee = etape["heure_estimee"]
                    
                    # On ignore le nœud du dépôt pour l'affichage client
                    if noeud_index == 0:
                        continue
                    
                    tache_id = data_ortools['tache_ids'][noeud_index]
                    if tache_id:
                        cursor.execute('''
                            UPDATE taches_collecte 
                            SET tournee_id = ?, ordre_passage = ?, heure_estimee = ?, statut = 'planifiee'
                            WHERE id = ?
                        ''', (tournee_id_a_utiliser, ordre_passage, heure_estimee, tache_id))
                        ordre_passage += 1
            
            # 4. Passage des tournées concernées au statut 'affectee'
            cursor.execute('''
                UPDATE tournees_jour 
                SET statut = 'affectee' 
                WHERE date_tournee = ? AND statut = 'brouillon'
            ''', (date_jour,))
            
            conn.commit()
            print("Résultats de l'optimisation IA enregistrés (Multi-trips séparés avec succès) !")