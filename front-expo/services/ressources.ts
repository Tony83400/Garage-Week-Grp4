import { api } from './api';

export interface Camion {
  id: number;
  immatriculation: string;
  charge_max_kg: number;
  bacs_max: number;
}

export interface Chauffeur {
  id: number;
  utilisateur_id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
}

export interface DisponibiliteChauffeur {
  id?: number;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
}

export const RessourcesService = {
  getCamions: (): Promise<Camion[]> => {
    return api.get<Camion[]>('/api/ressources/camions');
  },

  addCamion: (data: Partial<Camion>) => {
    return api.post<{ message: string; id?: number }>('/api/ressources/camions', data);
  },

  getChauffeurs: (): Promise<Chauffeur[]> => {
    return api.get<Chauffeur[]>('/api/ressources/chauffeurs');
  },

  addChauffeur: (data: any) => {
    return api.post<{ message: string; id?: number }>('/api/ressources/chauffeurs', data);
  },

  getDisponibilites: (chauffeurId: number): Promise<DisponibiliteChauffeur[]> => {
    return api.get<DisponibiliteChauffeur[]>(`/api/ressources/chauffeurs/${chauffeurId}/disponibilites`);
  },

  updateDisponibilites: (chauffeurId: number, dispos: DisponibiliteChauffeur[]) => {
    return api.post<{ message: string }>(`/api/ressources/chauffeurs/${chauffeurId}/disponibilites`, dispos);
  }
};
