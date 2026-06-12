import sqlite3

class UtilisateurRepository:
    def __init__(self, db_core):
        self.db_core = db_core

    def verifier_login(self, email, mdp):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, role FROM utilisateurs WHERE email = ? AND mot_de_passe = ?', (email, mdp))
            res = cursor.fetchone()
            return {"id": res[0], "role": res[1]} if res else None

    def ajouter_utilisateur(self, email, mdp, role='chauffeur'):
        try:
            with self.db_core.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('INSERT INTO utilisateurs (email, mot_de_passe, role) VALUES (?, ?, ?)', (email, mdp, role))
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            print(f"Erreur : L'email '{email}' existe déjà.")
            return False