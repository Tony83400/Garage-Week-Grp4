import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { login } from '../services/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import AnimatedBlob from '../components/AnimatedBlob';
import InputField from '../components/InputField';
import LoginButton from '../components/LoginButton';
import ErrorMessage from '../components/ErrorMessage';
import TruckAnimation, { type TruckPhase } from '../components/TruckAnimation';
import { colors } from '../constants/colors';

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

  // Le formulaire tombe du camion quand la benne s'ouvre
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
        <LinearGradient
          colors={[colors.primaryDark, colors.primaryMid, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Blobs de fond */}
          <AnimatedBlob size={520} color={colors.primaryLight} top={-120} left={-100} delay={0} />
          <AnimatedBlob size={400} color={colors.secondary} bottom={-80} right={-80} delay={4000} />
          <AnimatedBlob size={280} color={colors.accent} top="40%" left="55%" delay={7000} />

          {/* Camion — reste visible en haut pendant toute l'interaction */}
          <View style={styles.truckRow}>
            <TruckAnimation
              phase={phase}
              emailFilled={emailFilled}
              passwordFilled={passwordFilled}
              onFormReady={handleFormReady}
              truckWidth={truckWidth}
            />
          </View>

          {/* Formulaire — tombe depuis le camion */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.card, cardStyle]}>
              {/* Logo */}
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={[colors.primaryLight, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoBox}
                >
                  <Text style={styles.logoEmoji}>🌿</Text>
                </LinearGradient>
              </View>

              <Text style={styles.title}>ArchAppli</Text>
              <Text style={styles.tagline}>Collecte intelligente. Impact réel.</Text>

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
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
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
    backgroundColor: 'rgba(180,210,195,0.22)',
    borderRadius: 28,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.25,
    shadowRadius: 60,
    elevation: 10,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 34,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 36,
    letterSpacing: 0.2,
  },
});
