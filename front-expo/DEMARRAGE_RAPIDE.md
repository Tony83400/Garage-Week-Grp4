# 🚀 Démarrage Rapide

## Première installation

```bash
cd front-expo
npm install
```

## Lancer l'application

```bash
npm start
```

Cela ouvrira Expo Dev Tools. Vous pourrez alors :

- Appuyer sur `w` pour ouvrir dans le navigateur web
- Appuyer sur `a` pour lancer sur Android (émulateur ou appareil)
- Appuyer sur `i` pour lancer sur iOS (simulateur macOS uniquement)
- Scanner le QR code avec l'app Expo Go sur votre téléphone

## Comptes de test

Pour tester le login :

- **Admin** : `admin@archappli.fr` + n'importe quel mot de passe
- **Conducteur** : `driver@archappli.fr` + n'importe quel mot de passe

## Problèmes fréquents

### Port déjà utilisé
```bash
# Tuer le processus sur le port 8081
npx kill-port 8081
npm start
```

### Cache corrompu
```bash
# Nettoyer le cache Expo
npx expo start -c
```

### Erreurs de dépendances
```bash
# Réinstaller proprement
rm -rf node_modules package-lock.json
npm install
```

## Développement

- Les fichiers sont dans `/app` pour les écrans
- Les composants réutilisables dans `/components`
- Hot reload activé automatiquement
- Appuyez sur `r` dans le terminal pour recharger manuellement

## Prochaines étapes

1. ✅ Login implémenté
2. ⏳ Dashboard Admin (prochaine page à convertir)
3. ⏳ Écran Conducteur
4. ⏳ Autres pages du dossier `/front`
