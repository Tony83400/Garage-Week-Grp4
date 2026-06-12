import requests
import math

def calculer_vol_oiseau(lat1, lon1, lat2, lon2):
    """Calcule la distance en mètres à vol d'oiseau (Haversine)."""
    R = 6371000  # Rayon de la Terre en mètres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return int(R * c)

def calculer_route_osrm(lat1, lon1, lat2, lon2):
    """Appelle OSRM pour obtenir la distance réelle en mètres."""
    # Attention: OSRM attend l'ordre : lon,lat
    url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
    try:
        response = requests.get(url, timeout=5).json()
        return response['routes'][0]['distance']
    except Exception as e:
        return None

# --- TEST : St Mandrier vers La Farlède ---
# Coordonnées (Exemples approximatifs)
pt1 = (43.0805, 5.9238) # Saint-Mandrier-sur-Mer
pt2 = (43.1466, 6.0371) # La Farlède

dist_oiseau = calculer_vol_oiseau(pt1[0], pt1[1], pt2[0], pt2[1])
dist_route = calculer_route_osrm(pt1[0], pt1[1], pt2[0], pt2[1])

print(f"Comparaison de trajet :")
print(f"Vol d'oiseau : {dist_oiseau / 1000:.2f} km")
if dist_route:
    print(f"Par la route : {dist_route / 1000:.2f} km")
    diff = dist_route - dist_oiseau
    print(f"Différence   : {diff / 1000:.2f} km (soit +{int(diff/dist_oiseau*100)}%)")
else:
    print("API OSRM injoignable")