import { api } from './api';

export interface LoginResponse {
  message: string;
  user_id: number;
  role: 'admin' | 'chauffeur';
}

// Correspond à POST /login — body: { email, mot_de_passe }
export function login(email: string, mot_de_passe: string) {
  return api.post<LoginResponse>('/login', { email, mot_de_passe });
}
