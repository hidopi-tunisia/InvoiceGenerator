import { Feather } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Tabs } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // Labels visibles : une nav à icônes seules nuit à la découvrabilité
        // et aux lecteurs d'écran (règle nav-label-icon).
        tabBarActiveTintColor: '#052e16',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="house" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Factures',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="file-invoice" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="contact-book" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
