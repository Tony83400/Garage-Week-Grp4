import { api } from './api';

// Correspond à GET /api/dashboard/stats?date=YYYY-MM-DD
// Adapte les champs si db.get_dashboard_stats() retourne autre chose
export interface DashboardStats {
  biodechets_prevus_kg: number;
  collectes_validees: number;
  collectes_total: number;
  alertes_actives: number;
  prochain_camion_minutes: number | null;
}

// Correspond à GET /api/dashboard/activite?date=YYYY-MM-DD
export interface Activite {
  tache_id: number;
  statut: 'terminee' | 'erreur';
  nom_chauffeur: string;
  nom_entreprise: string;
  ville: string;
  heure: string;
}

export function getDashboardStats(date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<DashboardStats>(`/api/dashboard/stats${query}`);
}

export function getActiviteRecente(date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<Activite[]>(`/api/dashboard/activite${query}`);
}
