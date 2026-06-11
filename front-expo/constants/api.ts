import Constants from 'expo-constants';

function getApiBaseUrl(): string {
  // Manuel : définir EXPO_PUBLIC_API_URL dans .env.local (gitignored)
  // Exemple : EXPO_PUBLIC_API_URL=http://192.168.1.42:5000
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  // Web : navigateur et Flask tournent sur la même machine
  if (typeof document !== 'undefined') return 'http://localhost:5000';

  // Mobile dev (Expo Go SDK 50+) : récupère l'IP du PC qui fait tourner Metro
  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:5000`;
  }

  return 'http://localhost:5000';
}

export const API_BASE_URL = getApiBaseUrl();
