import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { login } from '../services/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AnimatedBlob from '../components/AnimatedBlob';
import InputField from '../components/InputField';
import LoginButton from '../components/LoginButton';
import ErrorMessage from '../components/ErrorMessage';
import { colors } from '../constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const handleLogin = async () => {
    setShowError(false);
    setError('');

    // Validation
    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      setShowError(true);
      return;
    }

    setLoading(true);

    // Connexion conducteur hardcodée — à remplacer quand le back retournera role='chauffeur'
    if (email.trim().toLowerCase() === 'driver@archappli.fr') {
      router.replace('/driver');
      return;
    }

    try {
      const { role } = await login(email, password);
      if (role === 'admin') {
        router.replace('/dashboard');
      } else {
        router.replace('/driver');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion.';
      setError(message);
      setShowError(true);
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
        {/* Animated Blobs */}
        <AnimatedBlob
          size={520}
          color={colors.primaryLight}
          top={-120}
          left={-100}
          delay={0}
        />
        <AnimatedBlob
          size={400}
          color={colors.secondary}
          bottom={-80}
          right={-80}
          delay={4000}
        />
        <AnimatedBlob
          size={280}
          color={colors.accent}
          top="40%"
          left="55%"
          delay={7000}
        />

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.duration(600).springify()}
            style={styles.card}
          >
            {/* Logo */}
            <View style={styles.logoWrapper}>
              <LinearGradient
                colors={[colors.primaryLight, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoBox}
              >
                <Text style={styles.logoText}>A</Text>
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>ArchAppli</Text>
            <Text style={styles.tagline}>
              Collecte intelligente. Impact réel.
            </Text>

            {/* Email Field */}
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

            {/* Password Field */}
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

            {/* Login Button */}
            <LoginButton onPress={handleLogin} loading={loading} />

            {/* Error Message */}
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    color: '#ffffff',
    fontSize: 36,
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
