"""
Moteur d'optimisation utilisant Google OR-Tools pour résoudre le problème de tournées de véhicules (VRPTW).
Gère les contraintes de capacité (poids/volume), les fenêtres horaires et le multi-trip.
"""

import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def minutes_en_heure(minutes):
    """
    Convertit un nombre de minutes depuis minuit en format HH:MM.
    Exemple: 480 -> '08:00'
    """
    h = int(minutes // 60)
    m = int(minutes % 60)
    return f"{h:02d}:{m:02d}"

def resoudre_et_exporter(data):
    """
    Configure et exécute le solveur OR-Tools pour le planning de collecte.
    
    Args:
        data (dict): Dictionnaire contenant les matrices de distance/temps, 
                     les capacités des véhicules et les demandes clients.
    
    Returns:
        dict: Résultats de l'optimisation (routes, distances, temps) ou None en cas d'échec.
    """
    
    # --- Initialisation du modèle de routage ---
    
    # Gestion des points de départ et d'arrivée multiples (pour le reroutage temps réel)
    if 'starts' in data and 'ends' in data:
        manager = pywrapcp.RoutingIndexManager(
            len(data['distance_matrix']), 
            data['num_vehicles'], 
            data['starts'], 
            data['ends']
        )
    else:
        # Mode standard : départ et retour au dépôt principal
        manager = pywrapcp.RoutingIndexManager(
            len(data['distance_matrix']), 
            data['num_vehicles'], 
            data['depot']
        )
    
    routing = pywrapcp.RoutingModel(manager)

    # --- 1. Gestion des distances (Coût de l'arc) ---

    def distance_callback(from_index, to_index):
        """Retourne la distance entre deux points (utilisée pour le coût total)."""
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        # On divise par 10 pour équilibrer avec les coûts fixes de démarrage des véhicules
        return int(data['distance_matrix'][from_node][to_node] // 10)

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # --- 2. Contraintes de Capacité (Volume & Poids) ---

    def demand_callback(from_index):
        """Retourne la demande en nombre de bacs pour un point donné."""
        from_node = manager.IndexToNode(from_index)
        return int(math.ceil(data['demands'][from_node]))

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index, 
        0, # Pas de cumul de charge au départ
        data['vehicle_capacities'], 
        True, # Fixer la charge à zéro à la fin de la route
        'Capacity_Bacs'
    )

    def weight_callback(from_index):
        """Retourne la demande en poids (kg) pour un point donné."""
        from_node = manager.IndexToNode(from_index)
        return int(math.ceil(data['weight_demands'][from_node]))

    weight_callback_index = routing.RegisterUnaryTransitCallback(weight_callback)
    routing.AddDimensionWithVehicleCapacity(
        weight_callback_index, 
        0, 
        data['vehicle_weights'], 
        True, 
        'Capacity_Weight'
    )

    # --- 3. Contraintes Temporelles (Fenêtres Horaires) ---

    def time_callback(from_index, to_index):
        """Calcule le temps total (service + trajet) entre deux points."""
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        
        # Temps de service fixe de 15 minutes par arrêt (hors dépôt)
        temps_service = 15 if from_node != data['depot'] else 0
        temps_trajet = data['time_matrix'][from_node][to_node]
        return int(temps_service + temps_trajet)

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    
    # Dimension temporelle avec un slack élevé pour permettre l'attente au dépôt
    routing.AddDimension(time_callback_index, 1440, 1440, False, 'Time')
    time_dimension = routing.GetDimensionOrDie('Time')

    # Fenêtres horaires des clients
    for location_idx, time_window in enumerate(data['time_windows']):
        if location_idx == data['depot']: 
            continue
            
        index = manager.NodeToIndex(location_idx)
        time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])
    
    # Fenêtres horaires des véhicules (shifts chauffeurs)
    for vehicle_id in range(data['num_vehicles']):
        start_index = routing.Start(vehicle_id)
        end_index = routing.End(vehicle_id)
        h_start, h_end = data['vehicle_time_windows'][vehicle_id]
        
        # Sécurité pour garantir que l'intervalle est valide
        h_end_safe = max(h_start, h_end)
        
        time_dimension.CumulVar(start_index).SetRange(h_start, h_end_safe)
        time_dimension.CumulVar(end_index).SetRange(h_start, h_end_safe)

    # --- 4. Gestion du Multi-Trip (Enchaînement des tournées) ---

    if 'groupes_vehicules' in data:
        groupes = data['groupes_vehicules']
        DUREE_VIDAGE = 30 # Temps de déchargement au dépôt entre deux trips
        
        # Regroupement des véhicules virtuels par chauffeur réel
        vehicules_par_groupe = {}
        for v in range(data['num_vehicles']):
            g = groupes[v]
            if g not in vehicules_par_groupe:
                vehicules_par_groupe[g] = []
            vehicules_par_groupe[g].append(v)
            
        # Contrainte d'ordre : le trip N+1 commence après le retour du trip N (plus buffer)
        for g, v_indices in vehicules_par_groupe.items():
            for i in range(len(v_indices) - 1):
                v_courant = v_indices[i]
                v_suivant = v_indices[i+1]
                routing.solver().Add(
                    time_dimension.CumulVar(routing.Start(v_suivant)) >= 
                    time_dimension.CumulVar(routing.End(v_courant)) + DUREE_VIDAGE
                )

    # --- 5. Paramètres Économiques et Pénalités ---

    # Coût fixe par véhicule utilisé
    routing.SetFixedCostOfAllVehicles(50000) 
    
    # Pénalité élevée pour les points non visités (disjonctions)
    penalty = 1000000 
    for node in range(1, len(data['distance_matrix'])):
        if node < len(data['tache_ids']) and data['tache_ids'][node] is not None:
            routing.AddDisjunction([manager.NodeToIndex(node)], penalty)

    # --- 6. Paramètres de Recherche ---

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    
    # Stratégie de première solution robuste pour les contraintes horaires
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    
    # Métaheuristique pour sortir des minima locaux
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    
    search_parameters.time_limit.seconds = 5
    search_parameters.log_search = False

    # Résolution du problème
    solution = routing.SolveWithParameters(search_parameters)

    # --- 7. Extraction et Formatage des résultats ---

    if solution:
        resultat = {"routes": {}, "distances": {}, "times": {}, "dropped_nodes": []}
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
                route.append({
                    "node_index": node_index, 
                    "heure_estimee": minutes_en_heure(solution.Min(t_var))
                })
                prev_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(prev_index, index, vehicle_id)
            
            t_end = solution.Min(time_dimension.CumulVar(index))
            route.append({
                "node_index": manager.IndexToNode(index), 
                "heure_estimee": minutes_en_heure(t_end)
            })
            
            # On ne conserve que les routes ayant au moins un client
            if len(route) > 2:
                resultat["routes"][vehicle_id] = route
                resultat["distances"][vehicle_id] = round(route_distance / 1000, 1)
                resultat["times"][vehicle_id] = {
                    "depart": minutes_en_heure(t_start), 
                    "retour": minutes_en_heure(t_end)
                }

        # Identification des points impossibles à servir
        for node_idx in range(1, len(data['demands'])):
            if node_idx not in visited_nodes:
                tw = data['time_windows'][node_idx]
                raison = "Conflit d'horaire ou Capacité saturée"
                if tw[1] - tw[0] < 60:
                    raison = "Fenêtre horaire trop étroite"
                
                resultat["dropped_nodes"].append({
                    "node_index": node_idx,
                    "tache_id": data['tache_ids'][node_idx],
                    "raison": raison,
                    "client_nom": data['infos_geo'][node_idx]['nom'],
                    "window": f"{minutes_en_heure(tw[0])}-{minutes_en_heure(tw[1])}"
                })
        
        return resultat

    return None
