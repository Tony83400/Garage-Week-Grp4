# Import de votre gestionnaire de base de données
from database_manager import DatabaseManager
# Import de la fonction principale du solveur OR-Tools fraîchement créée
from solveur_ortools import resoudre_et_exporter

# =====================================================================
# BLOC D'EXÉCUTION PRINCIPAL
# =====================================================================
# =====================================================================
# BLOC D'EXÉCUTION PRINCIPAL
# =====================================================================
if __name__ == '__main__':
    # Initialisation de la base
    db = DatabaseManager('ma_base.db', reset_db=True)
    
    # Nouvelles coordonnées du Dépôt Central : LA FARLÈDE (Var)
    DEPOT_LAT = 43.1670
    DEPOT_LON = 6.0430
    DATE_CIBLE = '2026-06-15'
    
    print(f"Extraction des données depuis la BDD pour la date : {DATE_CIBLE}...")
    
    # 1. On récupère le dictionnaire
    data_ortools = db.preparer_donnees_ortools(DATE_CIBLE, DEPOT_LAT, DEPOT_LON)
    
    # 2. On lance l'algorithme (Assurez-vous d'avoir créé solveur_ortools.py comme vu précédemment)
    resoudre_et_exporter(data_ortools, db.db_name, DEPOT_LAT, DEPOT_LON)