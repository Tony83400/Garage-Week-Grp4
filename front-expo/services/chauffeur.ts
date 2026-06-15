import { api } from './api';

export interface Arret {
  tache_id: number;
  statut: 'en_attente' | 'en_cours' | 'terminee' | 'erreur';
  bacs_prevus: number;
  poids_prevu_kg: number;
  ordre: number;
  client_nom: string;
  latitude: number;
  longitude: number;
  type_imprevu?: string | null;
}

export interface TourneeDetails {
  tournee_id: number;
  statut: 'affectee' | 'demarree' | 'terminee';
  chauffeur: string;
  vehicule: string;
  immatriculation: string;
  capacite_max_kg: number;
  heure_depart: string;
  arrets: Arret[];
}

export function getTournee(chauffeur_id: number, date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<TourneeDetails | null>(`/api/chauffeur/${chauffeur_id}/tournee${query}`);
}

export interface UpdateStatutPayload {
  statut: 'terminee' | 'erreur';
  bacs_reels?: number;
  commentaire?: string;
  type_imprevu?: string;
}

export function updateStatutTache(tache_id: number, payload: UpdateStatutPayload) {
  return api.post<{ message: string; statut_enregistre: string; bacs_reels: number }>(
    `/api/chauffeur/tache/${tache_id}/statut`,
    payload
  );
}

export function updateStatutTournee(tournee_id: number, statut: 'demarree' | 'terminee') {
  return api.post<{ message: string }>(
    `/api/chauffeur/tournee/${tournee_id}/statut`,
    { statut }
  );
}

