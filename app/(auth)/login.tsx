// app/(auth)/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { auth } from '../config'; // Importez votre instance auth depuis config.ts
import { signInWithEmailAndPassword } from 'firebase/auth';
// Import navigation
import { useNavigation } from '@react-navigation/native';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Get navigation
  const navigation = useNavigation();

  const handleLogin = async () => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // L'utilisateur est connecté, naviguez vers l'écran principal
      navigation.navigate('(tabs)');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <View>
      <Text>Login</Text>
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
      {/* Link to registration */}
      <Button
        title="Go to Register"
        onPress={() => navigation.navigate('/(auth)/register')}
      />
    </View>
  );
};

export default LoginScreen;