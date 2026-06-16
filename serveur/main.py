"""
Serveur Flask pour la gestion de la logistique et de la planification des tournées.
Fournit une API REST pour les clients, chauffeurs, administrateurs et l'optimisation IA.
"""

from flask import Flask, request, jsonify
from database.database_manager import DatabaseManager
from client import Client
from datetime import date
from flask_cors import CORS
import threading
import os
from dotenv import load_dotenv
from solveur_ortools import resoudre_et_exporter

# Chargement de la configuration
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)
CORS(app)

# Initialisation de la base de données (reset_db=True pour repartir sur une base propre au démarrage)
db = DatabaseManager(reset_db=True)

# --- Authentification ---

@app.route('/login', methods=['POST'])
def login():
    """Vérifie les identifiants et retourne le rôle de l'utilisateur."""
    data = request.get_json()
    if not data or 'email' not in data or 'mot_de_passe' not in data:
        return jsonify({"erreur": "Veuillez fournir un email et un mot_de_passe."}), 400
    
    utilisateur = db.verifier_login(data['email'], data['mot_de_passe'])
    
    if utilisateur:
        return jsonify({
            "message": "Connexion réussie",
            "user_id": utilisateur["id"],
            "role": utilisateur["role"],
            "nom": utilisateur["nom"]
        }), 200
    
    return jsonify({"erreur": "Email ou mot de passe incorrect."}), 401

# --- Gestion des Clients ---

@app.route('/clients', methods=['GET'])
def get_clients():
    """Récupère la liste complète des clients."""
    liste_clients = db.recuperer_tous_les_clients()
    return jsonify([client.to_dict() for client in liste_clients]), 200

@app.route('/clients', methods=['POST'])
def add_client():
    """Ajoute un nouveau client ou site de collecte."""
    data = request.get_json()
    
    nom = data.get('nom') or data.get('nom_entreprise')
    if not nom:
        return jsonify({"erreur": "Le champ 'nom' est requis."}), 400
    
    lat = data.get('latitude', 43.1200)
    lon = data.get('longitude', 5.9300)
    adresse = data.get('adresse')
    date_debut = data.get('date_debut_contrat')
    date_fin = data.get('date_fin_contrat')

    nouveau_client = Client(
        nom_entreprise=nom, 
        latitude=lat, 
        longitude=lon, 
        adresse=adresse, 
        date_debut_contrat=date_debut, 
        date_fin_contrat=date_fin
    )

    if db.ajouter_client(nouveau_client):
        return jsonify({
            "message": f"Site '{nouveau_client.nom_entreprise}' enregistré.", 
            "id": nouveau_client.id
        }), 201
    
    return jsonify({"erreur": f"Le site '{nouveau_client.nom_entreprise}' n'a pas pu être ajouté."}), 409

@app.route('/disponibilites', methods=['POST'])
def add_disponibilite():
    """Définit les créneaux de collecte pour un client."""
    data = request.get_json()
    client_id   = data.get('client_id')
    jour        = data.get('jour_semaine')
    heure_debut = data.get('heure_debut')
    heure_fin   = data.get('heure_fin')

    if not all([client_id, jour, heure_debut, heure_fin]):
        return jsonify({"erreur": "Champs manquants."}), 400

    db.ajouter_disponibilite_client(client_id, jour, heure_debut, heure_fin)
    return jsonify({"message": "Disponibilité ajoutée."}), 201

@app.route('/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Supprime un client (suppression en cascade gérée en BDD)."""
    if db.supprimer_client(client_id):
        return jsonify({"message": f"Client {client_id} supprimé."}), 200
    return jsonify({"erreur": "Client introuvable."}), 404

@app.route('/clients/<int:client_id>/disponibilites', methods=['GET'])
def get_disponibilites_client(client_id):
    """Retourne les créneaux horaires d'un client spécifique."""
    return jsonify(db.get_disponibilites_client(client_id)), 200

@app.route('/clients/backfill-adresses', methods=['POST'])
def backfill_adresses():
    """Complète les adresses manquantes via reverse geocoding en arrière-plan."""
    threading.Thread(target=db.backfill_adresses_nominatim, daemon=True).start()
    return jsonify({"message": "Traitement lancé en arrière-plan"}), 202

# --- Tableau de Bord & Statistiques ---

@app.route('/api/dashboard/stats', methods=['GET'])
def api_dashboard_stats():
    """Retourne les indicateurs de performance (KPI) pour une date donnée."""
    date_jour = request.args.get('date', date.today().isoformat())
    return jsonify(db.get_dashboard_stats(date_jour)), 200

@app.route('/api/dashboard/activite', methods=['GET'])
def api_dashboard_activite():
    """Retourne le flux d'activité récent (validations, erreurs)."""
    date_jour = request.args.get('date', date.today().isoformat())
    return jsonify(db.get_activite_recente(date_jour)), 200

# --- Espace Chauffeur ---

@app.route('/api/chauffeur/<int:chauffeur_id>/tournee', methods=['GET'])
def api_get_tournee_chauffeur(chauffeur_id):
    """Récupère la feuille de route du jour pour un chauffeur."""
    date_jour = request.args.get('date', date.today().isoformat())
    tournee = db.recuperer_tournee_chauffeur(chauffeur_id, date_jour)
    
    if not tournee:
        return jsonify({"message": "Aucune tournée pour aujourd'hui."}), 200
    return jsonify(tournee), 200

@app.route('/api/chauffeur/tournee/<int:tournee_id>/statut', methods=['POST'])
def api_update_statut_tournee(tournee_id):
    """Met à jour le statut global d'une tournée (démarrée/terminée)."""
    data = request.get_json() or {}
    nouveau_statut = data.get('statut')
    
    if nouveau_statut not in ['demarree', 'terminee']:
        return jsonify({"erreur": "Statut invalide."}), 400
        
    db.mettre_a_jour_statut_tournee(tournee_id, nouveau_statut)
    return jsonify({"message": "Statut mis à jour."}), 200

@app.route('/api/chauffeur/tache/<int:tache_id>/statut', methods=['POST'])
def api_update_statut_tache(tache_id):
    """Valide une étape de collecte sur le terrain (succès ou erreur)."""
    data = request.get_json() or {}
    
    statut = data.get('statut')  # 'terminee' ou 'erreur'
    bacs_reels = data.get('bacs_reels')
    commentaire = data.get('commentaire')
    type_imprevu = data.get('type_imprevu')
    
    if statut not in ['terminee', 'erreur']:
        return jsonify({"erreur": "Statut invalide."}), 400
        
    if statut == 'terminee' and bacs_reels is None:
        return jsonify({"erreur": "Le nombre de bacs est requis."}), 400
        
    if statut == 'erreur':
        bacs_reels = 0
        if not commentaire:
            commentaire = "Incident signalé par le chauffeur"

    succes = db.mettre_a_jour_statut_etape(tache_id, statut, bacs_reels, commentaire, type_imprevu)
    
    if succes:
        return jsonify({
            "message": "Étape mise à jour.",
            "statut": statut,
            "bacs_reels": bacs_reels
        }), 200
    
    return jsonify({"erreur": "Tâche introuvable."}), 404

# --- Administration & Planning ---

@app.route('/api/admin/planning', methods=['GET'])
def api_admin_planning():
    """Liste détaillée des tournées pour l'interface de gestion."""
    date_jour = request.args.get('date', date.today().isoformat())
    return jsonify(db.get_tournees_detaillees(date_jour)), 200

@app.route('/api/imprevus', methods=['GET'])
def get_imprevus():
    """Récupère la liste des collectes en échec."""
    date_jour = request.args.get('date', date.today().isoformat())
    return jsonify(db.recuperer_imprevus(date_jour)), 200

@app.route('/api/imprevus/<int:tache_id>/replanifier', methods=['POST'])
def replanifier_imprevu(tache_id):
    """Remet une tâche en échec dans la file d'attente pour ré-optimisation."""
    if db.remettre_imprevu_en_attente(tache_id):
        return jsonify({"message": "Tâche prête pour la prochaine optimisation."}), 200
    return jsonify({"erreur": "Tâche introuvable."}), 404

@app.route('/api/planning/preview', methods=['GET'])
def api_planning_preview():
    """Aperçu rapide avant génération des tournées."""
    date_jour = request.args.get('date', date.today().isoformat())
    return jsonify(db.get_planning_preview(date_jour)), 200

@app.route('/api/planning/generer', methods=['POST'])
def api_generer_brouillons():
    """Génère les tâches de collecte prévisionnelles pour une date donnée."""
    data_req = request.get_json() or {}
    date_cible = data_req.get('date', date.today().isoformat())
    
    try:
        resultat = db.generer_brouillons_jour(date_cible) 
        if resultat["status"] == "erreur":
            return jsonify({"erreur": resultat["message"]}), 400
            
        return jsonify({
            "message": f"Génération réussie : {resultat['taches_creees']} tâches créées."
        }), 201
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500


@app.route('/api/planning/optimiser', methods=['POST'])
def api_optimiser_tournees():
    """Lance l'algorithme d'optimisation (VRPTW) via Google OR-Tools."""
    data_req = request.get_json() or {}
    date_cible = data_req.get('date', date.today().isoformat())
    
    try:
        # Coordonnées du dépôt principal
        depot = db.recuperer_depot_principal()
        if not depot:
            return jsonify({"erreur": "Dépôt non configuré."}), 404
            
        lat_depot, lon_depot = depot['latitude'], depot['longitude']
        
        # Récupération des données métiers pour le solveur
        data_ortools = db.preparer_donnees_ortools(date_cible, lat_depot, lon_depot)
        
        if len(data_ortools.get('tache_ids', [])) <= 1:
            return jsonify({"erreur": "Aucune tâche à optimiser."}), 400
        
        # Calcul de la solution optimale
        resultats_ia = resoudre_et_exporter(data_ortools)
        
        if not resultats_ia:
            return jsonify({"erreur": "Aucune solution trouvée par le solveur."}), 500
        
        # Enregistrement des résultats (affectation des tournées)
        db.sauvegarder_resultat_optimisation(date_cible, resultats_ia, data_ortools)
        
        return jsonify({
            "message": "Tournées optimisées avec succès.",
            "vehicules_utilises": len(resultats_ia['routes']),
            "points_non_affectes": resultats_ia.get('dropped_nodes', [])
        }), 200
        
    except Exception as e:
        return jsonify({"erreur": f"Erreur d'optimisation : {str(e)}"}), 500 

# --- Gestion des Ressources (Camions/Chauffeurs) ---

@app.route('/api/ressources/camions', methods=['GET'])
def get_camions():
    return jsonify(db.recuperer_tous_les_camions()), 200

@app.route('/api/ressources/camions', methods=['POST'])
def add_camion():
    data = request.get_json()
    if not data or 'immatriculation' not in data:
        return jsonify({"erreur": "Données incomplètes."}), 400
    
    try:
        cid = db.ajouter_camion(data['immatriculation'], data['charge_max_kg'], data['bacs_max'])
        return jsonify({"message": "Camion ajouté.", "id": cid}), 201
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500

@app.route('/api/ressources/chauffeurs', methods=['GET'])
def get_chauffeurs():
    return jsonify(db.recuperer_tous_les_chauffeurs()), 200

@app.route('/api/ressources/chauffeurs', methods=['POST'])
def add_chauffeur():
    data = request.get_json()
    if not all(k in data for k in ['nom', 'prenom', 'email', 'mot_de_passe']):
        return jsonify({"erreur": "Champs obligatoires manquants."}), 400
    
    user_id = db.ajouter_utilisateur(data['email'], data['mot_de_passe'], role='chauffeur')
    if not user_id:
        return jsonify({"erreur": "Utilisateur déjà existant."}), 409
    
    chid = db.ajouter_chauffeur(user_id, data['nom'], data['prenom'], data.get('telephone', ''))
    return jsonify({"message": "Chauffeur ajouté.", "id": chid}), 201

@app.route('/api/ressources/chauffeurs/<int:chauffeur_id>/disponibilites', methods=['GET'])
def get_dispo_chauffeur(chauffeur_id):
    return jsonify(db.recuperer_disponibilites_chauffeur(chauffeur_id)), 200

@app.route('/api/ressources/chauffeurs/<int:chauffeur_id>/disponibilites', methods=['POST'])
def update_dispo_chauffeur(chauffeur_id):
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"erreur": "Liste attendue."}), 400
    
    db.remplacer_disponibilites_chauffeur(chauffeur_id, data)
    return jsonify({"message": "Disponibilités mises à jour."}), 200

# --- Optimisation Temps-Réel (Dynamic Rerouting) ---

@app.route('/api/tournees/recalcul-dynamique', methods=['POST'])
def api_recalcul_dynamique():
    """Ré-optimise une tournée en cours pour insérer une nouvelle tâche."""
    data = request.get_json() or {}
    tache_id = data.get('tache_id')
    tournee_id = data.get('tournee_id')
    
    if not tache_id or not tournee_id:
        return jsonify({"erreur": "tache_id et tournee_id requis."}), 400
        
    try:
        data_ortools = db.preparer_donnees_recalcul_dynamique(tournee_id, tache_id)
        
        if not data_ortools or len(data_ortools['tache_ids']) <= 1:
            return jsonify({"erreur": "Impossible de préparer les données."}), 400
            
        resultats = resoudre_et_exporter(data_ortools)
        
        if not resultats or not resultats['routes']:
            return jsonify({"erreur": "L'IA n'a pas pu insérer l'imprévu."}), 500
            
        sequence = resultats['routes'][0] 
        db.sauvegarder_fusion_dynamique(tournee_id, sequence, data_ortools['tache_ids'])
        
        return jsonify({"message": "Tournée ré-optimisée avec succès."}), 200
        
    except Exception as e:
        return jsonify({"erreur": str(e)}), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)