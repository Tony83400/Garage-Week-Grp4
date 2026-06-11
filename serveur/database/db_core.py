import sqlite3
import os

class DatabaseCore:
    def __init__(self, db_name='ma_base.db', reset_db=False):
        self.db_name = db_name
        if reset_db:
            self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self):
        # On remonte d'un dossier car donnee.sql est dans 'serveur/'
        sql_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'donnee.sql')
        if not os.path.exists(sql_file_path):
            print(f"Erreur : Le fichier '{sql_file_path}' est introuvable.")
            return

        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()

        try:
            with self.get_connection() as conn:
                conn.executescript(sql_script)
                conn.commit()
            print("Base de données initialisée (et remise à zéro) avec succès !")
        except sqlite3.Error as e:
            print(f"Erreur lors de l'initialisation : {e}")