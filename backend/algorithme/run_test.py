# run_test.py
import json
from database_manager import DatabaseManager
from graph import GraphProcessor
from optimizer import RouteOptimizer

def main():
    # 1. Initialisation
    db = DatabaseManager(db_name='ma_base.db')
    
    # On récupère les données brutes depuis la BDD
    # (Coordonnées du dépôt fixées arbitrairement à La Farlède)
    donnees_brutes = db.preparer_donnees_ortools(
        date_jour="2026-06-15", 
        depot_lat=43.1672, 
        depot_lon=6.0041
    )
    
    # 2. Préparation des données (Graphe et Matrices)
    # Le GraphProcessor va créer le dictionnaire final avec 'noeuds_reference'
    processor = GraphProcessor(vitesse_moyenne_kmh=40.0, temps_service_minutes=15)
    
    # On injecte les noms réels extraits de la BDD pour qu'ils soient utilisés dans l'optimizer
    # On récupère les noms de entreprises depuis infos_geo de la base
    n = len(donnees_brutes['demands'])
    refs = []
    for i in range(n):
        if i == 0:
            refs.append({"nom": "Dépôt / Point de départ", "lat": 43.1672, "lng": 6.0041})
        else:
            # On récupère les infos stockées lors de la préparation dans database_manager
            info = donnees_brutes['infos_geo'][i]
            refs.append({"nom": info['nom'], "lat": info['lat'], "lng": info['lon']})
    
    donnees_brutes['noeuds_reference'] = refs
    
    donnees_pretes = processor.preparer_graphe_et_temps(donnees_brutes)
    
    # 3. Optimisation
    optimizer = RouteOptimizer(donnees_pretes)
    solution = optimizer.resoudre()
    
    # 4. Affichage du résultat final (propre)
    print(json.dumps(solution, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    main()