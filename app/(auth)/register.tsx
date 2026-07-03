import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { auth } from '../config'; // Instance Firebase auth

import { RegisterForm, registerSchema } from '~/app/schema/auth';
import { getAuthErrorMessage } from '~/app/utils/auth-errors';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';
import PasswordInputText from '~/components/PasswordInputText';
import { useGoogleSignIn } from '~/hooks/useGoogleSignIn';

export default function RegisterScreen() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signInWithGoogle, signingIn, ready: googleReady } = useGoogleSignIn(setError);
  const methods = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setError('');
    setSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      // Inscrit + connecté : l'auth-gate (app/_layout.tsx) redirige vers l'onboarding.
    } catch (e) {
      setError(getAuthErrorMessage(e, "Échec de l'inscription. Réessayez."));
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView>
      <View className="flex-1 justify-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Créer un compte</Text>
        <Text className="mb-6 text-base text-gray-500">
          Vos factures professionnelles en quelques minutes.
        </Text>

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
            placeholder="6 caractères minimum"
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Button
            className="mt-2"
            title="S'inscrire"
            loading={submitting}
            onPress={methods.handleSubmit(onSubmit)}
          />
        </FormProvider>

        <Button
          variant="secondary"
          className="mt-4"
          title="S'inscrire avec Google"
          loading={signingIn}
          disabled={!googleReady}
          onPress={signInWithGoogle}
        />
        <Button
          variant="link"
          className="mt-2"
          title="Déjà un compte ? Se connecter"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
