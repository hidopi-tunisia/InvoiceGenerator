// app/(auth)/register.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { auth } from '../../config'; // Importez votre instance auth depuis config.ts
import { createUserWithEmailAndPassword } from 'firebase/auth';
// Import navigation
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Get navigation
  const navigation = useNavigation();
  const handleRegister = async () => {
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // L'utilisateur est inscrit et connecté, naviguez vers l'écran principal
    } catch (error: any) {
      setError(error.message);
      navigation.navigate('(tabs)');
    }
  };

  return (
    <View>
      <Text>Register</Text>
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
      <Button title="Register" onPress={handleRegister} />
      {/* Lien vers la connexion si nécessaire */}
    </View>
  );
};

export default RegisterScreen;