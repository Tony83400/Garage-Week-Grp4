from flask import Flask, request, jsonify
from database.database_manager import DatabaseManager
from client import Client
from datetime import date
from flask_cors import CORS
import threading

from solveur_ortools import resoudre_et_exporter
app = Flask(__name__)
CORS(app)
# On demande explicitement de réinitialiser/créer la base de données au démarrage
db = DatabaseManager(reset_db=True)


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'email' not in data or 'mot_de_passe' not in data:
        return jsonify({"erreur": "Veuillez fournir un email et un mot_de_passe."}), 400
    
    utilisateur = db.verifier_login(data['email'], data['mot_de_passe'])
    
    if utilisateur:
        return jsonify({
            "message": "Connexion réussie !",
            "user_id": utilisateur["id"],
            "role": utilisateur["role"],
            "nom": utilisateur["nom"]
        }), 200
    else:
        return jsonify({"erreur": "Email ou mot de passe incorrect."}), 401

@app.route('/clients', methods=['GET'])
def get_clients():
    """Route pour récupérer la liste de tous les clients."""
    liste_clients = db.recuperer_tous_les_clients()
    # On transforme chaque objet Client en dictionnaire pour qu'il soit transformable en JSON
    return jsonify([client.to_dict() for client in liste_clients]), 200

@app.route('/clients', methods=['POST'])
def add_client():
    data = request.get_json()
    
    # Le front envoie 'nom', le back d'origine voulait 'nom_entreprise'
    nom = data.get('nom') or data.get('nom_entreprise')
    if not nom:
        return jsonify({"erreur": "Le champ 'nom' est requis."}), 400
    
    lat = data.get('latitude', 43.1200)
    lon = data.get('longitude', 5.9300)
    adresse = data.get('adresse', None)
    date_debut = data.get('date_debut_contrat', None)
    date_fin = data.get('date_fin_contrat', None)

    nouveau_client = Client(nom_entreprise=nom, latitude=lat, longitude=lon, adresse=adresse, date_debut_contrat=date_debut, date_fin_contrat=date_fin)

    if db.ajouter_client(nouveau_client):
        return jsonify({"message": f"Site '{nouveau_client.nom_entreprise}' enregistré avec succès.", "id": nouveau_client.id}), 201
    else:
        return jsonify({"erreur": f"Le site '{nouveau_client.nom_entreprise}' n'a pas pu être ajouté."}), 409

@app.route('/disponibilites', methods=['POST'])
def add_disponibilite():
    """Ajoute une disponibilité (créneau + jour) pour un client — utilisé par OR-Tools."""
    data = request.get_json()
    client_id   = data.get('client_id')
    jour        = data.get('jour_semaine')
    heure_debut = data.get('heure_debut')
    heure_fin   = data.get('heure_fin')

    if not all([client_id, jour, heure_debut, heure_fin]):
        return jsonify({"erreur": "Champs manquants : client_id, jour_semaine, heure_debut, heure_fin requis."}), 400

    db.ajouter_disponibilite_client(client_id, jour, heure_debut, heure_fin)
    return jsonify({"message": "Disponibilité ajoutée."}), 201

@app.route('/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Supprime un client et ses données associées (cascade)."""
    ok = db.supprimer_client(client_id)
    if ok:
        return jsonify({"message": f"Client {client_id} supprimé."}), 200
    return jsonify({"erreur": "Client introuvable."}), 404

@app.route('/clients/<int:client_id>/disponibilites', methods=['GET'])
def get_disponibilites_client(client_id):
    """Retourne les créneaux de collecte enregistrés pour un client."""
    dispos = db.get_disponibilites_client(client_id)
    return jsonify(dispos), 200

@app.route('/clients/backfill-adresses', methods=['POST'])
def backfill_adresses():
    """Lance le reverse geocoding Nominatim pour les clients sans adresse (en arrière-plan)."""
    threading.Thread(target=db.backfill_adresses_nominatim, daemon=True).start()
    return jsonify({"message": "Backfill lancé en arrière-plan"}), 202

@app.route('/api/dashboard/stats', methods=['GET'])
def api_dashboard_stats():
    """Endpoint pour récupérer les KPIs du tableau de bord."""
    # Par défaut, on prend la date d'aujourd'hui (format YYYY-MM-DD)
    date_jour = request.args.get('date', date.today().isoformat())
    stats = db.get_dashboard_stats(date_jour)
    return jsonify(stats), 200

@app.route('/api/dashboard/activite', methods=['GET'])
def api_dashboard_activite():
    """Endpoint pour récupérer l'historique récent."""
    date_jour = request.args.get('date', date.today().isoformat())
    activites = db.get_activite_recente(date_jour)
    return jsonify(activites), 200

@app.route('/api/chauffeur/<int:chauffeur_id>/tournee', methods=['GET'])
def api_get_tournee_chauffeur(chauffeur_id):
    """Retourne la liste des arrêts du jour pour le chauffeur connecté."""
    date_jour = request.args.get('date', date.today().isoformat())
    tournee = db.recuperer_tournee_chauffeur(chauffeur_id, date_jour)
    
    if not tournee:
        return jsonify({"message": "Aucune tournée planifiée pour ce chauffeur aujourd'hui."}), 200
    return jsonify(tournee), 200

@app.route('/api/chauffeur/tache/<int:tache_id>/statut', methods=['POST'])
def api_update_statut_tache(tache_id):
    """
    Permet au chauffeur de remonter l'information du terrain.
    """
    data = request.get_json() or {}
    
    # Récupération des données envoyées par le Front
    statut = data.get('statut') # Doit être 'terminee' ou 'erreur'
    bacs_reels = data.get('bacs_reels')
    commentaire = data.get('commentaire')
    
    # 1. Vérification basique
    if statut not in ['terminee', 'erreur']:
        return jsonify({"erreur": "Le statut doit être 'terminee' ou 'erreur'."}), 400
        
    # 2. Règle métier : si terminé, il faut le nombre de bacs
    if statut == 'terminee' and bacs_reels is None:
        return jsonify({"erreur": "Veuillez indiquer le nombre de bacs récupérés."}), 400
        
    # 3. Règle métier : si erreur, on force les bacs à 0
    if statut == 'erreur':
        bacs_reels = 0
        if not commentaire:
            commentaire = "Erreur non spécifiée par le chauffeur"

    # 4. Mise à jour en base de données
    succes = db.mettre_a_jour_statut_etape(tache_id, statut, bacs_reels, commentaire)
    
    if succes:
        return jsonify({
            "message": "Étape mise à jour avec succès.",
            "statut_enregistre": statut,
            "bacs_reels": bacs_reels
        }), 200
    else:
        return jsonify({"erreur": "Tâche introuvable."}), 404

@app.route('/api/admin/planning', methods=['GET'])
def api_admin_planning():
    date_jour = request.args.get('date', date.today().isoformat())
    tournees = db.get_tournees_detaillees(date_jour)
    return jsonify(tournees), 200

@app.route('/api/imprevus', methods=['GET'])
def get_imprevus():
    date_jour = request.args.get('date', date.today().isoformat())
    imprevus = db.recuperer_imprevus(date_jour)
    return jsonify(imprevus), 200

@app.route('/api/imprevus/<int:tache_id>/replanifier', methods=['POST'])
def replanifier_imprevu(tache_id):
    # Remet la tâche en attente, annule les bacs réels et réinitialise le commentaire
    succes = db.mettre_a_jour_statut_etape(tache_id, 'en_attente', 0, "Replanifié par l'administration")
    if succes:
        return jsonify({"message": "Tâche replanifiée avec succès."}), 200
    return jsonify({"erreur": "Tâche introuvable."}), 404

@app.route('/api/planning/preview', methods=['GET'])
def api_planning_preview():
    """Retourne les compteurs contextuels du jour (clients dispo, chauffeurs planifiés)."""
    date_jour = request.args.get('date', date.today().isoformat())
    preview = db.get_planning_preview(date_jour)
    return jsonify(preview), 200

@app.route('/api/planning/generer', methods=['POST'])
def api_generer_brouillons():
    """
    Étape 1 : Création des brouillons (tâches en attente)
    """
    data_req = request.get_json() or {}
    date_cible = data_req.get('date', date.today().isoformat())
    
    try:
        # On appelle la nouvelle fonction de génération
        resultat = db.generer_brouillons_jour(date_cible) 
        
        if resultat["status"] == "erreur":
            return jsonify({"erreur": resultat["message"]}), 400
            
        return jsonify({
            "message": f"Succès : {resultat['taches_creees']} tâches de collecte générées en brouillon."
        }), 201
    except Exception as e:
        return jsonify({"erreur": f"Erreur serveur : {str(e)}"}), 500


@app.route('/api/planning/optimiser', methods=['POST'])
def api_optimiser_tournees():
    """
    Étape 2 : Optimisation OR-Tools et affectation des chauffeurs
    """
    data_req = request.get_json() or {}
    date_cible = data_req.get('date', date.today().isoformat())
    
    # Coordonnées du Dépôt Central (La Farlède, Var)
    DEPOT_LAT, DEPOT_LON = 43.1670, 6.0430
    
    try:
        # 1. Préparation des données pour le solveur
        data_ortools = db.preparer_donnees_ortools(date_cible, DEPOT_LAT, DEPOT_LON)
        
        # S'il n'y a que le dépôt (index 0) et pas de clients
        if len(data_ortools.get('tache_ids', [])) <= 1:
            return jsonify({"erreur": "Aucune tâche de collecte en attente pour cette date."}), 400
        
        # 2. Exécution du moteur Google OR-Tools
        resultats_ia = resoudre_et_exporter(data_ortools)
        
        if not resultats_ia:
            return jsonify({"erreur": "Le solveur n'a pas pu trouver de solution."}), 500
        
        # 3. Sauvegarde en BDD
        db.sauvegarder_resultat_optimisation(date_cible, resultats_ia, data_ortools)
        
        return jsonify({
            "message": "L'optimisation des tournées a été calculée et enregistrée avec succès !",
            "vehicules_utilises": len(resultats_ia['routes'])
        }), 200
        
    except Exception as e:
        return jsonify({"erreur": f"Erreur lors de l'optimisation : {str(e)}"}), 500 



if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)