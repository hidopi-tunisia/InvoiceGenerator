import { View, Text } from 'react-native';

export default function ErrorBoundary({ error }: { error: Error }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Une erreur est survenue.</Text>
      <Text style={{ color: 'red', fontSize: 18 }}>{error.message}</Text>
    </View>
  );
}
