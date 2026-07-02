// app/(auth)/register.tsx
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';

import { useGoogleSignIn } from '~/hooks/useGoogleSignIn';
import { auth } from '../config'; // Instance Firebase auth

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { signInWithGoogle, signingIn, ready: googleReady } = useGoogleSignIn(setError);

  const handleRegister = async () => {
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Inscrit + connecté : l'auth-gate (app/_layout.tsx) redirige automatiquement.
    } catch (e: any) {
      setError(e?.message ?? "Échec de l'inscription");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Créer un compte</Text>
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
      <Button title="S'inscrire" onPress={handleRegister} />
      <Button
        title={signingIn ? 'Inscription Google…' : "S'inscrire avec Google"}
        disabled={!googleReady || signingIn}
        onPress={signInWithGoogle}
      />
      <Button title="Déjà un compte ? Se connecter" onPress={() => router.push('/(auth)/login')} />
    </View>
  );
};

export default RegisterScreen;
