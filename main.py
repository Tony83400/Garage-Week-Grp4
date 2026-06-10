from flask import Flask, request, jsonify
from database_manager import DatabaseManager
from client import Client

app = Flask(__name__)
db = DatabaseManager()

# On ajoute quelques utilisateurs de test au démarrage du serveur
db.ajouter_utilisateur('anthony', 'super_mdp_123')
db.ajouter_utilisateur('admin', 'admin')

@app.route('/login', methods=['POST'])
def login():
    """Route pour vérifier les identifiants d'un utilisateur."""
    data = request.get_json()
    if not data or 'identifiant' not in data or 'mdp' not in data:
        return jsonify({"erreur": "Veuillez fournir un identifiant et un mdp."}), 400
    
    if db.verifier_login(data['identifiant'], data['mdp']):
        return jsonify({"message": "Connexion réussie !"}), 200
    else:
        return jsonify({"erreur": "Identifiant ou mot de passe incorrect."}), 401

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
    required_fields = ['nom', 'adresse', 'x', 'y', 'nbBacs', 'poids']
    
    if not data or not all(field in data for field in required_fields):
        return jsonify({"erreur": "Données manquantes. Champs requis : nom, adresse, x, y, nbBacs, poids"}), 400
    
    nouveau_client = Client(nom=data['nom'], adresse=data['adresse'], x=data['x'], y=data['y'], nbBacs=data['nbBacs'], poids=data['poids'])
    
    if db.ajouter_client(nouveau_client):
        return jsonify({"message": f"Client '{nouveau_client.nom}' ajouté avec succès."}), 201
    else:
        return jsonify({"erreur": f"Le client '{nouveau_client.nom}' existe déjà."}), 409

if __name__ == '__main__':
    app.run(debug=True)