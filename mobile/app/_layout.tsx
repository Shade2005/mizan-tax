// ============================================================================
// Mizan (ميزان) - Root Expo Router Layout
// Integrates SafeAreaProvider, LocaleProvider, QueryClientProvider, and System Chrome
// ============================================================================

import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocaleProvider } from '../src/context/LocaleContext';
import { BusinessProvider } from '../src/context/BusinessContext';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes cache
            retry: 2,
          },
        },
      })
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <BusinessProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="scan/index" options={{ headerShown: false }} />
              <Stack.Screen name="scan/review" options={{ headerShown: false }} />
              <Stack.Screen name="scan/readiness" options={{ headerShown: false }} />
              <Stack.Screen name="scan/report" options={{ headerShown: false }} />
              <Stack.Screen name="invoices/new" options={{ headerShown: false }} />
              <Stack.Screen name="expenses/scan" options={{ headerShown: false }} />
              <Stack.Screen name="expenses/review" options={{ headerShown: false }} />
              <Stack.Screen name="learn/chat" options={{ headerShown: false }} />
            </Stack>
          </BusinessProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
