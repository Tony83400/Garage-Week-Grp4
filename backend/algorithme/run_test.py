# run_test.py
from graph import GraphProcessor
from optimizer import RouteOptimizer

# Le dictionnaire de données brutes reçu de votre test SQL
donnees_test_brutes = {
    'vehicle_capacities': [20, 15, 25], 
    'num_vehicles': 3, 
    'depot': 0, 
    'demands': [0, 6, 3, 10, 4, 5, 2, 1, 2, 3, 2], 
    'time_windows': [(0, 1440), (360, 720), (840, 1080), (480, 1020), (480, 600), (420, 960), (540, 1200), (600, 840), (300, 660), (540, 720), (0, 1439)], 
    'distance_matrix': [
        [0, 6740, 6741, 6734, 6721, 6722, 6780, 6849, 6680, 6736, 6731], 
        [6740, 0, 36, 28, 22, 50, 80, 198, 84, 4, 9], 
        [6741, 36, 0, 64, 31, 22, 112, 229, 65, 37, 37], 
        [6734, 28, 64, 0, 41, 76, 61, 179, 102, 27, 27], 
        [6721, 22, 31, 41, 0, 36, 100, 218, 63, 18, 15], 
        [6722, 50, 22, 76, 36, 0, 130, 248, 44, 50, 48], 
        [6780, 80, 112, 61, 100, 130, 0, 118, 163, 82, 85], 
        [6849, 198, 229, 179, 218, 248, 118, 0, 281, 200, 203], 
        [6680, 84, 65, 102, 63, 44, 163, 281, 0, 82, 78], 
        [6736, 4, 37, 27, 18, 50, 82, 200, 82, 0, 4], 
        [6731, 9, 37, 27, 15, 48, 85, 203, 78, 4, 0]
    ]
}

# 1. Étape Graphe : Conversion physique des unités
processor = GraphProcessor(vitesse_moyenne_kmh=40.0, temps_service_minutes=15)
donnees_pretes = processor.preparer_graphe_et_temps(donnees_test_brutes)

# 2. Étape Résolution : Calcul mathématique des tournées
optimizer = RouteOptimizer(donnees_pretes)
solution_finale = optimizer.resoudre()

# 3. Affichage du résultat
print("--- RÉSULTAT DU CALCUL D'OPTIMISATION ---")
import json
print(json.dumps(solution_finale, indent=4, ensure_ascii=False))