"""
Cœur de la gestion de la base de données SQLite.
Gère la connexion et l'initialisation du schéma.
"""

import sqlite3
import os

class DatabaseCore:
    """Fournit des méthodes pour se connecter et initialiser la base de données."""

    def __init__(self, db_name='ma_base.db', reset_db=False):
        self.db_name = db_name
        if reset_db:
            self.init_db()

    def get_connection(self):
        """Retourne une connexion active à SQLite avec support des clés étrangères."""
        conn = sqlite3.connect(self.db_name)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self):
        """Exécute le script SQL d'initialisation (donnee.sql)."""
        # Le script se trouve à la racine du dossier serveur
        sql_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'donnee.sql')
        
        if not os.path.exists(sql_file_path):
            print(f"Erreur : Le fichier d'initialisation '{sql_file_path}' est introuvable.")
            return

        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()

        try:
            with self.get_connection() as conn:
                conn.executescript(sql_script)
                conn.commit()
            print("Base de données initialisée avec succès.")
        except sqlite3.Error as e:
            print(f"Erreur lors de l'initialisation SQL : {e}")
