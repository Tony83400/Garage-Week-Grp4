# api-node/algorithm/optimizer.py

from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

class RouteOptimizer:
    def __init__(self, donnees_pretes):
        """
        Initialise le solveur avec les données prêtes issues de graph.py.
        """
        self.data = donnees_pretes
        self.manager = None
        self.routing = None

    def resoudre(self):
        # ... (Garde TOUT le début de ta fonction resoudre() STRICTEMENT IDENTIQUE) ...
        # (Les étapes 1, 2, 3, 4, 5, 6 et 7 restent les mêmes)
        
        self.manager = pywrapcp.RoutingIndexManager(
            len(self.data['time_matrix']), self.data['num_vehicles'], self.data['depot']
        )
        self.routing = pywrapcp.RoutingModel(self.manager)

        def transit_callback(from_index, to_index):
            from_node = self.manager.IndexToNode(from_index)
            to_node = self.manager.IndexToNode(to_index)
            return self.data['time_matrix'][from_node][to_node]

        transit_callback_index = self.routing.RegisterTransitCallback(transit_callback)
        self.routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        def demand_callback(from_index):
            from_node = self.manager.IndexToNode(from_index)
            return self.data['demands'][from_node]

        demand_callback_index = self.routing.RegisterUnaryTransitCallback(demand_callback)
        self.routing.AddDimensionWithVehicleCapacity(
            demand_callback_index, 0, self.data['vehicle_capacities'], True, 'Capacity'
        )

        time_dim_name = 'Time'
        self.routing.AddDimension(transit_callback_index, 30, 1440, False, time_dim_name)
        time_dimension = self.routing.GetDimensionOrDie(time_dim_name)

        for node_idx, time_window in enumerate(self.data['time_windows']):
            index = self.manager.NodeToIndex(node_idx)
            time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC

        solution = self.routing.SolveWithParameters(search_parameters)

        if solution:
            # ICI on passe bien self.data pour avoir accès à la matrice de distances et aux noms
            return self._extraire_resultats(solution, time_dimension)
        else:
            return {"status": "Erreur", "message": "Aucun itinéraire optimal trouvé."}

    def _extraire_resultats(self, solution, time_dimension):
        """
        Structure la solution en y ajoutant les Noms, Coordonnées GPS, 
        et la Distance Cumulative parcourue par chaque camion.
        """
        resultat = {
            "status": "Succès",
            "tournees": {}
        }

        # Récupération des correspondances géographiques issues de graph.py
        references = self.data['noeuds_reference']
        dist_matrix = self.data['distance_matrix']

        for vehicle_id in range(self.data['num_vehicles']):
            index = self.routing.Start(vehicle_id)
            itineraire_camion = []
            charge_accumulee = 0
            distance_cumulee_metre = 0
            noeud_precedent = None
            
            while not self.routing.IsEnd(index):
                node_id = self.manager.IndexToNode(index)
                time_var = time_dimension.CumulVar(index)
                
                # Calcul de la distance depuis l'arrêt précédent
                if noeud_precedent is not None:
                    distance_cumulee_metre += dist_matrix[noeud_precedent][node_id]
                
                # Extraction des métadonnées du nœud actuel
                info_noeud = references[node_id]
                
                itineraire_camion.append({
                    "index_ortools": node_id,
                    "nom_adresse": info_noeud["nom"],
                    "latitude": info_noeud["lat"],
                    "longitude": info_noeud["lng"],
                    "heure_arrivee_estimee_min": solution.Min(time_var),
                    "distance_cumulee_km": round(distance_cumulee_metre / 1000.0, 2),
                    "bacs_a_collecter": self.data['demands'][node_id]
                })
                
                charge_accumulee += self.data['demands'][node_id]
                noeud_precedent = node_id
                index = solution.Value(self.routing.NextVar(index))
            
            # --- AJOUT DU RETOUR FINAL AU DÉPÔT ---
            node_id = self.manager.IndexToNode(index)
            time_var = time_dimension.CumulVar(index)
            if noeud_precedent is not None:
                distance_cumulee_metre += dist_matrix[noeud_precedent][node_id]
                
            info_noeud = references[node_id]
            itineraire_camion.append({
                "index_ortools": node_id,
                "nom_adresse": info_noeud["nom"],
                "latitude": info_noeud["lat"],
                "longitude": info_noeud["lng"],
                "heure_arrivee_estimee_min": solution.Min(time_var),
                "distance_cumulee_km": round(distance_cumulee_metre / 1000.0, 2),
                "bacs_a_collecter": 0
            })

            # On n'enregistre la tournée que si le camion travaille (visite des clients)
            if len(itineraire_camion) > 2:
                resultat["tournees"][f"Camion_{vehicle_id}"] = {
                    "capacite_max_camion": self.data['vehicle_capacities'][vehicle_id],
                    "total_bacs_collectes": charge_accumulee,
                    "distance_totale_tournee_km": round(distance_cumulee_metre / 1000.0, 2),
                    "etapes": itineraire_camion
                }

        return resultat