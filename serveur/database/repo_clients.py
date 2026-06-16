"""
Dépôt pour la gestion des données clients.
Inclut l'ajout, la récupération, la suppression et le géocodage inverse des adresses.
"""

import sqlite3
import sys
import os
import urllib.request
import json
import time

# Ajout du répertoire parent au chemin pour l'import de Client
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from client import Client

class ClientRepository:
    """Gère les interactions avec la table 'clients' en base de données."""

    def __init__(self, db_core):
        self.db_core = db_core

    def ajouter_client(self, client):
        """Enregistre un nouveau client."""
        try:
            with self.db_core.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO clients (nom_entreprise, latitude, longitude, adresse, date_debut_contrat, date_fin_contrat) VALUES (?, ?, ?, ?, ?, ?)',
                    (client.nom_entreprise, client.latitude, client.longitude, client.adresse, client.date_debut_contrat, client.date_fin_contrat)
                )
                conn.commit()
                client.id = cursor.lastrowid
                return True
        except sqlite3.IntegrityError:
            return False

    def recuperer_tous_les_clients(self):
        """Retourne la liste complète des clients sous forme d'objets Client."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nom_entreprise, latitude, longitude, adresse, date_debut_contrat, date_fin_contrat FROM clients')
            lignes = cursor.fetchall()
            return [
                Client(
                    id=l[0], 
                    nom_entreprise=l[1], 
                    latitude=l[2], 
                    longitude=l[3], 
                    adresse=l[4], 
                    date_debut_contrat=l[5], 
                    date_fin_contrat=l[6]
                ) for l in lignes
            ]

    def get_disponibilites_client(self, client_id):
        """Récupère les créneaux de collecte d'un client."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT id, client_id, jour_semaine, heure_debut, heure_fin FROM disponibilites_clients WHERE client_id = ? ORDER BY jour_semaine',
                (client_id,)
            )
            rows = cursor.fetchall()
            return [
                {
                    'id': r[0], 
                    'client_id': r[1], 
                    'jour_semaine': r[2], 
                    'heure_debut': r[3], 
                    'heure_fin': r[4]
                } for r in rows
            ]

    def supprimer_client(self, client_id):
        """Supprime un client et ses données liées."""
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM clients WHERE id = ?', (client_id,))
            conn.commit()
            return cursor.rowcount > 0

    def backfill_adresses_nominatim(self):
        """
        Complète les adresses manquantes via l'API de géocodage inverse Nominatim.
        S'exécute généralement en arrière-plan.
        """
        with self.db_core.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, latitude, longitude FROM clients WHERE adresse IS NULL')
            clients_sans_adresse = cursor.fetchall()

        updated = 0
        for client_id, lat, lon in clients_sans_adresse:
            try:
                url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'AlchiRoute/1.0 contact@les-alchimistes.fr'
                })
                with urllib.request.urlopen(req, timeout=5) as r:
                    data = json.loads(r.read().decode())
                    adresse = data.get('display_name', '')
                
                if adresse:
                    with self.db_core.get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute('UPDATE clients SET adresse = ? WHERE id = ?', (adresse, client_id))
                        conn.commit()
                    updated += 1
                
                # Respect des conditions d'utilisation de Nominatim (max 1 req/sec)
                time.sleep(1) 
            except Exception as e:
                print(f"Erreur Nominatim pour client {client_id}: {e}")

        return updated
