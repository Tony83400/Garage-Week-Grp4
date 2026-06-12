import csv
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def minutes_en_heure(minutes):
    """Convertit 480 minutes en '08:00'"""
    h = int(minutes // 60)
    m = int(minutes % 60)
    return f"{h:02d}:{m:02d}"

import csv

def sauvegarder_en_csv(data, manager, routing, solution, time_dimension):
    """
    Parcourt la solution et exporte en CSV.
    Ne prend en compte que les véhicules ayant effectué au moins 1 arrêt client.
    """
    fichier_csv = 'tournees_ortools.csv'
    infos_geo = data['infos_geo']
    
    with open(fichier_csv, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Chauffeur', 'Ordre', 'Nom_Etape', 'Latitude', 'Longitude', 'Heure_Arrivee', 'Distance_Cumulee_Unite', 'Bacs_a_Collecter', 'Poids_a_Collecter_Kg'])
        
        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            
            # --- FILTRAGE : On prépare les données temporairement ---
            tour_rows = []
            stop_count = 0 # Compteur d'arrêts réels
            ordre = 1
            distance_cumulee = 0
            nom_chauffeur = f"Tournée de {data['driver_names'][vehicle_id]}"
            
            # Parcours
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                
                # Si on n'est pas au dépôt, on compte l'arrêt
                if node_index != data['depot']:
                    stop_count += 1
                
                temps_var = time_dimension.CumulVar(index)
                heure_arrivee = minutes_en_heure(solution.Min(temps_var))
                info = infos_geo[node_index]
                bacs = data['demands'][node_index]
                poids = data['weight_demands'][node_index]
                
                tour_rows.append([nom_chauffeur, ordre, info['nom'], info['lat'], info['lon'], heure_arrivee, distance_cumulee, bacs, poids])
                
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                distance_cumulee += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
                ordre += 1

            # Ajout du retour au dépôt
            node_index = manager.IndexToNode(index)
            info = infos_geo[node_index]
            tour_rows.append([nom_chauffeur, ordre, "Retour " + info['nom'], info['lat'], info['lon'], minutes_en_heure(solution.Min(time_dimension.CumulVar(index))), distance_cumulee, 0, 0])

            # --- DÉCISION : Si stop_count > 0, on écrit dans le CSV et on affiche ---
            if stop_count > 0:
                for row in tour_rows:
                    writer.writerow(row)
                
                # Affichage console uniquement pour les tournées actives
                temps_debut = solution.Min(time_dimension.CumulVar(routing.Start(vehicle_id)))
                temps_fin = solution.Min(time_dimension.CumulVar(index))
                print(f"{nom_chauffeur} : Temps de travail total = {minutes_en_heure(temps_fin - temps_debut)}")

    print(f"\nFichier '{fichier_csv}' généré avec succès ! (Tournées vides masquées).")


def resoudre_et_exporter(data):
    """Configuration et exécution du solveur OR-Tools"""
    
    print("Initialisation du Routing Model...")
    manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']), data['num_vehicles'], data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    # -------------------------------------------------------------
    # 1. CONTRAINTE DE DISTANCE (Pour minimiser le trajet)
    # -------------------------------------------------------------
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['distance_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # -------------------------------------------------------------
    # 2A. CONTRAINTE DE CAPACITÉ : VOLUME (Bacs)
    # -------------------------------------------------------------
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return data['demands'][from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0, 
        data['vehicle_capacities'], 
        True,                   #a changer en True
        'Capacity_Bacs'
    )

    # -------------------------------------------------------------
    # 2B. CONTRAINTE DE CAPACITÉ : POIDS (Kg) -> NOUVEAU !
    # -------------------------------------------------------------
    def weight_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return data['weight_demands'][from_node]

    weight_callback_index = routing.RegisterUnaryTransitCallback(weight_callback)
    
    routing.AddDimensionWithVehicleCapacity(
        weight_callback_index,
        0, 
        data['vehicle_weights'], 
        True,                           # a changer en True 
        'Capacity_Weight'
    )
    

    # Coût fixe de sortie d'un camion du dépôt (Mettre à 0 pour forcer la sortie de tous les camions)
    routing.SetFixedCostOfAllVehicles(10000)

    # -------------------------------------------------------------
    # 3. CONTRAINTES DE TEMPS ET HORAIRES
    # -------------------------------------------------------------
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        temps_service = 15 if from_node != data['depot'] else 0
        temps_trajet = data['distance_matrix'][from_node][to_node] // 500
        return temps_service + temps_trajet

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    
    routing.AddDimension(
        time_callback_index,
        60,    # Temps d'attente maximum autorisé sur place (en minutes)
        1440,  # Limite globale de temps (24h = 1440 minutes)
        False, 
        'Time'
    )
    time_dimension = routing.GetDimensionOrDie('Time')

    # Application des fenêtres horaires DES CLIENTS
    
    for location_idx, time_window in enumerate(data['time_windows']):
        if location_idx == data['depot']:
            continue
        index = manager.NodeToIndex(location_idx)
        time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])
    
      
    # Application des fenêtres horaires DES CHAUFFEURS (Planning)
    # Au lieu de (0, 1440), impose la fenêtre globale sur tous les véhicules
    # Application des fenêtres horaires DES CHAUFFEURS dynamiquement
    for vehicle_id in range(data['num_vehicles']):
        index_depart = routing.Start(vehicle_id)
        index_arrivee = routing.End(vehicle_id)
        
        # On récupère les vrais horaires du chauffeur (envoyés par repo_tournees.py)
        start_time, end_time = data['vehicle_time_windows'][vehicle_id]
        
        time_dimension.CumulVar(index_depart).SetRange(start_time, end_time)
        time_dimension.CumulVar(index_arrivee).SetRange(start_time, end_time)

    # -------------------------------------------------------------
    # GESTION DU MULTI-TRIP (Variable selon le chauffeur)
    # -------------------------------------------------------------
    # On s'assure que si un chauffeur (ex: Jean) a 3 véhicules virtuels (T1, T2, T3),
    # le T2 ne commence qu'APRÈS que le T1 soit rentré au dépôt (avec 30 min de vidage).
    if 'groupes_vehicules' in data:
        groupes = data['groupes_vehicules']
        DUREE_VIDAGE = 30 # minutes
        
        for v in range(data['num_vehicles'] - 1):
            # Si le véhicule v et v+1 appartiennent au même chauffeur
            if groupes[v] == groupes[v+1]:
                fin_t1 = routing.End(v)
                debut_t2 = routing.Start(v+1)
                
                # Le temps de départ du T2 doit être >= au retour du T1 + temps de vidage
                routing.solver().Add(
                    time_dimension.CumulVar(debut_t2) >= time_dimension.CumulVar(fin_t1) + DUREE_VIDAGE
                )
        

    """"
        start_time, end_time = data['vehicle_time_windows'][vehicle_id]
        
        # Le camion ne peut pas quitter le dépôt avant le début du service
        time_dimension.CumulVar(index_depart).SetRange(start_time, end_time)
        # Le camion doit obligatoirement être rentré avant la fin du service
        time_dimension.CumulVar(index_arrivee).SetRange(start_time, end_time)
    """ 
    # -------------------------------------------------------------
    # 4. EXÉCUTION DU MOTEUR DE RECHERCHE
    # -------------------------------------------------------------
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.seconds = 10 

    print("Recherche de l'itinéraire optimal en cours (Max 10 sec)...")
    solution = routing.SolveWithParameters(search_parameters)

    # -------------------------------------------------------------
    # 5. EXPORT
    # -------------------------------------------------------------
    if solution:
        print(f"Solution trouvée ! Distance mathématique totale : {solution.ObjectiveValue()}")
        sauvegarder_en_csv(data, manager, routing, solution, time_dimension)
        
        # --- NOUVEAUTÉ : On construit le dictionnaire pour l'API ---
        routes_optimales = {}
        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            route = []
            
            # On parcours les arrêts du véhicule
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                route.append(node_index)
                index = solution.Value(routing.NextVar(index))
                
            # On ajoute le dépôt d'arrivée (la fin)
            route.append(manager.IndexToNode(index))
            
            routes_optimales[vehicle_id] = route
            
        return routes_optimales # <-- C'EST ÇA QUI MANQUAIT !
    else:
        print("Aucune solution n'a pu être trouvée.")
        return None
    # DEBUG : Afficher les contraintes avant le solve
    print("\n--- DIAGNOSTIC DES CONTRAINTES ---")
    print(f"Nombre de clients à visiter : {len(data['demands']) - 1}")
    print(f"Total Bacs demandés : {sum(data['demands'])}")
    print(f"Capacité totale des camions (Bacs) : {sum(data['vehicle_capacities'])}")
    print(f"Fenêtres horaires clients (min/max) : {min([t[0] for t in data['time_windows'] if t[0]>0])} / {max([t[1] for t in data['time_windows'] if t[1]<1440])}")
    print("-----------------------------------\n")


