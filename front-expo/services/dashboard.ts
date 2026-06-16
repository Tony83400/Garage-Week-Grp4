import { api } from './api';

export interface FlotteVehicule {
  chauffeur: string;
  nb_tournees: number;
  km: number;
  arrets_total: number;
  arrets_done: number;
  erreurs: number;
  termine: boolean;
}

// Correspond à GET /api/dashboard/stats?date=YYYY-MM-DD
export interface DashboardStats {
  poids_prevu_kg: number;
  poids_collecte_kg: number;
  collectes_total: number;
  collectes_validees: number;
  alertes: number;
  km_total: number;
  flotte: FlotteVehicule[];
}

// Correspond à GET /api/dashboard/activite?date=YYYY-MM-DD
export interface Activite {
  statut: 'terminee' | 'erreur';
  client: string;
  coordonnees: { lat: number; lon: number };
  heure?: string;      // TODO back: ex "09:58"
  action?: string;     // TODO back: ex "Collecte validée", "Imprévu signalé", "Départ du dépôt"
  detail?: string;     // TODO back: texte secondaire (chauffeur · site)
  categorie?: 'tournee' | 'imprevue' | 'validation'; // TODO back
}

export function getDashboardStats(date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<DashboardStats>(`/api/dashboard/stats${query}`);
}

export function getActiviteRecente(date?: string) {
  const query = date ? `?date=${date}` : '';
  return api.get<Activite[]>(`/api/dashboard/activite${query}`);
}
