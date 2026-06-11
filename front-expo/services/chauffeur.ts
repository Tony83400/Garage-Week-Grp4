import { api } from './api';

// Correspond à GET /api/chauffeur/<chauffeur_id>/tournee?date=YYYY-MM-DD
// Champs exacts retournés par repo_tournees.recuperer_tournee_chauffeur()
export interface Arret {
  tache_id: number;
  statut: 'en_attente' | 'en_cours' | 'terminee' | 'erreur';
  bacs_prevus: number;
  poids_prevu_kg: number;
  ordre: number;
  client_nom: string;
  latitude: number;
  longitude: number;
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
