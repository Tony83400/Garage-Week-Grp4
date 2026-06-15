import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { login } from '../services/auth';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import InputField from '../components/InputField';
import LoginButton from '../components/LoginButton';
import ErrorMessage from '../components/ErrorMessage';
import TruckAnimation, { type TruckPhase } from '../components/TruckAnimation';

function AlchiLogo() {
  return (
    <Svg width={38} height={46} viewBox="0 0 36 44">
      <Path d="M18 2 L4 42 L13 42 L18 24 L23 42 L32 42 Z" fill="#FFFFFF" />
      <Path d="M11 30 L25 30 L23 34 L13 34 Z" fill="#1B3A28" />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const truckWidth = Math.min(Math.round(screenWidth * 0.68), 260);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [phase, setPhase] = useState<TruckPhase>('arriving');

  const cardY = useSharedValue(-260);
  const cardRot = useSharedValue(3);
  const cardOpacity = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: cardY.value },
      { rotate: `${cardRot.value}deg` },
    ],
    opacity: cardOpacity.value,
  }));

  function handleFormReady() {
    setPhase('idle');
    cardOpacity.value = withTiming(1, { duration: 200 });
    cardY.value = withSpring(0, { damping: 13, stiffness: 95, mass: 1.1 });
    cardRot.value = withSpring(0, { damping: 14, stiffness: 80 });
  }

  const emailFilled = email.trim().includes('@') && email.trim().length > 4;
  const passwordFilled = password.length > 0;

  const handleLogin = async () => {
    setShowError(false);
    setError('');

    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      setShowError(true);
      setPhase('error');
      setTimeout(() => setPhase('idle'), 1200);
      return;
    }

    setLoading(true);
    setPhase('starting');

    try {
      const response = await login(email.trim(), password);
      setPhase('departing');
      const { role } = response;

      setTimeout(() => {
        if (role === 'admin') {
          router.replace('/dashboard');
        } else if (role === 'chauffeur') {
          router.replace(`/driver?id=${response.user_id}`);
        }
      }, 680);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion.';
      setError(message);
      setShowError(true);
      setPhase('error');
      setTimeout(() => setPhase('idle'), 1400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ImageBackground
          source={require('../assets/ref/logistique.jpg')}
          style={styles.bg}
          resizeMode="cover"
        >
          <View style={styles.overlay} />

          <View style={styles.truckRow}>
            <TruckAnimation
              phase={phase}
              emailFilled={emailFilled}
              passwordFilled={passwordFilled}
              onFormReady={handleFormReady}
              truckWidth={truckWidth}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.card, cardStyle]}>

              {/* Header vert — identité */}
              <View style={styles.cardHeader}>
                <AlchiLogo />
                <Text style={styles.title}>AlchiRoute</Text>
                <Text style={styles.tagline}>· LES ALCHIMISTES · VAR 83 ·</Text>
              </View>

              {/* Séparateur */}
              <View style={styles.sep} />

              {/* Zone formulaire — beige */}
              <View style={styles.cardForm}>
                <InputField
                  label="Email"
                  placeholder="votre@email.fr"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                />

                <InputField
                  label="Mot de passe"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                />

                <LoginButton onPress={handleLogin} loading={loading} />

                <ErrorMessage message={error} visible={showError} />
              </View>

            </Animated.View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 28, 15, 0.70)',
  },
  truckRow: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 14,
  },
  cardHeader: {
    backgroundColor: '#1B3A28',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 24,
  },
  sep: {
    height: 3,
    backgroundColor: '#2A7A3B',
  },
  cardForm: {
    backgroundColor: '#EDE3CF',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
