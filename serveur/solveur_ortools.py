import csv
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

# PLUS AUCUN IMPORT SQLITE ICI !

def minutes_en_heure(minutes):
    """Convertit 480 minutes en '08:00'"""
    h = int(minutes // 60)
    m = int(minutes % 60)
    return f"{h:02d}:{m:02d}"

def sauvegarder_en_csv(data, manager, routing, solution, time_dimension):
    """Parcourt la solution mathématique et crée le fichier CSV"""
    
    fichier_csv = 'tournees_ortools.csv'
    # On récupère les infos directement depuis le dictionnaire préparé en amont !
    infos_geo = data['infos_geo'] 
    
    with open(fichier_csv, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Camion', 'Ordre', 'Nom_Etape', 'Latitude', 'Longitude', 'Heure_Arrivee', 'Distance_Cumulee_Unite', 'Bacs_a_Collecter'])
        
        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            ordre = 1
            distance_cumulee = 0
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                temps_var = time_dimension.CumulVar(index)
                heure_arrivee = minutes_en_heure(solution.Min(temps_var))
                
                info = infos_geo[node_index]
                bacs = data['demands'][node_index]
                
                nom_camion = f"Camion_{vehicle_id}"
                writer.writerow([nom_camion, ordre, info['nom'], info['lat'], info['lon'], heure_arrivee, distance_cumulee, bacs])
                
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                distance_cumulee += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
                ordre += 1

            # Point de retour (Dépôt)
            node_index = manager.IndexToNode(index)
            temps_var = time_dimension.CumulVar(index)
            heure_arrivee = minutes_en_heure(solution.Min(temps_var))
            info = infos_geo[node_index]
            writer.writerow([f"Camion_{vehicle_id}", ordre, "Retour " + info['nom'], info['lat'], info['lon'], heure_arrivee, distance_cumulee, 0])

    print(f"\n✅ Fichier '{fichier_csv}' généré avec succès ! Vous pouvez l'importer dans Google My Maps.")

def resoudre_et_exporter(data):
    """Configuration et exécution du solveur OR-Tools"""
    
    print("Initialisation du Routing Model...")
    manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']), data['num_vehicles'], data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['distance_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return data['demands'][from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0, 
        data['vehicle_capacities'], 
        True,
        'Capacity'
    )

    routing.SetFixedCostOfAllVehicles(10000)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        temps_service = 15 if from_node != data['depot'] else 0
        temps_trajet = data['distance_matrix'][from_node][to_node] // 100 
        return temps_service + temps_trajet

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    
    routing.AddDimension(
        time_callback_index,
        60,    
        1440,  
        False, 
        'Time'
    )
    time_dimension = routing.GetDimensionOrDie('Time')

    for location_idx, time_window in enumerate(data['time_windows']):
        if location_idx == data['depot']:
            continue
        index = manager.NodeToIndex(location_idx)
        time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.seconds = 10 

    print("Recherche de l'itinéraire optimal en cours (Max 10 sec)...")
    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        print(f"Solution trouvée ! Distance mathématique totale : {solution.ObjectiveValue()}")
        sauvegarder_en_csv(data, manager, routing, solution, time_dimension)
    else:
        print("Aucune solution n'a pu être trouvée avec ces contraintes.")