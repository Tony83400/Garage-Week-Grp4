import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

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
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" style={styles.icon} />
        ) : (
          <View style={styles.icon}>
            <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <Path
                d="M3 9H15M15 9L10 4M15 9L10 14"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        )}
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
