import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { auth } from '../config'; // Instance Firebase auth

import { ForgotPasswordForm, forgotPasswordSchema } from '~/app/schema/auth';
import { getAuthErrorCode, getAuthErrorMessage } from '~/app/utils/auth-errors';
import { Button } from '~/components/Button';
import CustomInputText from '~/components/CustomInputText';
import KeyboardAwareScrollView from '~/components/KeyboardAwareScrollView';

export default function ForgotPasswordScreen() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const methods = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setError('');
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, data.email.trim());
      setSent(true);
    } catch (e) {
      // Anti-énumération de comptes : un email inconnu affiche le même succès
      // qu'un email existant (on ne révèle pas si un compte existe).
      if (getAuthErrorCode(e) === 'auth/user-not-found') {
        setSent(true);
      } else {
        setError(getAuthErrorMessage(e, "Impossible d'envoyer l'email. Réessayez."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToLogin = () =>
    router.canGoBack() ? router.back() : router.replace('/(auth)/login');

  return (
    <KeyboardAwareScrollView>
      <View className="flex-1 justify-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Mot de passe oublié</Text>

        {sent ? (
          <>
            <Text accessibilityRole="alert" className="mb-6 text-base text-green-700">
              Si un compte existe avec cette adresse, un email de réinitialisation vient de vous
              être envoyé. Pensez à vérifier vos spams.
            </Text>
            <Button title="Retour à la connexion" onPress={goBackToLogin} />
          </>
        ) : (
          <>
            <Text className="mb-6 text-base text-gray-500">
              Entrez votre adresse email : nous vous enverrons un lien pour réinitialiser votre mot
              de passe.
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
              <Button
                className="mt-2"
                title="Envoyer le lien"
                loading={submitting}
                onPress={methods.handleSubmit(onSubmit)}
              />
            </FormProvider>

            <Button
              variant="link"
              className="mt-2"
              title="Retour à la connexion"
              onPress={goBackToLogin}
            />
          </>
        )}
      </View>
    </KeyboardAwareScrollView>
  );
}
