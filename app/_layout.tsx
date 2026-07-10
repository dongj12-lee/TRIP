import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_400Regular,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { StoreProvider, useStore } from '@/lib/store';
import { AuthProvider, useAuth } from '@/lib/auth';
import { RemoteContentProvider } from '@/lib/remoteData';
import { registerForPushNotifications } from '@/lib/notifications';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Registers for push once signed in, and routes to the relevant screen when a
// notification is tapped. No-ops safely in Expo Go (see lib/notifications.ts).
function usePushNotifications() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) registerForPushNotifications().catch(() => {});
  }, [session]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string; id?: string };
      if (data?.type === 'buddy' && data.id) router.push(`/buddy/${data.id}`);
      else if (data?.type === 'post' && data.id) router.push(`/post/${data.id}`);
    });
    return () => sub.remove();
  }, [router]);
}

function RootStack() {
  const { c, dark } = useTheme();
  const { hydrated } = useStore();
  const { ready } = useAuth();
  usePushNotifications();

  useEffect(() => {
    if (hydrated && ready) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, ready]);

  if (!hydrated || !ready) return null;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.paper },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="place/[slug]" />
        <Stack.Screen name="theme/[slug]" />
        <Stack.Screen name="post/[slug]" />
        <Stack.Screen name="buddy/[id]" />
        <Stack.Screen name="creator/[id]" />
        <Stack.Screen name="planner" />
        <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="admin" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces: Fraunces_600SemiBold,
    'Fraunces-Italic': Fraunces_600SemiBold_Italic,
    'Fraunces-Regular': Fraunces_400Regular,
    Jakarta: PlusJakartaSans_400Regular,
    'Jakarta-Medium': PlusJakartaSans_500Medium,
    'Jakarta-SemiBold': PlusJakartaSans_600SemiBold,
    'Jakarta-Bold': PlusJakartaSans_700Bold,
    'Jakarta-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <RemoteContentProvider>
                <StoreProvider>
                  <RootStack />
                </StoreProvider>
              </RemoteContentProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
