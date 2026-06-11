from flask import Flask, request, jsonify
from serveur.database_manager import DatabaseManager
from serveur.client import Client

app = Flask(__name__)
db = DatabaseManager()

# On ajoute quelques utilisateurs de test au démarrage du serveur
db.ajouter_utilisateur('admin@archappli.fr', 'admin', 'admin')
db.ajouter_utilisateur('driver@archappli.fr', 'driver', 'chauffeur')

@app.route('/login', methods=['POST'])
def login():
    """Route pour vérifier les identifiants d'un utilisateur."""
    data = request.get_json()
    if not data or 'email' not in data or 'mot_de_passe' not in data:
        return jsonify({"erreur": "Veuillez fournir un email et un mot_de_passe."}), 400
    
    if db.verifier_login(data['email'], data['mot_de_passe']):
        return jsonify({"message": "Connexion réussie !"}), 200
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

if __name__ == '__main__':
    app.run(debug=True)