class Client:
    def __init__(self, nom_entreprise, latitude, longitude, id=None):
        self.id = id
        self.nom_entreprise = nom_entreprise
        self.latitude = latitude
        self.longitude = longitude

    def __str__(self):
        id_str = f"[{self.id}]" if self.id is not None else "[Nouveau]"
        return f"{id_str} {self.nom_entreprise} (Coords: {self.latitude},{self.longitude})"

    def to_dict(self):
        return {
            "id": self.id,
            "nom_entreprise": self.nom_entreprise,
            "latitude": self.latitude,
            "longitude": self.longitude
        }