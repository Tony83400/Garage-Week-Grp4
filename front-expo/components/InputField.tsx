import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';

interface InputFieldProps extends TextInputProps {
  label: string;
}

export default function InputField({ label, ...props }: InputFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="rgba(255,255,255,0.35)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'System',
  },
});
