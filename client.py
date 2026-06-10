class Client:
    def __init__(self, nom, adresse, x, y, nbBacs, poids, id=None):
        self.id = id
        self.nom = nom
        self.adresse = adresse
        self.x = x
        self.y = y
        self.nbBacs = nbBacs
        self.poids = poids

    def __str__(self):
        id_str = f"[{self.id}]" if self.id is not None else "[Nouveau]"
        return f"{id_str} {self.nom} - {self.adresse} (Coords: {self.x},{self.y} | Bacs: {self.nbBacs} | Poids: {self.poids}kg)"

    def to_dict(self):
        return {
            "id": self.id,
            "nom": self.nom,
            "adresse": self.adresse,
            "x": self.x,
            "y": self.y,
            "nbBacs": self.nbBacs,
            "poids": self.poids
        }