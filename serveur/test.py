import datetime
from database.database_manager import DatabaseManager
from database.repo_tournees import TourneeRepository
from solveur_ortools import resoudre_et_exporter
import time

print("🚗 === DÉMARRAGE DU CRASH TEST DE TOURNÉE === 🚗")
date_jour = datetime.date.today().isoformat()

# Initialisation
db = DatabaseManager(reset_db=False)
repo = TourneeRepository(db.db_core)
depot = repo.recuperer_depot_principal()

print("\n--- ÉTAPE 1 : Génération du matin ---")
repo.generer_brouillons_jour(date_jour)
data_matin = repo.preparer_donnees_ortools(date_jour, depot['latitude'], depot['longitude'])
res_matin = resoudre_et_exporter(data_matin)
repo.sauvegarder_resultat_optimisation(date_jour, res_matin, data_matin)

# On vérifie les tournées créées
tournees = repo.get_tournees_detaillees(date_jour)
if not tournees:
    print("❌ Aucune tournée générée, veuillez ajouter des clients ou des dispos.")
    exit()

tournee_test = tournees[0]
print(f"✅ Tournée {tournee_test['tournee_id']} générée pour le camion {tournee_test['immatriculation']}.")

# On prend le premier client de cette tournée comme "victime"
client_victime = [a for a in tournee_test['arrets'] if a.get('tache_id')][0]
tache_id = client_victime['tache_id']

print(f"\n--- ÉTAPE 2 : Simulation du départ et de l'imprévu ---")
print("🚛 Le camion démarre sa tournée...")
repo.mettre_a_jour_statut_tournee(tournee_test['tournee_id'], 'demarree')

print(f"⚠️ Oh non ! Arrivé chez {client_victime['client_nom']}, problème d'accès !")
repo.mettre_a_jour_statut_etape(tache_id, 'erreur', bacs_reels=0, commentaire="Portail fermé", type_imprevu="acces_impossible")

print("\n--- ÉTAPE 3 : Action du dispatcher (Report) ---")
print("👨‍💻 Le dispatcher clique sur 'Reporter' dans l'UI...")
repo.remettre_imprevu_en_attente(tache_id)

with db.db_core.get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT tournee_id, statut FROM taches_collecte WHERE id = ?", (tache_id,))
    etat = cursor.fetchone()
    print(f"🔍 État en BDD : Tournée ID = {etat[0]} (doit être None), Statut = {etat[1]}")

print("\n--- ÉTAPE 4 : Recalcul de l'après-midi (Régénérer) ---")
time.sleep(1) # Petit délai pour le style
repo.generer_brouillons_jour(date_jour)
data_aprem = repo.preparer_donnees_ortools(date_jour, depot['latitude'], depot['longitude'])
res_aprem = resoudre_et_exporter(data_aprem)

if not res_aprem:
    print("❌ Le solveur n'a pas pu replacer l'imprévu (trop tard dans la journée ou manque de camions).")
else:
    repo.sauvegarder_resultat_optimisation(date_jour, res_aprem, data_aprem)
    
    # On cherche où est passé notre client
    with db.db_core.get_connection() as conn:
        cursor.execute("""
            SELECT t.tournee_id, c.nom_entreprise, tj.statut
            FROM taches_collecte t
            JOIN tournees_jour tj ON t.tournee_id = tj.id
            JOIN clients c ON t.client_id = c.id
            WHERE t.id = ?
        """, (tache_id,))
        nouveau_spot = cursor.fetchone()
        
        if nouveau_spot:
            print(f"🎯 VICTOIRE ! Le client '{nouveau_spot[1]}' a été réassigné avec succès :")
            print(f"   -> Il est maintenant dans la Tournée N°{nouveau_spot[0]}")
            print(f"   -> Le statut de cette nouvelle tournée est : '{nouveau_spot[2]}'")
            if nouveau_spot[0] == tournee_test['tournee_id']:
                print("   ⚠️ Attention : Il a été remis dans la même tournée. Le filtre 'demarree' a peut-être échoué !")
        else:
            print("👻 ALERTE : Le client a disparu ! Le solveur l'a rejeté dans les dropped_nodes.")