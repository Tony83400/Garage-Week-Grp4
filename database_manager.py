import sqlite3
from client import Client

class DatabaseManager:
    def __init__(self, db_name='ma_base.db'):
        """Initialise la connexion et crée les tables si elles n'existent pas."""
        self.db_name = db_name
        self.init_db()

    def _get_connection(self):
        """Retourne une nouvelle connexion à la base de données."""
        return sqlite3.connect(self.db_name)

    def init_db(self):
        """Crée les tables initiales de l'application."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Table des utilisateurs
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS utilisateur (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identifiant TEXT NOT NULL UNIQUE,
                mdp TEXT NOT NULL
            )
            ''')
            
            # Table des clients
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS client (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL UNIQUE,
                adresse TEXT NOT NULL,
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                nbBacs INTEGER NOT NULL,
                poids INTEGER NOT NULL
            )
            ''')
            
            conn.commit()

    def ajouter_utilisateur(self, identifiant, mdp):
        """Permet d'ajouter facilement un utilisateur (pour tes tests)."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO utilisateur (identifiant, mdp) VALUES (?, ?)', 
                    (identifiant, mdp)
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            print(f"Erreur : L'identifiant '{identifiant}' existe déjà.")
            return False

    def verifier_login(self, identifiant, mdp):
        """
        Vérifie si le couple identifiant / mdp est correct.
        Retourne True si c'est bon, False sinon.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT * FROM utilisateur WHERE identifiant = ? AND mdp = ?', 
                (identifiant, mdp)
            )
            resultat = cursor.fetchone()
            
            # Si résultat n'est pas None, c'est que le login/mdp correspond
            return resultat is not None

    def ajouter_client(self, client):
        """Permet d'ajouter facilement un client (pour tes tests)."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO client (nom, adresse, x, y, nbBacs, poids) VALUES (?, ?, ?, ?, ?, ?)',
                    (client.nom, client.adresse, client.x, client.y, client.nbBacs, client.poids)
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            print(f"Erreur : Le client '{client.nom}' existe déjà.")
            return False

    def recuperer_tous_les_clients(self):
        """Récupère et retourne la liste de tous les clients sous forme d'objets Client."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM client')
            lignes = cursor.fetchall()
            
            # On transforme chaque tuple renvoyé par SQLite en un objet Client
            # Rappel de l'ordre : id (0), nom (1), adresse (2), x (3), y (4), nbBacs (5), poids (6)
            return [Client(id=l[0], nom=l[1], adresse=l[2], x=l[3], y=l[4], nbBacs=l[5], poids=l[6]) for l in lignes]

    # --- C'EST ICI QUE TU AJOUTERAS TES FUTURES REQUÊTES ---
    # Def récupérer_tous_les_produits(self):
    #     ...