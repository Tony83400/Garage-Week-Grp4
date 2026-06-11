# Besoins back pour la page Planning

Ce fichier liste ce que le back doit implémenter pour que la page Planning soit 100% fonctionnelle.
Tout ce qui est marqué ✅ fonctionne déjà. Le reste est à faire côté Flask.

---

## ✅ Ce qui fonctionne déjà (aucun changement nécessaire)

| Route | Usage dans Planning |
|---|---|
| `GET /clients` | Charge la liste des sites (panel collapsible) |
| `GET /api/dashboard/stats?date=` | Banner d'alerte si `alertes > 0` |
| `GET /api/chauffeur/{id}/tournee?date=` | Cartes véhicules avec statuts réels par arrêt |

---

## ❌ Ce qui manque — à implémenter

### 1. Vue admin planning (PRIORITÉ HAUTE)

**Route :** `GET /api/admin/planning?date=YYYY-MM-DD`

**Pourquoi :** Actuellement le front appelle `GET /api/chauffeur/{id}/tournee` pour les IDs 1 à 5 en dur.
C'est un contournement fragile. Il faut un endpoint unique qui retourne toutes les tournées du jour.

La méthode `get_tournees_detaillees(date)` existe déjà dans `repo_tournees.py` (ligne 249).
Il suffit de l'exposer dans `main.py` :

```python
@app.route('/api/admin/planning', methods=['GET'])
def api_planning():
    date_jour = request.args.get('date', date.today().isoformat())
    return jsonify(db.get_tournees_detaillees(date_jour)), 200
```

**Réponse attendue par le front :**
```json
[
  {
    "tournee_id": 1,
    "vehicule": "AA-123-BB",
    "capacite_max": 750,
    "charge_actuelle": 640,
    "chauffeur": "Jean Martin",
    "arrets": [
      { "id": 12, "statut": "terminee", "client": "McDonald's Toulon", "lat": 43.12, "lon": 5.93 }
    ]
  }
]
```

> ⚠️ Bug dans `get_tournees_detaillees` actuel : la requête interne ne filtre pas par `chauffeur_id`,
> elle retourne toutes les tâches du jour pour chaque chauffeur. À corriger dans `repo_tournees.py`.

---

### 2. Nom du chauffeur dans GET /api/chauffeur/{id}/tournee (PRIORITÉ HAUTE)

**Problème :** La route actuelle retourne les arrêts mais pas le nom du chauffeur ni son véhicule.
Du coup les cards affichent "Chauffeur #1", "Chauffeur #2" au lieu des vrais noms.

**Correction dans `recuperer_tournee_chauffeur` :** Ajouter une requête préalable pour récupérer
`nom`, `prenom` du chauffeur et `immatriculation` du camion et les inclure dans la réponse :

```json
{
  "chauffeur": "Jean Martin",
  "vehicule": "AA-123-BB",
  "capacite_max": 750,
  "arrets": [...]
}
```

---

### 3. Heure de départ réelle (PRIORITÉ MOYENNE)

**Problème :** La card véhicule affiche "06h30" en dur (hardcodé).
La table `tournees_jour` a `heure_debut_service` — il faut la retourner dans `/api/admin/planning`
ou dans `/api/chauffeur/{id}/tournee`.

---

### 4. Gestion des imprévus (PRIORITÉ MOYENNE)

Le bouton "Gérer les imprévus" est visible mais affiche un toast "bientôt disponible".

**Routes à créer :**

```
GET  /api/imprevus?date=YYYY-MM-DD
     → liste les tâches avec statut='erreur' pour la date
     → [{ tache_id, client_nom, commentaire, latitude, longitude }]

POST /api/imprevus/{tache_id}/replanifier
     → remet le statut à 'en_attente' pour replanification
     → { message: "Tâche replanifiée" }
```

---

### 5. Génération de tournées (PRIORITÉ BASSE)

Le bouton "Générer les tournées (IA)" affiche un spinner puis un toast d'info.
OR-Tools est implémenté dans `solveur_ortools.py` mais pas exposé.

**Route à créer :**

```
POST /api/tournees/generer
     Body: { "date": "YYYY-MM-DD" }
     → Lance solveur_ortools, affecte les tournées, retourne le résultat
     → { "tournees_creees": 3, "arrets_total": 18 }
```

---

### 6. Carte interactive (PRIORITÉ BASSE)

La carte est un placeholder visuel. Pour l'activer :

1. Installer `react-native-maps` côté front : `npx expo install react-native-maps`
2. Le back n'a rien à faire — `GET /clients` retourne déjà `latitude` et `longitude`
3. Si `/api/admin/planning` est implémenté, les marqueurs peuvent être colorés par véhicule

---

## Résumé par priorité

| # | Quoi | Route | Effort back |
|---|---|---|---|
| 1 | Vue planning admin | `GET /api/admin/planning` | 5 min (méthode existe) |
| 2 | Noms chauffeur/véhicule dans tournée | modifier `recuperer_tournee_chauffeur` | 30 min |
| 3 | Heure de départ réelle | champ dans les réponses tournée | 15 min |
| 4 | Page imprévus | `GET/POST /api/imprevus` | 1h |
| 5 | Génération IA | `POST /api/tournees/generer` | 2-3h |
| 6 | Carte interactive | install côté front uniquement | 30 min front |
