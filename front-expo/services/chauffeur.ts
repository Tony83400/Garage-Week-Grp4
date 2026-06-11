import { api } from './api';

// Correspond à GET /api/chauffeur/<chauffeur_id>/tournee?date=YYYY-MM-DD
export interface Arret {
  tache_id: number;
  nom_entreprise: string;
  latitude: number;
  longitude: number;
  statut: 'en_attente' | 'terminee' | 'erreur';
  bacs_prevus: number;
  bacs_reels: number | null;
  commentaire: string | null;
}

export function getTournee(chauffeur_id: number, date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<Arret[]>(`/api/chauffeur/${chauffeur_id}/tournee${query}`);
}

// Correspond à POST /api/chauffeur/tache/<tache_id>/statut
export interface UpdateStatutPayload {
  statut: 'terminee' | 'erreur';
  bacs_reels?: number;
  commentaire?: string;
}

export function updateStatutTache(tache_id: number, payload: UpdateStatutPayload) {
  return api.post<{ message: string; statut_enregistre: string; bacs_reels: number }>(
    `/api/chauffeur/tache/${tache_id}/statut`,
    payload,
  );
}
