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
        placeholderTextColor="#A09070"
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
    color: '#8A7A60',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#EDE5D4',
    borderWidth: 1,
    borderColor: '#C8B898',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#1B2D27',
    fontFamily: 'System',
  },
});
