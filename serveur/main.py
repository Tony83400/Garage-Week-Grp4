from flask import Flask, request, jsonify
from database.database_manager import DatabaseManager
from client import Client
from datetime import date
from flask_cors import CORS
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
            "role": utilisateur["role"]
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
    """Route pour ajouter un nouveau client."""
    data = request.get_json()
    required_fields = ['nom_entreprise', 'latitude', 'longitude']
    
    if not data or not all(field in data for field in required_fields):
        return jsonify({"erreur": "Données manquantes. Champs requis : nom_entreprise, latitude, longitude"}), 400
    
    nouveau_client = Client(nom_entreprise=data['nom_entreprise'], latitude=data['latitude'], longitude=data['longitude'])
    
    if db.ajouter_client(nouveau_client):
        return jsonify({"message": f"Client '{nouveau_client.nom_entreprise}' ajouté avec succès."}), 201
    else:
        return jsonify({"erreur": f"Le client '{nouveau_client.nom_entreprise}' n'a pas pu être ajouté."}), 409

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
    
    
if __name__ == '__main__':
    app.run(debug=True)