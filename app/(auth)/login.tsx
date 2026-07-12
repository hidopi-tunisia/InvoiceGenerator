import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { auth } from '../config'; // Instance Firebase auth

import { LoginForm, loginSchema } from '~/app/schema/auth';
import { getAuthErrorMessage } from '~/app/utils/auth-errors';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import PasswordInputText from '~/components/PasswordInputText';
import { useGoogleSignIn } from '~/hooks/useGoogleSignIn';

export default function LoginScreen() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signInWithGoogle, signingIn, ready: googleReady } = useGoogleSignIn(setError);
  const methods = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, data.email.trim(), data.password);
      // Succès : la redirection est gérée par l'auth-gate (app/_layout.tsx),
      // l'écran est remplacé — on ne réactive pas le bouton (setState post-unmount).
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Échec de la connexion. Réessayez.'));
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView>
      <View className="flex-1 justify-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Connexion</Text>
        <Text className="mb-6 text-base text-gray-500">Heureux de vous revoir sur Myfakto.</Text>

        {error ? (
          <Text accessibilityRole="alert" className="mb-4 text-sm text-red-500">
            {error}
          </Text>
        ) : null}

        <FormProvider {...methods}>
          <CustomInputText
            name="email"
            label="Email"
            placeholder="votre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <PasswordInputText
            name="password"
            label="Mot de passe"
            placeholder="Votre mot de passe"
            autoComplete="current-password"
            textContentType="password"
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Mot de passe oublié ?"
            className="mb-6 self-end">
            <Text className="text-sm font-medium text-primary">Mot de passe oublié ?</Text>
          </Pressable>

          <Button
            title="Se connecter"
            loading={submitting}
            onPress={methods.handleSubmit(onSubmit)}
          />
        </FormProvider>

        <Button
          variant="secondary"
          className="mt-4"
          title="Continuer avec Google"
          loading={signingIn}
          disabled={!googleReady}
          onPress={signInWithGoogle}
        />
        <Button
          variant="link"
          className="mt-2"
          title="Créer un compte"
          onPress={() => router.push('/(auth)/register')}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
