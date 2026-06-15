from .db_core import DatabaseCore
from .repo_utilisateurs import UtilisateurRepository
from .repo_clients import ClientRepository
from .repo_ressources import RessourceRepository
from .repo_tournees import TourneeRepository

class DatabaseManager:
    def __init__(self, db_name='ma_base.db', reset_db=False):
        self.db_core = DatabaseCore(db_name, reset_db)
        self.repo_utilisateurs = UtilisateurRepository(self.db_core)
        self.repo_clients = ClientRepository(self.db_core)
        self.repo_ressources = RessourceRepository(self.db_core)
        self.repo_tournees = TourneeRepository(self.db_core)

    # 1. UTILISATEURS ET CLIENTS
    def verifier_login(self, email, mdp):
        return self.repo_utilisateurs.verifier_login(email, mdp)

    def ajouter_utilisateur(self, email, mdp, role='chauffeur'):
        return self.repo_utilisateurs.ajouter_utilisateur(email, mdp, role)

    def ajouter_client(self, client):
        return self.repo_clients.ajouter_client(client)

    def recuperer_tous_les_clients(self):
        return self.repo_clients.recuperer_tous_les_clients()

    def supprimer_client(self, client_id):
        return self.repo_clients.supprimer_client(client_id)

    def backfill_adresses_nominatim(self):
        return self.repo_clients.backfill_adresses_nominatim()

    def get_disponibilites_client(self, client_id):
        return self.repo_clients.get_disponibilites_client(client_id)

    # 2. GESTION DES RESSOURCES
    def ajouter_camion(self, immatriculation, charge_max_kg, bacs_max):
        return self.repo_ressources.ajouter_camion(immatriculation, charge_max_kg, bacs_max)

    def ajouter_chauffeur(self, utilisateur_id, nom, prenom, telephone):
        return self.repo_ressources.ajouter_chauffeur(utilisateur_id, nom, prenom, telephone)

    # 3. CONTRAINTES ET PLANIFICATION
    def ajouter_disponibilite_client(self, client_id, jour_semaine, heure_debut, heure_fin):
        return self.repo_tournees.ajouter_disponibilite_client(client_id, jour_semaine, heure_debut, heure_fin)

    def planifier_tache_collecte(self, client_id, date_planifiee, bacs_prevus):
        return self.repo_tournees.planifier_tache_collecte(client_id, date_planifiee, bacs_prevus)

    def recuperer_taches_du_jour(self, date_jour):
        return self.repo_tournees.recuperer_taches_du_jour(date_jour)

    def preparer_donnees_ortools(self, date_jour, depot_lat, depot_lon):
        return self.repo_tournees.preparer_donnees_ortools(date_jour, depot_lat, depot_lon)

    # 4. RETOUR TERRAIN
    def valider_collecte(self, tache_id, bacs_reels):
        return self.repo_tournees.valider_collecte(tache_id, bacs_reels)

    def recuperer_tournee_chauffeur(self, chauffeur_id, date_jour):
        return self.repo_tournees.recuperer_tournee_chauffeur(chauffeur_id, date_jour)

    def mettre_a_jour_statut_etape(self, tache_id, statut, bacs_reels=None, commentaire=None, type_imprevu=None):
        return self.repo_tournees.mettre_a_jour_statut_etape(tache_id, statut, bacs_reels, commentaire, type_imprevu)

    def trouver_candidat_reassignation(self, tache_id, date_jour):
        return self.repo_tournees.trouver_candidat_reassignation(tache_id, date_jour)

    def executer_reassignation(self, tache_id, tournee_id):
        return self.repo_tournees.executer_reassignation(tache_id, tournee_id)
    
    def recuperer_imprevus(self, date_jour):
        return self.repo_tournees.recuperer_imprevus(date_jour)
    
    # 5. ENDPOINTS POUR LE FRONT-END
    def get_dashboard_stats(self, date_jour):
        return self.repo_tournees.get_dashboard_stats(date_jour)

    def get_activite_recente(self, date_jour, limite=5):
        return self.repo_tournees.get_activite_recente(date_jour, limite)

    def get_tournees_detaillees(self, date_jour):
        return self.repo_tournees.get_tournees_detaillees(date_jour)
    
    def get_planning_preview(self, date_jour):
        return self.repo_tournees.get_planning_preview(date_jour)

    def generer_brouillons_jour(self, date_jour):
        return self.repo_tournees.generer_brouillons_jour(date_jour)
        
    def sauvegarder_resultat_optimisation(self, date_jour, resultats_ia, data_ortools):
        return self.repo_tournees.sauvegarder_resultat_optimisation(date_jour, resultats_ia, data_ortools)