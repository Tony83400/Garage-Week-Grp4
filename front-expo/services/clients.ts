import { api } from './api';

// Correspond à GET /clients et POST /clients
export interface Client {
  id?: number;
  nom_entreprise: string;
  latitude: number;
  longitude: number;
}

export function getClients() {
  return api.get<Client[]>('/clients');
}

export function addClient(client: Omit<Client, 'id'>) {
  return api.post<{ message: string }>('/clients', client);
}
