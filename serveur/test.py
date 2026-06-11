from database_manager import DatabaseManager
from solveur_ortools import resoudre_et_exporter

import sys


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
    
    # 1. Le gestionnaire de BDD prépare toutes les données (y compris les noms/coordonnées)
    data_ortools = db.preparer_donnees_ortools(DATE_CIBLE, DEPOT_LAT, DEPOT_LON)
    
    # 2. Le solveur calcule et exporte le CSV en recevant uniquement le dictionnaire en entrée
    resoudre_et_exporter(data_ortools)