import sqlite3
import math
import datetime
import requests
import random

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
        MIN_GLOBAL = 180  # 3h00
        MAX_GLOBAL = 1200 # 20h00
        
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            
            # On récupère l'ID du chauffeur (ch.id) pour grouper les shifts
            cursor.execute('''
                SELECT c.bacs_max, c.charge_max_kg, ch.nom, tj.heure_debut_service, tj.heure_fin_service, ch.id
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
            
            for index, c in enumerate(camions_jour):
                bacs_max, charge_max, nom_chauffeur, heure_debut, heure_fin, chauffeur_id = c
                
                debut_min = heure_vers_minutes(heure_debut)
                fin_min = heure_vers_minutes(heure_fin)
                
                # CORRECTION : 1 ligne en base de données = 1 véhicule OR-Tools. Fini les fantômes !
                data['vehicle_capacities'].append(bacs_max)
                data['vehicle_weights'].append(charge_max)
                data['driver_names'].append(nom_chauffeur)
                data['vehicle_time_windows'].append((debut_min, fin_min))
                data['groupes_vehicules'].append(chauffeur_id)
            
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

            data['distance_matrix'] = calculer_distance_matrice(coordonnees)
            
            # MODE SAFE : On divise les valeurs de l'API OSRM si elles sont en secondes
            data['time_matrix'] = [[int(val/60) if val > 500 else val for val in row] for row in data['distance_matrix']]

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
                JOIN tournees_jour tj ON t.tournee_id = tj.id 
                WHERE tj.chauffeur_id = ? AND tj.date_tournee = ?
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
            
            # 1. Stats de poids et collectes — uniquement les tâches affectées à une tournée
            cursor.execute('''
                SELECT
                    SUM(poids_prevu_kg),
                    COUNT(id),
                    SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN statut = 'terminee' THEN poids_prevu_kg ELSE 0 END)
                FROM taches_collecte
                WHERE date_planifiee = ? AND type_tache = 'collecte' AND tournee_id IS NOT NULL
            ''', (date_jour,))
            resultat = cursor.fetchone()

            poids_total = resultat[0] or 0
            total_collectes = resultat[1] or 0
            collectes_validees = resultat[2] or 0
            poids_collecte = resultat[3] or 0
            
            # 2. Alertes
            cursor.execute('''
                SELECT COUNT(id) FROM taches_collecte 
                WHERE date_planifiee = ? AND statut = 'erreur'
            ''', (date_jour,))
            alertes = cursor.fetchone()[0] or 0

            # 3. Kilométrage total
            cursor.execute('''
                SELECT SUM(distance_km) FROM tournees_jour
                WHERE date_tournee = ?
            ''', (date_jour,))
            km_total = cursor.fetchone()[0] or 0

            # 4. Statut de la flotte par chauffeur
            cursor.execute('''
                SELECT
                    ch.prenom,
                    c.nom_entreprise,
                    COUNT(CASE WHEN t.type_tache = 'collecte' THEN 1 END) AS total_collectes,
                    COUNT(CASE WHEN t.type_tache = 'collecte' AND t.statut = 'terminee' THEN 1 END) AS done_collectes,
                    COUNT(CASE WHEN t.type_tache = 'collecte' AND t.statut = 'erreur' THEN 1 END) AS erreurs_collectes
                FROM tournees_jour tj
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                JOIN taches_collecte t ON tj.id = t.tournee_id
                LEFT JOIN clients c ON t.client_id = c.id AND t.statut = 'terminee'
                    AND t.ordre_passage = (
                        SELECT MAX(t2.ordre_passage) FROM taches_collecte t2
                        WHERE t2.tournee_id = tj.id AND t2.statut = 'terminee' AND t2.type_tache = 'collecte'
                    )
                WHERE tj.date_tournee = ?
                GROUP BY tj.id, ch.prenom
            ''', (date_jour,))
            flotte_lignes = cursor.fetchall()

            flotte_statut = []
            for f in flotte_lignes:
                prenom, dernier_client, total, done, erreurs = f[0], f[1], f[2] or 0, f[3] or 0, f[4] or 0
                if total > 0 and (done + erreurs) >= total:
                    dernier_point = 'Retour dépôt · La Farlède'
                    termine = True
                else:
                    dernier_point = dernier_client or 'En route'
                    termine = False
                flotte_statut.append({
                    "chauffeur": prenom,
                    "dernier_point": dernier_point,
                    "termine": termine,
                    "erreurs": erreurs
                })

            return {
                "poids_prevu_kg": poids_total,
                "poids_collecte_kg": poids_collecte,
                "collectes_total": total_collectes,
                "collectes_validees": collectes_validees,
                "alertes": alertes,
                "km_total": round(km_total, 1),
                "flotte": flotte_statut
            }

    def get_activite_recente(self, date_jour, limite=5):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.statut, c.nom_entreprise, c.latitude, c.longitude
                FROM taches_collecte t
                JOIN clients c ON t.client_id = c.id
                WHERE t.date_planifiee = ? AND t.statut IN ('terminee', 'erreur')
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
                SELECT tj.id, tj.chauffeur_id, c.immatriculation, c.charge_max_kg, ch.nom, ch.prenom, tj.heure_debut_service, tj.heure_fin_service, tj.distance_km
                FROM tournees_jour tj
                JOIN camions c ON tj.camion_id = c.id
                JOIN chauffeurs ch ON tj.chauffeur_id = ch.id
                WHERE tj.date_tournee = ?
            ''', (date_jour,))
            tournees = cursor.fetchall()

            resultat = []
            for t in tournees:
                tournee_id, chauffeur_id, immatriculation, charge_max, nom, prenom, heure_depart, heure_fin, dist_km = t
                
                # CORRECTION ICI : On ne prend QUE les arrêts liés à CE tournee_id
                cursor.execute('''
                    SELECT t.id, t.statut, t.poids_prevu_kg, c.nom_entreprise, t.ordre_passage, c.latitude, c.longitude, t.heure_estimee
                    FROM taches_collecte t
                    JOIN clients c ON t.client_id = c.id
                    WHERE t.date_planifiee = ? AND t.tournee_id = ?
                    ORDER BY t.ordre_passage ASC
                ''', (date_jour, tournee_id)) 
                arrets = cursor.fetchall()
                
                liste_arrets = []
                for a in arrets:
                    liste_arrets.append({
                        "tache_id": a[0],
                        "statut": a[1],
                        "poids_prevu_kg": a[2],
                        "client_nom": a[3],
                        "ordre": a[4] or 0,
                        "latitude": a[5],
                        "longitude": a[6],
                        "heure_estimee": a[7]
                    })
                
                # NOUVEAU : On n'envoie pas la tournée au Front si elle est vide (facultatif mais plus propre)
                if len(liste_arrets) > 0:
                    resultat.append({
                        "chauffeur_id": chauffeur_id,
                        "chauffeur": f"{prenom} {nom}",
                        "vehicule": f"VL{chauffeur_id}",
                        "immatriculation": immatriculation,
                        "capacite_max_kg": charge_max,
                        "heure_depart": heure_depart,
                        "heure_fin": heure_fin,
                        "distance_km": dist_km,
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
    
    def get_planning_preview(self, date_jour):
        """Retourne le nombre de clients disponibles et de chauffeurs planifiés pour un jour."""
        date_obj = datetime.datetime.strptime(date_jour, '%Y-%m-%d')
        jour_semaine = date_obj.weekday() + 1

        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute('''
                SELECT COUNT(DISTINCT d.client_id)
                FROM disponibilites_clients d
                WHERE d.jour_semaine = ?
                AND d.client_id NOT IN (
                    SELECT client_id FROM exceptions_calendrier_clients
                    WHERE date_exception = ? AND est_ferme = 1
                )
            ''', (jour_semaine, date_jour))
            clients_dispo = cursor.fetchone()[0] or 0

            cursor.execute('''
                SELECT COUNT(*) FROM tournees_jour WHERE date_tournee = ?
            ''', (date_jour,))
            chauffeurs_dispo = cursor.fetchone()[0] or 0

            return {"clients_dispo": clients_dispo, "chauffeurs_dispo": chauffeurs_dispo}

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
            
            # En phase de test, on supprime les anciennes tâches pour tout regénérer proprement
            if cursor.fetchone()[0] > 0:
                print(f"Suppression des tâches existantes pour le {date_jour} pour regénération.")
                cursor.execute('''
                    DELETE FROM taches_collecte 
                    WHERE date_planifiee = ? AND type_tache = 'collecte'
                ''', (date_jour,))
                conn.commit()

            # 3. La Super-Requête : Trouver les clients prévus ce jour, SAUF s'ils sont fermés
            cursor.execute('''
                SELECT d.client_id, d.poids_prevu_kg
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
                client_id, poids_estime = client
                
                # On utilise le poids défini spécifiquement pour ce point (créneau de disponibilité)
                # On estime environ 40kg par bac pour le nombre de bacs prévus
                bacs_estimes = math.ceil(poids_estime / 40)
                
                cursor.execute('''
                    INSERT INTO taches_collecte 
                    (client_id, date_planifiee, type_tache, bacs_prevus, poids_prevu_kg, statut) 
                    VALUES (?, ?, 'collecte', ?, ?, 'en_attente')
                ''', (client_id, date_jour, bacs_estimes, poids_estime))
                taches_inserees += 1
            
            conn.commit()
            return {"status": "succes", "taches_creees": taches_inserees}
    def sauvegarder_resultat_optimisation(self, date_jour, resultats_ia, data_ortools):
            """
            Prend le résultat d'OR-Tools et met à jour la table 'taches_collecte'
            en associant chaque tâche à sa tournée et son ordre de passage réel.
            """
            with self.db_core.get_connection() as conn:
                cursor = conn.cursor()
                
                # 1. Récupérer les ID uniques de TOUTES les tournées planifiées ce jour-là
                cursor.execute('''
                    SELECT id FROM tournees_jour 
                    WHERE date_tournee = ? 
                    ORDER BY id ASC
                ''', (date_jour,))
                tournees_reelles_ids = [row[0] for row in cursor.fetchall()]
                
                if not tournees_reelles_ids:
                    print("Erreur sauvegarde : Aucune tournée configurée en BDD pour cette date.")
                    return

                # 2. Nettoyage initial : on désaffecte les tâches de ce jour avant réécriture
                cursor.execute('''
                    UPDATE taches_collecte 
                    SET tournee_id = NULL, ordre_passage = NULL, statut = 'en_attente'
                    WHERE date_planifiee = ?
                ''', (date_jour,))

                # 3. Traitement des routes calculées par l'IA
                routes_optimales = resultats_ia['routes']
                distances_optimales = resultats_ia['distances']

                for vehicule_id, sequence_noeuds in routes_optimales.items():
                    # On ignore les véhicules vides (qui ne contiennent que le dépôt départ/arrivée)
                    if len(sequence_noeuds) <= 2:
                        continue
                    
                    # Alignement strict de l'index OR-Tools avec l'identifiant en base de données
                    if vehicule_id >= len(tournees_reelles_ids):
                        print(f"Alerte : L'IA a utilisé plus de véhicules ({vehicule_id}) que de tournées disponibles.")
                        continue
                        
                    tournee_bdd_id = tournees_reelles_ids[vehicule_id]
                    dist_km = distances_optimales.get(vehicule_id, 0)

                    # Mise à jour de la distance pour cette tournée
                    cursor.execute('''
                        UPDATE tournees_jour 
                        SET distance_km = ?
                        WHERE id = ?
                    ''', (dist_km, tournee_bdd_id))
                    
                    ordre_passage = 1
                    for etape in sequence_noeuds:
                        noeud_index = etape["node_index"]
                        heure_estimee = etape["heure_estimee"]
                        
                        # On ignore le nœud du dépôt (0)
                        if noeud_index == 0:
                            continue
                        
                        # Récupération de l'ID unique de la tâche associée à ce nœud
                        tache_id = data_ortools['tache_ids'][noeud_index]
                        
                        if tache_id:
                            cursor.execute('''
                                UPDATE taches_collecte 
                                SET tournee_id = ?, ordre_passage = ?, heure_estimee = ?, statut = 'planifiee'
                                WHERE id = ?
                            ''', (tournee_bdd_id, ordre_passage, heure_estimee, tache_id))
                            ordre_passage += 1
                
                # 4. Passage des tournées concernées au statut 'affectee'
                cursor.execute('''
                    UPDATE tournees_jour 
                    SET statut = 'affectee' 
                    WHERE date_tournee = ?
                ''', (date_jour,))
                
                conn.commit()
                print("Resultats de l'optimisation IA enregistres avec succes en base de donnees !")
            