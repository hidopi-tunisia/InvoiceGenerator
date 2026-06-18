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
    <View>
      <Text>Register</Text>
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Register" onPress={handleRegister} />
      {/* Inscription / connexion via Google */}
      <Button
        title={signingIn ? 'Inscription Google…' : "S'inscrire avec Google"}
        disabled={!googleReady || signingIn}
        onPress={signInWithGoogle}
      />
      {/* Lien vers la connexion */}
      <Button title="Go to Login" onPress={() => router.push('/(auth)/login')} />
    </View>
  );
};

export default RegisterScreen;
