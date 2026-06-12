import { api } from './api';

// Futur GET /api/admin/planning?date= — NON IMPLÉMENTÉ côté back
// Voir BACK_PLANNING.md pour la spec complète
export interface TourneeAdmin {
  tournee_id: number;
  vehicule: string;
  capacite_max: number;
  charge_actuelle: number;
  chauffeur: string;
  arrets: {
    id: number;
    statut: 'en_attente' | 'en_cours' | 'terminee' | 'erreur';
    client: string;
    lat: number;
    lon: number;
  }[];
}

export async function getPlanningAdmin(date: string): Promise<TourneeAdmin[]> {
  try {
    return await api.get<TourneeAdmin[]>(`/api/admin/planning?date=${date}`);
  } catch {
    return [];
  }
}
