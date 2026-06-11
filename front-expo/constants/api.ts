// front-expo/services/authService.ts

// ⚠️ IMPORTANT : Remplace par l'IP de ton ordinateur sur ton réseau local
// Si tu utilises l'émulateur Android, utilise 'http://10.0.2.2:5000'
// Si tu utilises iOS ou le web localement, 'http://localhost:5000' ou 'http://127.0.0.1:5000' fonctionne.
// Si tu utilises Expo Go sur ton téléphone physique, il FAUT l'adresse IP locale (ex: 'http://192.168.1.15:5000')
const API_BASE_URL = 'http://127.0.0.1:5000'; 

export interface LoginResponse {
  success: boolean;
  message?: string;
  user_id?: number;
  role?: string;
  erreur?: string;
}

export const loginUser = async (email: string, mot_de_passe: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Attention : Le backend attend exactement "email" et "mot_de_passe"
      body: JSON.stringify({ 
        email: email, 
        mot_de_passe: mot_de_passe 
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Code 200: Connexion réussie
      return {
        success: true,
        message: data.message,
        user_id: data.user_id,
        role: data.role,
      };
    } else {
      // Code 400 ou 401: Erreur renvoyée par le serveur (ex: mauvais mdp)
      return {
        success: false,
        erreur: data.erreur || 'Erreur lors de la connexion',
      };
    }
  } catch (error) {
    // Erreur réseau (serveur éteint, mauvaise IP, etc.)
    console.error("Erreur réseau API Login:", error);
    return {
      success: false,
      erreur: "Impossible de joindre le serveur. Vérifiez votre connexion.",
    };
  }
};