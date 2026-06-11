# AlchiRoute - App Expo

Application mobile et web pour la gestion de tournées de collecte de biodéchets.

## Stack Technique

- **Expo SDK** - Framework React Native
- **Expo Router** - Navigation
- **NativeWind** - Styling (Tailwind CSS pour React Native)
- **TypeScript** - Typage statique
- **React Native Reanimated** - Animations

## Installation

```bash
# Installer les dépendances
npm install

# Lancer le projet
npm start
```

## Commandes disponibles

- `npm start` - Lancer le serveur de développement Expo
- `npm run web` - Lancer sur navigateur web
- `npm run android` - Lancer sur émulateur/appareil Android
- `npm run ios` - Lancer sur simulateur/appareil iOS (macOS uniquement)

## Structure du projet

```
front-expo/
├── app/              # Écrans (Expo Router)
│   ├── _layout.tsx   # Layout racine
│   └── index.tsx     # Écran de login
├── components/       # Composants réutilisables
│   ├── AnimatedBlob.tsx
│   ├── InputField.tsx
│   ├── LoginButton.tsx
│   └── ErrorMessage.tsx
├── constants/        # Constantes (couleurs, etc.)
│   └── colors.ts
└── assets/          # Images, fonts
```

## Pages implémentées

- [x] Login (index.tsx)
- [ ] Dashboard Admin
- [ ] Écran Conducteur
- [ ] ... (à venir)

## Comptes de test

- **Admin**: `admin@archappli.fr`
- **Conducteur**: `driver@archappli.fr`
- **Mot de passe**: (n'importe quel mot de passe pour le moment)
