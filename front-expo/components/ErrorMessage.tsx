import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface ErrorMessageProps {
  message: string;
  visible: boolean;
}

export default function ErrorMessage({ message, visible }: ErrorMessageProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: 'rgba(231,111,81,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.4)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    color: '#B03A20',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
