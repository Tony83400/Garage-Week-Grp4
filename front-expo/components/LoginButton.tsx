import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface LoginButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export default function LoginButton({ onPress, loading = false }: LoginButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={styles.button}
    >
      <LinearGradient
        colors={['#2D6A4F', '#52B788']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.text}>Se connecter</Text>
        {loading
          ? <ActivityIndicator color="#ffffff" size="small" style={styles.icon} />
          : <Ionicons name="arrow-forward" size={18} color="white" style={styles.icon} />
        }
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  icon: {
    marginLeft: 10,
  },
});
