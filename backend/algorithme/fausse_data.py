# api-node/algorithm/mock_data.py

def get_simulated_data():
    """
    Retourne les données de test pour l'algorithme d'optimisation.
    Inclus : Le dépôt, les clients (écoles, restos) et les contraintes.
    """
    data = {}
    
    # Liste des points (0 est toujours le point de départ/retour : Le dépôt)
    data['locations'] = [
        {"id": 0, "name": "Plateforme La Farlède (Dépôt)", "type": "depot"},
        {"id": 1, "name": "École Primaire Nice", "type": "ecole", "horaire_strict": "08:00"},
        {"id": 2, "name": "Restaurant Vieux Nice", "type": "resto"},
        {"id": 3, "name": "EHPAD Toulon", "type": "ehpad"},
        {"id": 4, "name": "Supermarché Cuers", "type": "indus"}
    ]
    
    # Demande en nombre de bacs à collecter pour chaque point
    # Le dépôt (0) a une demande de 0 bac.
    data['demands'] = [0, 4, 2, 7, 12] 
    
    # Caractéristiques des véhicules disponibles (Alchimistes)
    data['vehicle_capacities'] = [15, 15]  # 2 camions pouvant transporter 15 bacs chacun
    data['num_vehicles'] = 2
    data['depot'] = 0
    
    return data


def get_poubelles_for_location(location_id):
    data = get_simulated_data()
    
    # La position dans la liste 'demands' correspond à l'id du lieu
    if 0 <= location_id < len(data['demands']):
        return data['demands'][location_id]
    return 0

# Exemple d'appel pour l'École (id: 1)
nb_bacs = get_poubelles_for_location(1)


if __name__ == "__main__":
    # Petit test pour vérifier que le fichier s'exécute bien
    print("Test mock_data :", get_simulated_data()['locations'][1]["name"])
    print(f"Nombre de poubelles à collecter : {nb_bacs}") 