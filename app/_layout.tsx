import '../global.css';
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { ErrorBoundaryProps, Redirect, Stack, useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { vexo } from 'vexo-analytics';

import { useStore } from '~/store';

const vexoApiKey = '4277a15f-8ec3-4fdc-ad1c-e6e2f5c61c40';

console.log(vexoApiKey, '1');
vexo(vexoApiKey as string);

if (!__DEV__ && vexoApiKey) {
  vexo(vexoApiKey);
}
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: 'https://2cacf18cbc1431eb07b8b3bdad5edbe7@o4508658689572864.ingest.de.sentry.io/4508658744361040',
  debug: false, // __DEV__, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  tracesSampleRate: 1.0, // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing. Adjusting this value in production.
  integrations: [
    // Pass integration
    navigationIntegration,
  ],
  enableNativeFramesTracking: !isRunningInExpoGo(), // Tracks slow and frozen frames in the application
});

function Layout() {
  
  // Capture the NavigationContainer ref and register it with the integration.
  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref?.current) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);
  const onboardingCompleted = useStore((state) => state.onboardingCompleted);

  if (!onboardingCompleted) {
    return <Redirect href="/onbording" />;
  }
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
    </Stack>
  );
}
export default Sentry.wrap(Layout);

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