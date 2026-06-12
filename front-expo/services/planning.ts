import { api } from './api';

export interface TourneeAdmin {
  chauffeur_id: number;
  chauffeur: string;
  vehicule: string;
  immatriculation: string;
  capacite_max_kg: number;
  heure_depart: string;
  arrets: {
    tache_id: number;
    statut: 'en_attente' | 'planifiee' | 'en_cours' | 'terminee' | 'erreur';
    client_nom: string;
    poids_prevu_kg: number;
    ordre: number;
    latitude?: number;
    longitude?: number;
    heure_estimee?: string;
  }[];
}

// 1. Récupérer le planning existant
export async function getPlanningAdmin(date: string): Promise<TourneeAdmin[]> {
  try {
    const data = await api.get<TourneeAdmin[]>(`/api/admin/planning?date=${date}`);
    
    // LOG 1 : Ce que le Backend envoie réellement
    console.log("=== LOG 1 : RÉPONSE BRUTE DU BACKEND ===");
    console.log(JSON.stringify(data, null, 2)); 
    
    return data;
  } catch (e) {
    console.error("Erreur getPlanningAdmin:", e);
    return [];
  }
}

// 2. Déclencher la création des brouillons de la journée
export async function genererBrouillons(date: string): Promise<any> {
  return await api.post('/api/planning/generer', { date });
}

// 3. Déclencher le calcul OR-Tools
export async function optimiserTournees(date: string): Promise<any> {
  return await api.post('/api/planning/optimiser', { date });
}