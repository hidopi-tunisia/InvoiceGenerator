import { Link } from 'expo-router';
import { View, Text } from 'react-native';

export default function NotFound() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Oops! Page non trouvée.
      </Text>
      <Link href="/" style={{ fontSize: 18, color: 'blue' }}>
        Revenir à l'accueil
      </Link>
    </View>
  );
}
