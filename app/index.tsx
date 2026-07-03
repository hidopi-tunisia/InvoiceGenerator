import { View, Text, ActivityIndicator } from 'react-native';

export default function Index() {
  // Écran neutre de chargement. La redirection (login / onbording / tabs) est
  // centralisée dans app/_layout.tsx selon l'état d'authentification + onboarding,
  // afin d'éviter des redirections concurrentes.
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12 }}>Chargement…</Text>
    </View>
  );
}
