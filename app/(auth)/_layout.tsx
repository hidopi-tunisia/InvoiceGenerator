import { Stack } from 'expo-router';

export default function AuthLayout() {
  // Le groupe (auth) rend toujours ses écrans (login / register / forgot).
  // C'est le root layout qui décide de naviguer ici selon l'état d'authentification.
  return <Stack screenOptions={{ headerShown: false }} />;
}
