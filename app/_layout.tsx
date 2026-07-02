import '../global.css';
// import * as Sentry from '@sentry/react-native'; // TEMP: disabled to diagnose require(undefined)
import { ErrorBoundaryProps, Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity} from 'react-native';
import { vexo } from 'vexo-analytics';

import { useStore } from '~/store';
import { auth } from './config'; // Import Firebase auth

const vexoApiKey = '4277a15f-8ec3-4fdc-ad1c-e6e2f5c61c40';

console.log(vexoApiKey, '1');
vexo(vexoApiKey as string);

if (!__DEV__ && vexoApiKey) {
  vexo(vexoApiKey);
}

function Layout() {
  const [user, setUser] = useState<User | null>(null); // Track user authentication state
  const [authReady, setAuthReady] = useState(false); // onAuthStateChanged a répondu au moins une fois
  // Capture the NavigationContainer ref and register it with the integration.
  const ref = useNavigationContainerRef();
  const router = useRouter();
  const onboardingCompleted = useStore((state) => state.onboardingCompleted);

  useEffect(() => {
    // Subscribe to authentication state changes
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setAuthReady(true);
    });

    // Unsubscribe on component unmount
    return () => unsubscribe();
  }, [ref]);

  // Redirection conditionnelle — faite APRÈS le montage du navigateur (impératif),
  // sinon expo-router lève « Attempted to navigate before mounting the Root Layout ».
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace('/(auth)/login');
    } else if (!onboardingCompleted) {
      router.replace('/onbording');
    } else {
      router.replace('/(tabs)');
    }
  }, [authReady, user, onboardingCompleted]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
      {/* hide header for generate invoice screen */}
      <Stack.Screen name="invoices/generate" options={{ headerShown: false }} />
      <Stack.Screen name="onbording" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen
        name="invoices/[id]/success"
        options={{
          headerTitle: 'Yoopiii', // Titre par défaut pour les sous-routes
          headerBackTitle: 'Accueil', // Texte du bouton retour
        }}
      />
      {/* Add auth screens */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}
export default Layout; // TEMP: Sentry.wrap disabled for diagnosis

//cette fonction va capter n'importe quelle erreur dans l'application
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-red-50 p-6">
      {/* Icône ou Emoji pour l'erreur */}
      <Text className="mb-4 text-6xl">⚠️</Text>

      {/* Titre d'erreur */}
      <Text className="mb-2 text-2xl font-bold text-red-600">Une erreur est survenue</Text>

      {/* Message d'erreur */}
      <Text className="mb-6 text-center text-base text-gray-700">
        {error.message || "Quelque chose s'est mal passé."}
      </Text>

      {/* Bouton pour réessayer */}
      <TouchableOpacity onPress={retry} className="rounded-lg bg-red-500 px-6 py-3 shadow-md">
        <Text className="text-lg font-semibold text-white">Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}