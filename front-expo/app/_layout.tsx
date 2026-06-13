import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index"     options={{ animation: 'fade' }} />
        <Stack.Screen name="dashboard" options={{ animation: 'fade' }} />
        <Stack.Screen name="planning"  options={{ animation: 'fade' }} />
        <Stack.Screen name="driver"    options={{ animation: 'fade' }} />
        <Stack.Screen name="imprevus"  options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="sites"     options={{ animation: 'slide_from_right' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
