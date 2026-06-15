import React from 'react';
import { TouchableOpacity, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
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
      <View style={styles.inner}>
        <Text style={styles.text}>Se connecter</Text>
        {loading
          ? <ActivityIndicator color="#ffffff" size="small" style={styles.icon} />
          : <Ionicons name="arrow-forward" size={18} color="white" style={styles.icon} />
        }
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  inner: {
    backgroundColor: '#2A7A3B',
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
