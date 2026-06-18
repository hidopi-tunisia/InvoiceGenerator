// app/(auth)/login.tsx
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';

import { useGoogleSignIn } from '~/hooks/useGoogleSignIn';
import { auth } from '../config'; // Instance Firebase auth

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { signInWithGoogle, signingIn, ready: googleReady } = useGoogleSignIn(setError);

  const handleLogin = async () => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // La redirection est gérée par l'auth-gate dans app/_layout.tsx
      // (onAuthStateChanged → /onbording ou /(tabs)).
    } catch (e: any) {
      setError(e?.message ?? 'Échec de la connexion');
    }
  };

  return (
    <View>
      <Text>Login</Text>
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Login" onPress={handleLogin} />
      {/* Connexion / inscription via Google */}
      <Button
        title={signingIn ? 'Connexion Google…' : 'Continuer avec Google'}
        disabled={!googleReady || signingIn}
        onPress={signInWithGoogle}
      />
      {/* Lien vers l'inscription */}
      <Button title="Go to Register" onPress={() => router.push('/(auth)/register')} />
    </View>
  );
};

export default LoginScreen;
