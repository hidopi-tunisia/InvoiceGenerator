import '../global.css';

import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      {/* hide header for generate invoice screen */}
      <Stack.Screen name="invoices/generate" options={{ headerShown: false }} />
    </Stack>
  );
}
