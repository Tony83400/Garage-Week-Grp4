import csv
import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def minutes_en_heure(minutes):
    """Convertit 480 minutes en '08:00'"""
    h = int(minutes // 60)
    m = int(minutes % 60)
    return f"{h:02d}:{m:02d}"

def resoudre_et_exporter(data):
    """Configuration et exécution du solveur OR-Tools"""
    
    print("Initialisation du Routing Model...")
    manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']), data['num_vehicles'], data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    # 1. CONTRAINTE DE DISTANCE
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        # On divise par 10 pour que la distance pèse moins lourd que le coût fixe de démarrage
        return int(data['distance_matrix'][from_node][to_node] // 10)

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # 2. CONTRAINTE DE CAPACITÉ (VOLUME & POIDS)
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        # On utilise math.ceil pour ne jamais sous-estimer la charge (OR-Tools veut des int)
        return int(math.ceil(data['demands'][from_node]))

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(demand_callback_index, 0, data['vehicle_capacities'], True, 'Capacity_Bacs')

    def weight_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        # On utilise math.ceil pour ne jamais sous-estimer la charge (OR-Tools veut des int)
        return int(math.ceil(data['weight_demands'][from_node]))

    weight_callback_index = routing.RegisterUnaryTransitCallback(weight_callback)
    routing.AddDimensionWithVehicleCapacity(weight_callback_index, 0, data['vehicle_weights'], True, 'Capacity_Weight')

    # 3. CONTRAINTES DE TEMPS
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        # 15 mins de service par arrêt client, 0 au dépôt
        temps_service = 15 if from_node != data['depot'] else 0
        temps_trajet = data['time_matrix'][from_node][to_node]
        return int(temps_service + temps_trajet)

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    
    # On met le slack global très haut (1440) pour permettre l'attente AU DEPOT (entre les multi-trips)
    routing.AddDimension(time_callback_index, 1440, 1440, False, 'Time')
    time_dimension = routing.GetDimensionOrDie('Time')

    # Fenêtres horaires des clients
    for location_idx, time_window in enumerate(data['time_windows']):
        if location_idx == data['depot']: 
            continue
            
        index = manager.NodeToIndex(location_idx)
        
        # Le client doit être visité dans sa fenêtre horaire
        time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])
        
        # NOUVEAUTÉ : Le camion ne peut pas attendre plus de 5 minutes chez ce client
        # time_dimension.SlackVar(index).SetMax(5)
    
    # Fenêtres horaires des chauffeurs (Strictes)
    for vehicle_id in range(data['num_vehicles']):
        start_index = routing.Start(vehicle_id)
        end_index = routing.End(vehicle_id)
        h_start, h_end = data['vehicle_time_windows'][vehicle_id]
        
        # Le conducteur ne peut pas partir avant son heure et doit être rentré avant la fin
        time_dimension.CumulVar(start_index).SetRange(h_start, h_end)
        time_dimension.CumulVar(end_index).SetRange(h_start, h_end)

    # 4. GESTION DU MULTI-TRIP (Séquencement des trips virtuels)
    if 'groupes_vehicules' in data:
        groupes = data['groupes_vehicules']
        DUREE_VIDAGE = 30 # minutes entre deux trips
        for v in range(data['num_vehicles'] - 1):
            if groupes[v] == groupes[v+1]:
                # Trip v+1 commence APRÈS la fin du Trip v + vidage
                routing.solver().Add(time_dimension.CumulVar(routing.Start(v+1)) >= time_dimension.CumulVar(routing.End(v)) + DUREE_VIDAGE)

    # 5. PÉNALITÉS ET COUTS FIXES
    # Coût fixe réduit à 50 000 pour équilibrer avec les distances 
    routing.SetFixedCostOfAllVehicles(50000) 
    
    # Pénalité pour point non visité (doit rester très haute)
    penalty = 1000000 
    for node in range(1, len(data['distance_matrix'])):
        routing.AddDisjunction([manager.NodeToIndex(node)], penalty)

    # 6. PARAMÈTRES DE RECHERCHE
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    
    # Reviens sur PATH_CHEAPEST_ARC, beaucoup plus robuste avec des horaires stricts !
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    
    # Garde les 120 secondes
    search_parameters.time_limit.seconds = 30
    search_parameters.log_search = True


    solution = routing.SolveWithParameters(search_parameters)

    # 7. EXTRACTION DES RESULTATS
    if solution:
        resultat = {"routes": {}, "distances": {}, "times": {}, "dropped_nodes": []}
        
        # Identification des points non-affectés
        visited_nodes = set()
        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            route = []
            route_distance = 0
            t_start = solution.Min(time_dimension.CumulVar(index))
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                visited_nodes.add(node_index)
                t_var = time_dimension.CumulVar(index)
                route.append({"node_index": node_index, "heure_estimee": minutes_en_heure(solution.Min(t_var))})
                prev_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(prev_index, index, vehicle_id)
            
            t_end = solution.Min(time_dimension.CumulVar(index))
            route.append({"node_index": manager.IndexToNode(index), "heure_estimee": minutes_en_heure(t_end)})
            
            if len(route) > 2:
                resultat["routes"][vehicle_id] = route
                resultat["distances"][vehicle_id] = round(route_distance / 1000, 1)
                resultat["times"][vehicle_id] = {"depart": minutes_en_heure(t_start), "retour": minutes_en_heure(t_end)}

        # Analyse des points abandonnés
        for node_idx in range(1, len(data['demands'])):
            if node_idx not in visited_nodes:
                # Diagnostic rapide
                reason = "Inconnu"
                tw = data['time_windows'][node_idx]
                if tw[1] - tw[0] < 60: # Fenêtre de moins d'une heure
                    reason = "Fenêtre horaire trop étroite"
                else:
                    reason = "Conflit d'horaire ou Capacité saturée"
                
                resultat["dropped_nodes"].append({
                    "node_index": node_idx,
                    "tache_id": data['tache_ids'][node_idx],
                    "raison": reason,
                    "client_nom": data['infos_geo'][node_idx]['nom'],
                    "window": f"{minutes_en_heure(tw[0])}-{minutes_en_heure(tw[1])}"
                })
        
        return resultat
    return None