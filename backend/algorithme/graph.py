# api-node/algorithm/graph.py

import math
import networkx as nx

class GraphBuilder:
    def __init__(self, vitesse_moyenne_kmh=40.0):
        #Initialise le générateur de graphes avec des paramètres physiques de base.

        self.vitesse_moyenne_kmh = vitesse_moyenne_kmh
        # Coordonnées par défaut de la Plateforme Alchimistes de La Farlède (ID 0 / Dépôt)
        self.depot_lat = 43.1672
        self.depot_lng = 6.0041

    def _calculer_distance_haversine(self, lat1, lon1, lat2, lon2):
        
        #Calcule la distance mathématique en kilomètres entre deux coordonnées GPS.
        
        R = 6371.0  # Rayon moyen de la Terre en kilomètres
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def _calculer_temps_trajet_minutes(self, dist_km):
        #Calcule le temps théorique en minutes selon une vitesse moyenne.
        
        if dist_km == 0:
            return 0
        return int((dist_km / self.vitesse_moyenne_kmh) * 60)

    def generer_donnees_optimisation(self, liste_clients):
        
        #Prend une liste de dictionnaires clients, crée le graphe NetworkX, 
        #gère les contraintes temporelles sur les arêtes et génère la matrice pour OR-Tools.
        
        #Format attendu pour chaque client :
        #{ "id": int, "nom": str, "latitude": float, "longitude": float, "bacs_prevus": int }
        
        G = nx.DiGraph()

        # On s'assure que le dépôt est TOUJOURS présent à l'index 0
        noeuds_ordonnes = []
        noeuds_ordonnes.append({
            "index_ortools": 0,
            "id_reel": 0,
            "nom": "Plateforme La Farlède (Dépôt)",
            "lat": self.depot_lat,
            "lng": self.depot_lng,
            "bacs": 0
        })
        G.add_node(0, nom="Dépôt La Farlède", type="depot", bacs=0)

        # On ajoute les clients de la liste fournie
        for idx, client in enumerate(liste_clients, start=1):
            noeuds_ordonnes.append({
                "index_ortools": idx,
                "id_reel": client.get("id"),
                "nom": client.get("nom_entreprise", client.get("nom", "Client")),
                "lat": client.get("latitude"),
                "lng": client.get("longitude"),
                "bacs": client.get("bacs_prevus", 0)
            })
            G.add_node(idx, nom=noeuds_ordonnes[-1]["nom"], type="client", bacs=noeuds_ordonnes[-1]["bacs"])

        nb_points = len(noeuds_ordonnes)

        # Création de toutes les arêtes orientées possibles (graphe complet)
        for i in range(nb_points):
            for j in range(nb_points):
                if i != j:
                    p1 = noeuds_ordonnes[i]
                    p2 = noeuds_ordonnes[j]
                    
                    # Calcul de la distance géodésique
                    distance = self._calculer_distance_haversine(p1["lat"], p1["lng"], p2["lat"], p2["lng"])
                    temps_trajet = self._calculer_temps_trajet_minutes(distance)
                    
                    # --- APPLICATION DES CONTRAINTES DE VARIATION TEMPORELLE ---
                    # Exemple métier : Éviter les zones scolaires/écoles à l'heure d'affluence (8h)
                    # Si le lieu de destination contient le mot "école", on applique une forte pénalité 
                    # sur le coût de l'arête pour forcer l'algo à chercher une autre route à ce moment-là.
                    if "école" in p2["nom"].lower() or "school" in p2["nom"].lower():
                        temps_trajet += 20  # Ajout d'une pénalité artificielle de 20 minutes de bouchons

                    G.add_edge(i, j, weight=temps_trajet, distance_km=round(distance, 2))

        # Extraction de la matrice carrée des temps pour OR-Tools
        time_matrix = []
        for i in range(nb_points):
            ligne = []
            for j in range(nb_points):
                if i == j:
                    ligne.append(0)
                else:
                    ligne.append(G[i][j]['weight'])
            time_matrix.append(ligne)

        # Structure finale propre pour alimenter le solveur d'OR-Tools
        return {
            "time_matrix": time_matrix,
            "demands": [n["bacs"] for n in noeuds_ordonnes],
            "noeuds_reference": noeuds_ordonnes,
            "depot": 0,
            "graphe_networkx": G
        }

if __name__ == "__main__":
    # Petit test d'exécution rapide pour vérifier que tes fonctions calculent bien
    print("--- Test des fonctions algorithmiques de graph.py ---")
    
    # Simulation d'une liste brute reçue (comme celle provenant de fausses_data)
    clients_test = [
        {"id": 10, "nom_entreprise": "École des Alchimistes", "latitude": 43.1800, "longitude": 6.0200, "bacs_prevus": 5},
        {"id": 11, "nom_entreprise": "Restaurant du Port", "latitude": 43.1200, "longitude": 5.9300, "bacs_prevus": 3}
    ]
    
    builder = GraphBuilder()
    data_out = builder.generer_donnees_optimisation(clients_test)
    
    print("\nMatrice de temps calculée (en minutes) :")
    for row in data_out["time_matrix"]:
        print(row)
        
    print("\nListe des demandes de poubelles alignée sur la matrice :", data_out["demands"])
    print("Calcul mathématique ok !")