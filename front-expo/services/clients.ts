import { api } from './api';

// Correspond à GET /clients et POST /clients
export interface Client {
  id?: number;
  nom_entreprise: string;
  latitude: number;
  longitude: number;
  adresse?: string;
  date_debut_contrat?: string;
  date_fin_contrat?: string;
}

export interface Disponibilite {
  id?: number;
  client_id: number;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
}

export function getClients() {
  return api.get<Client[]>('/clients');
}

export function addClient(client: Omit<Client, 'id'>) {
  return api.post<{ message: string; id?: number }>('/clients', client);
}

export function addDisponibilite(dispo: {
  client_id: number;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
}) {
  return api.post<{ message: string }>('/disponibilites', dispo);
}

export function deleteClient(id: number) {
  return api.del<{ message: string }>(`/clients/${id}`);
}

export function backfillAdresses() {
  return api.post<{ message: string }>('/clients/backfill-adresses', {});
}

export function getClientDisponibilites(id: number) {
  return api.get<Disponibilite[]>(`/clients/${id}/disponibilites`);
}
