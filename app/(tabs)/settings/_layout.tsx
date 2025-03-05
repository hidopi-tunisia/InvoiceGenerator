import { Stack } from 'expo-router';
export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Modifier le profile',
        }}
      />
      <Stack.Screen
        name="tax-currency"
        options={{
          title: 'Tax et devise',
        }}
      />
    </Stack>
  );
}
