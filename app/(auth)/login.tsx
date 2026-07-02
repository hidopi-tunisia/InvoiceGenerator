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
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Connexion</Text>
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
      />
      <Button title="Se connecter" onPress={handleLogin} />
      <Button
        title={signingIn ? 'Connexion Google…' : 'Continuer avec Google'}
        disabled={!googleReady || signingIn}
        onPress={signInWithGoogle}
      />
      <Button title="Créer un compte" onPress={() => router.push('/(auth)/register')} />
    </View>
  );
};

export default LoginScreen;
