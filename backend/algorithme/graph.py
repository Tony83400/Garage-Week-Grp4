import networkx as nx

class GraphProcessor:
    def __init__(self, vitesse_moyenne_kmh=40.0, temps_service_minutes=15):
        self.vitesse_moyenne_kmh = vitesse_moyenne_kmh
        self.temps_service_minutes = temps_service_minutes

    def preparer_graphe_et_temps(self, donnees_brutes):
        dist_matrix = donnees_brutes['distance_matrix']
        n = len(dist_matrix)
        
        # 1. Création du Graphe Orienté NetworkX
        G = nx.DiGraph()
        for i in range(n):
            type_noeud = "depot" if i == 0 else "client"
            G.add_node(i, type=type_noeud, demand=donnees_brutes['demands'][i])

        # Si 'noeuds_reference' n'est pas fourni par la BDD, on crée des noms et coordonnées par défaut
        if 'noeuds_reference' in donnees_brutes:
            noeuds_reference = donnees_brutes['noeuds_reference']
        else:
            noeuds_reference = []
            for i in range(n):
                if i == 0:
                    noeuds_reference.append({"nom": "Plateforme La Farlède (Dépôt)", "lat": 43.1672, "lng": 6.0041})
                else:
                    noeuds_reference.append({"nom": f"Client Restaurant/École N°{i}", "lat": 43.1700 + (i*0.01), "lng": 6.0100 + (i*0.01)})

        # 2. Conversion de la distance en temps (minutes) + ajout dans NetworkX
        time_matrix = [[0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    distance_km = dist_matrix[i][j] / 1000.0
                    temps_trajet_minutes = int((distance_km / self.vitesse_moyenne_kmh) * 60)
                    
                    temps_total = temps_trajet_minutes
                    if j != 0: 
                        temps_total += self.temps_service_minutes
                        
                    time_matrix[i][j] = temps_total
                    G.add_edge(i, j, weight=temps_total, distance=distance_km)

        # 3. Assemblage du dictionnaire enrichi envoyé à l'optimizer
        donnees_finales = {
            'time_matrix': time_matrix,
            'distance_matrix': dist_matrix,
            'demands': donnees_brutes['demands'],
            'time_windows': donnees_brutes['time_windows'],
            'vehicle_capacities': donnees_brutes['vehicle_capacities'],
            'num_vehicles': donnees_brutes['num_vehicles'],
            'depot': donnees_brutes['depot'],
            'noeuds_reference': noeuds_reference,  #Injecté à coup sûr pour optimizer.py !
            'graphe_networkx': G
        }
        
        return donnees_finales
    
def get_dynamic_travel_time(from_node, to_node, arrival_time):
    # Créneau bouchons : 7h45 (465 min) à 8h30 (510 min)
    if 465 <= arrival_time <= 510:
        return base_travel_time * 1.5  # Majoration de 50% en heure de pointe
    return base_travel_time