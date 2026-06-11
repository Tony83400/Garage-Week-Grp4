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
    Parcourt la solution mathématique trouvée par OR-Tools et l'exporte en CSV.
    Intègre les noms des chauffeurs, les volumes (bacs) et les poids (kg).
    """
    
    fichier_csv = 'tournees_ortools.csv'
    # On récupère les infos géographiques directement depuis le dictionnaire préparé
    infos_geo = data['infos_geo'] 
    
    with open(fichier_csv, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        
        # En-tête mis à jour : "Chauffeur" au lieu de "Camion", et ajout du "Poids"
        writer.writerow(['Chauffeur', 'Ordre', 'Nom_Etape', 'Latitude', 'Longitude', 'Heure_Arrivee', 'Distance_Cumulee_Unite', 'Bacs_a_Collecter', 'Poids_a_Collecter_Kg'])
        
        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            ordre = 1
            distance_cumulee = 0
            
            # On utilise le vrai nom du chauffeur récupéré depuis la base de données
            nom_chauffeur = f"Tournée de {data['driver_names'][vehicle_id]}"
            
            # Parcours de tous les arrêts prévus pour ce chauffeur
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                temps_var = time_dimension.CumulVar(index)
                heure_arrivee = minutes_en_heure(solution.Min(temps_var))
                
                info = infos_geo[node_index]
                bacs = data['demands'][node_index]
                poids = data['weight_demands'][node_index]
                
                # Écriture de la ligne CSV pour cet arrêt
                writer.writerow([nom_chauffeur, ordre, info['nom'], info['lat'], info['lon'], heure_arrivee, distance_cumulee, bacs, poids])
                
                # Passage au point suivant et calcul de la distance accumulée
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                distance_cumulee += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
                ordre += 1

            # Ajout du dernier point : Le retour au Dépôt
            node_index = manager.IndexToNode(index)
            temps_var = time_dimension.CumulVar(index)
            heure_arrivee = minutes_en_heure(solution.Min(temps_var))
            info = infos_geo[node_index]
            
            # Le retour au dépôt n'ajoute ni bac ni poids à la charge (0, 0)
            writer.writerow([nom_chauffeur, ordre, "Retour " + info['nom'], info['lat'], info['lon'], heure_arrivee, distance_cumulee, 0, 0])

            # --- AFFICHAGE DANS LA CONSOLE POUR LE SUIVI ---
            # Calcul du temps de travail total de ce chauffeur
            temps_debut = solution.Min(time_dimension.CumulVar(routing.Start(vehicle_id)))
            temps_fin = solution.Min(time_dimension.CumulVar(index))
            temps_total_minutes = temps_fin - temps_debut
            
            print(f"{nom_chauffeur} : Temps de travail total estimé = {minutes_en_heure(temps_total_minutes)}")

    print(f"\n Fichier '{fichier_csv}' généré avec succès ! Vous pouvez l'importer dans Google My Maps.")

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
        True,
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
        True,
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
        temps_trajet = data['distance_matrix'][from_node][to_node] // 100 
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

    # NOUVEAU : Application des fenêtres horaires DES CHAUFFEURS (Planning)
    for vehicle_id in range(data['num_vehicles']):
        index_depart = routing.Start(vehicle_id)
        index_arrivee = routing.End(vehicle_id)
        
        start_time, end_time = data['vehicle_time_windows'][vehicle_id]
        
        # Le camion ne peut pas quitter le dépôt avant le début du service
        time_dimension.CumulVar(index_depart).SetRange(start_time, end_time)
        # Le camion doit obligatoirement être rentré avant la fin du service
        time_dimension.CumulVar(index_arrivee).SetRange(start_time, end_time)

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
    else:
        print("Aucune solution n'a pu être trouvée avec ces contraintes (Vérifiez si les camions ont assez de capacité ou si les horaires sont compatibles).")