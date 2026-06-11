from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

class RouteOptimizer:
    def __init__(self, donnees_pretes):
        self.data = donnees_pretes
        self.manager = None
        self.routing = None

    def resoudre(self):
        # 1. Initialisation
        self.manager = pywrapcp.RoutingIndexManager(
            len(self.data['distance_matrix']), self.data['num_vehicles'], self.data['depot']
        )
        self.routing = pywrapcp.RoutingModel(self.manager)

        # 2. Callback de distance (Coût)
        def transit_callback(from_index, to_index):
            from_node = self.manager.IndexToNode(from_index)
            to_node = self.manager.IndexToNode(to_index)
            return self.data['distance_matrix'][from_node][to_node]

        transit_callback_index = self.routing.RegisterTransitCallback(transit_callback)
        self.routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # 3. Callbacks pour les capacités (Bacs et Poids)
        def demand_bac_callback(from_index):
            from_node = self.manager.IndexToNode(from_index)
            # Utilise une liste par défaut si la clé n'existe pas encore
            return self.data.get('demands_bacs', self.data['demands'])[from_node]

        def demand_weight_callback(from_index):
            from_node = self.manager.IndexToNode(from_index)
            # Retourne 0 par défaut si pas de poids défini
            return self.data.get('demands_weight', [0] * len(self.data['demands']))[from_node]

        # 4. Enregistrement des callbacks de capacité
        bac_callback_index = self.routing.RegisterUnaryTransitCallback(demand_bac_callback)
        weight_callback_index = self.routing.RegisterUnaryTransitCallback(demand_weight_callback)

        # 5. Ajout des dimensions de capacité
        self.routing.AddDimensionWithVehicleCapacity(
            bac_callback_index, 0, self.data['vehicle_capacities'], True, 'Volume'
        )
        self.routing.AddDimensionWithVehicleCapacity(
            weight_callback_index, 0, [5000] * self.data['num_vehicles'], True, 'Weight' # Exemple limite 5t
        )

        # 6. Time Windows
        time_dim_name = 'Time'
        self.routing.AddDimension(transit_callback_index, 30, 1440, False, time_dim_name)
        time_dimension = self.routing.GetDimensionOrDie(time_dim_name)

        for node_idx, time_window in enumerate(self.data['time_windows']):
            index = self.manager.NodeToIndex(node_idx)
            time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

        # 7. Résolution
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        
        # Stratégie de départ
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        
        # AJOUT : Limite de temps de 10 secondes
        search_parameters.time_limit.seconds = 10 
        
        # On définit aussi une limite pour la recherche locale (métaheuristique)
        # Cela force l'algo à s'arrêter et à te donner la meilleure solution trouvée.

        solution = self.routing.SolveWithParameters(search_parameters)

        if solution:
            return self._extraire_resultats(solution, time_dimension)
        else:
            return {"status": "Erreur", "message": "Aucun itinéraire optimal trouvé."}

    def _extraire_resultats(self, solution, time_dimension):
        """
        Structure la solution en JSON.
        """
        resultat = {
            "status": "Succès",
            "tournees": {}
        }

        references = self.data['infos_geo']
        dist_matrix = self.data['distance_matrix']

        for vehicle_id in range(self.data['num_vehicles']):
            index = self.routing.Start(vehicle_id)
            itineraire_camion = []
            distance_cumulee_metre = 0
            noeud_precedent = None
            
            while not self.routing.IsEnd(index):
                node_id = self.manager.IndexToNode(index)
                
                if noeud_precedent is not None:
                    distance_cumulee_metre += dist_matrix[noeud_precedent][node_id]
                
                info_noeud = references[node_id]
                itineraire_camion.append({
                    "nom": info_noeud["nom"],
                    "heure": solution.Min(time_dimension.CumulVar(index)),
                    "dist_km": round(distance_cumulee_metre / 1000.0, 2)
                })
                
                noeud_precedent = node_id
                index = solution.Value(self.routing.NextVar(index))
            
            resultat["tournees"][f"Camion_{vehicle_id}"] = itineraire_camion

        return resultat