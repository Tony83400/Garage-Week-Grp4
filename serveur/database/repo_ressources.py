import sqlite3

class RessourceRepository:
    def __init__(self, db_core):
        self.db_core = db_core

    def ajouter_camion(self, immatriculation, charge_max_kg, bacs_max):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO camions (immatriculation, charge_max_kg, bacs_max) VALUES (?, ?, ?)',
                (immatriculation, charge_max_kg, bacs_max)
            )
            conn.commit()
            return cursor.lastrowid

    def recuperer_tous_les_camions(self):
        with self.db_core.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM camions')
            return [dict(row) for row in cursor.fetchall()]

    def ajouter_chauffeur(self, utilisateur_id, nom, prenom, telephone):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO chauffeurs (utilisateur_id, nom, prenom, telephone) VALUES (?, ?, ?, ?)',
                (utilisateur_id, nom, prenom, telephone)
            )
            conn.commit()
            return cursor.lastrowid

    def recuperer_tous_les_chauffeurs(self):
        with self.db_core.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT c.id, c.utilisateur_id, c.nom, c.prenom, c.telephone, u.email
                FROM chauffeurs c
                LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
            ''')
            return [dict(row) for row in cursor.fetchall()]

    def recuperer_disponibilites_chauffeur(self, chauffeur_id):
        with self.db_core.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, jour_semaine, heure_debut, heure_fin
                FROM disponibilites_chauffeurs
                WHERE chauffeur_id = ?
            ''', (chauffeur_id,))
            return [dict(row) for row in cursor.fetchall()]

    def remplacer_disponibilites_chauffeur(self, chauffeur_id, disponibilites):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            # Supprimer les anciennes disponibilités
            cursor.execute('DELETE FROM disponibilites_chauffeurs WHERE chauffeur_id = ?', (chauffeur_id,))
            # Ajouter les nouvelles
            for dispo in disponibilites:
                cursor.execute('''
                    INSERT INTO disponibilites_chauffeurs (chauffeur_id, jour_semaine, heure_debut, heure_fin)
                    VALUES (?, ?, ?, ?)
                ''', (chauffeur_id, dispo['jour_semaine'], dispo['heure_debut'], dispo['heure_fin']))
            conn.commit()
            return True