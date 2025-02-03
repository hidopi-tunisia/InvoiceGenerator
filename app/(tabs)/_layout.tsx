import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false, // Non affichage du titre de la tab
        tabBarStyle: { paddingTop: 10 }, // Tab position
        tabBarActiveTintColor: '#052e16', //Tint color
        // tabBarInactiveTintColor: '#16a34a',
      }}>
      <Tabs.Screen
        name="index"
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
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="contact-book" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="user-astronaut" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
