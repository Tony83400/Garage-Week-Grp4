from database_manager import DatabaseManager


db = DatabaseManager(reset_db=True)

list = db.preparer_donnees_ortools("2026-06-15", 48.8, 2.3)
print(list)