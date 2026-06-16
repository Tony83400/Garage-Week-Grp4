"""
Dépôt pour la gestion des utilisateurs et de l'authentification.
Gère les comptes admin et chauffeurs.
"""

import sqlite3

class UtilisateurRepository:
    """Gère les interactions avec la table 'utilisateurs'."""

    def __init__(self, db_core):
        self.db_core = db_core

    def verifier_login(self, email, mdp):
        """
        Vérifie les identifiants de connexion.
        Retourne un dictionnaire contenant les informations de profil si succès.
        """
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            # Jointure pour récupérer les informations de profil liées (si chauffeur)
            cursor.execute('''
                SELECT u.id, u.role, c.nom, c.prenom, c.id as chauffeur_id
                FROM utilisateurs u
                LEFT JOIN chauffeurs c ON u.id = c.utilisateur_id
                WHERE u.email = ? AND u.mot_de_passe = ?
            ''', (email, mdp))
            
            res = cursor.fetchone()
            
            if res:
                u_id, role, nom, prenom, chauffeur_id = res
                
                # Pour les chauffeurs, l'ID utilisé dans l'API est l'id chauffeur
                front_id = chauffeur_id if role == 'chauffeur' and chauffeur_id else u_id
                
                # Construction du nom à afficher
                if prenom and nom:
                    nom_complet = f"{prenom} {nom}"
                else:
                    nom_complet = "Administrateur"
                
                return {
                    "id": front_id, 
                    "role": role, 
                    "nom": nom_complet.strip()
                }
            
            return None

    def ajouter_utilisateur(self, email, mdp, role='chauffeur'):
        """Crée un nouveau compte utilisateur."""
        try:
            with self.db_core.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO utilisateurs (email, mot_de_passe, role) VALUES (?, ?, ?)', 
                    (email, mdp, role)
                )
                conn.commit()
                return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None
