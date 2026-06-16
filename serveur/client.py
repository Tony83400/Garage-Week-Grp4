"""
Modèle représentant un client ou un site de collecte.
"""

class Client:
    """Représentation métier d'un site de collecte de biodéchets."""

    def __init__(self, nom_entreprise, latitude, longitude, id=None, adresse=None, date_debut_contrat=None, date_fin_contrat=None):
        self.id = id
        self.nom_entreprise = nom_entreprise
        self.latitude = latitude
        self.longitude = longitude
        self.adresse = adresse
        self.date_debut_contrat = date_debut_contrat
        self.date_fin_contrat = date_fin_contrat

    def __str__(self):
        id_label = f"[{self.id}]" if self.id is not None else "[Nouveau]"
        return f"{id_label} {self.nom_entreprise} ({self.latitude}, {self.longitude})"

    def to_dict(self):
        """Convertit l'objet en dictionnaire pour l'envoi via l'API (JSON)."""
        return {
            "id": self.id,
            "nom_entreprise": self.nom_entreprise,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "adresse": self.adresse,
            "date_debut_contrat": self.date_debut_contrat,
            "date_fin_contrat": self.date_fin_contrat,
        }
