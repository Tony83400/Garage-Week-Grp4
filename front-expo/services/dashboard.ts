import { api } from './api';

// Correspond à GET /api/dashboard/stats?date=YYYY-MM-DD
// Champs exacts retournés par repo_tournees.get_dashboard_stats()
export interface DashboardStats {
  poids_prevu_kg: number;
  poids_collecte_kg: number;
  collectes_total: number;
  collectes_validees: number;
  alertes: number;
  km_total: number;
  flotte: { chauffeur: string; dernier_point: string; termine: boolean }[];
}

// Correspond à GET /api/dashboard/activite?date=YYYY-MM-DD
// Champs exacts retournés par repo_tournees.get_activite_recente()
export interface Activite {
  statut: 'terminee' | 'erreur';
  client: string;
  coordonnees: { lat: number; lon: number };
}

export function getDashboardStats(date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<DashboardStats>(`/api/dashboard/stats${query}`);
}

export function getActiviteRecente(date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<Activite[]>(`/api/dashboard/activite${query}`);
}
