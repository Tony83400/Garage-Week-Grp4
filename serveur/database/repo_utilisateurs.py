import sqlite3

class UtilisateurRepository:
    def __init__(self, db_core):
        self.db_core = db_core

    def verifier_login(self, email, mdp):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            # On utilise un LEFT JOIN pour récupérer les infos du chauffeur s'il existe
            cursor.execute('''
                SELECT u.id, u.role, c.nom, c.prenom, c.id as chauffeur_id
                FROM utilisateurs u
                LEFT JOIN chauffeurs c ON u.id = c.utilisateur_id
                WHERE u.email = ? AND u.mot_de_passe = ?
            ''', (email, mdp))
            res = cursor.fetchone()
            
            if res:
                u_id, role, nom, prenom, chauffeur_id = res
                
                # Pour le front, le 'user_id' d'un chauffeur doit être son ID de chauffeur (pour l'URL /api/chauffeur/<id>)
                front_id = chauffeur_id if role == 'chauffeur' and chauffeur_id else u_id
                
                # Formatage du nom complet
                nom_complet = f"{prenom} {nom}" if prenom and nom else "Admin"
                
                return {"id": front_id, "role": role, "nom": nom_complet.strip()}
            return None

    def ajouter_utilisateur(self, email, mdp, role='chauffeur'):
        try:
            with self.db_core.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('INSERT INTO utilisateurs (email, mot_de_passe, role) VALUES (?, ?, ?)', (email, mdp, role))
                conn.commit()
                return cursor.lastrowid
        except sqlite3.IntegrityError:
            print(f"Erreur : L'email '{email}' existe déjà.")
            return None