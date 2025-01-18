import '../global.css';
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { Stack, useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';
import { vexo } from 'vexo-analytics';

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
  debug: __DEV__, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
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
  return (
    <Stack>
      {/* hide header for generate invoice screen */}
      <Stack.Screen name="invoices/generate" options={{ headerShown: false }} />
    </Stack>
  );
}
export default Sentry.wrap(Layout);
