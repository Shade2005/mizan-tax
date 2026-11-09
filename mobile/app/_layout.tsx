// ============================================================================
// Mizan (ميزان) - Root Expo Router Layout
// Integrates SafeAreaProvider, LocaleProvider, QueryClientProvider, and System Chrome
// ============================================================================

import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <LocaleProvider>
            <BusinessProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  animationDuration: 280,
                }}
              >
                <Stack.Screen
                  name="index"
                  options={{
                    headerShown: false,
                    animation: 'fade',
                  }}
                />
                <Stack.Screen
                  name="auth/login"
                  options={{
                    headerShown: false,
                    animation: 'fade',
                  }}
                />
                <Stack.Screen
                  name="auth/register"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="onboarding/business"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: false, // Disallow gesture back to prevent skipping
                  }}
                />

                <Stack.Screen
                  name="(tabs)"
                  options={{
                    headerShown: false,
                    animation: 'fade',
                  }}
                />

                {/* Full-screen Scanner / Camera Screens */}
                <Stack.Screen
                  name="scan/index"
                  options={{
                    headerShown: false,
                    presentation: 'fullScreenModal',
                    animation: 'fade',
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="expenses/scan"
                  options={{
                    headerShown: false,
                    presentation: 'fullScreenModal',
                    animation: 'fade',
                    gestureEnabled: true,
                  }}
                />

                {/* Modal Task Flows */}
                <Stack.Screen
                  name="invoices/new"
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    gestureEnabled: true,
                  }}
                />

                {/* Detail & Audit Review Screens */}
                <Stack.Screen
                  name="scan/review"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="scan/readiness"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="scan/report"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="expenses/review"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="learn/chat"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                  }}
                />
              </Stack>
            </BusinessProvider>
          </LocaleProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
