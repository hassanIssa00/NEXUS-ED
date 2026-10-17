import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'welcome',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}



function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="dark" />
          <AuthNavigationGate />
          <Stack>
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="verify-email" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AuthNavigationGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const appStartedAt = useRef(Date.now());

  useEffect(() => {
    if (loading) return;
    const firstSegment = String(segments[0] ?? '');
    const publicScreens = ['index', 'welcome', 'login', 'register', 'forgot-password'];
    if (!user && firstSegment === 'index') {
      router.replace('/welcome' as never);
      return;
    }
    if (!user && !publicScreens.includes(firstSegment)) {
      router.replace('/login');
      return;
    }
    if (!user) return;

    let destination = '/(tabs)';
    if (user.role === 'STUDENT' && user.onboardingStep === 'student-profile') destination = '/onboarding/student-profile';
    else if (user.role === 'STUDENT' && user.onboardingStep === 'placement-assessment') destination = '/onboarding/placement-assessment';
    else if (user.role === 'PARENT' && user.onboardingStep === 'link-student') destination = '/onboarding/link-student';
    else if (user.role === 'PARENT' && user.onboardingStep === 'parent-survey') destination = '/onboarding/parent-survey';

    const expectedRoot = destination === '/(tabs)' ? '(tabs)' : destination.split('/')[1];
    if (firstSegment === expectedRoot) return;

    const welcomeDelay = firstSegment === 'welcome'
      ? Math.max(0, 5000 - (Date.now() - appStartedAt.current))
      : 0;
    const timeout = setTimeout(() => router.replace(destination as never), welcomeDelay);
    return () => clearTimeout(timeout);
  }, [loading, router, segments, user]);

  return null;
}
