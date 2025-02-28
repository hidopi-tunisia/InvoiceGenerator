import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const isAuthenticated = true;
  if (isAuthenticated) {
    return ;
  }
  return <Stack />;
}
