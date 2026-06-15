import { api } from './api';

export interface Imprevu {
  tache_id: number;
  client_nom: string;
  adresse: string;
  chauffeur: string;
  raison: string;
  heure: string;
  type_imprevu: string;
}

export interface ReassignResult {
  message: string;
  chauffeur?: string;
  heure_arrivee?: string;
}

export function getImprevus(date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<Imprevu[]>(`/api/imprevus${query}`);
}

export function replanifierImprevu(tache_id: number) {
  return api.post<{ message: string }>(`/api/imprevus/${tache_id}/replanifier`, {});
}

export function reassignerImprevu(tache_id: number) {
  return api.post<ReassignResult>(`/api/imprevus/${tache_id}/reassigner`, {});
}