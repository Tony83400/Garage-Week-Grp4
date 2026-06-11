import sqlite3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from client import Client

class ClientRepository:
    def __init__(self, db_core):
        self.db_core = db_core

    def ajouter_client(self, client):
        try:
            with self.db_core.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO clients (nom_entreprise, latitude, longitude) VALUES (?, ?, ?)',
                    (client.nom_entreprise, client.latitude, client.longitude)
                )
                conn.commit()
                client.id = cursor.lastrowid 
                return True
        except sqlite3.IntegrityError:
            print(f"Erreur : Le client '{client.nom_entreprise}' n'a pas pu être ajouté.")
            return False

    def recuperer_tous_les_clients(self):
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nom_entreprise, latitude, longitude FROM clients')
            lignes = cursor.fetchall()
            return [Client(id=l[0], nom_entreprise=l[1], latitude=l[2], longitude=l[3]) for l in lignes]