import * as StoreReview from 'expo-store-review';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { useStore } from '~/store';

export const useReviews = () => {
  const { lastReviewRequestAt, setLastReviewRequestAt } = useStore((state) => ({
    lastReviewRequestAt: state.lastReviewRequestAt ? new Date(state.lastReviewRequestAt) : null,
    setLastReviewRequestAt: state.setLastReviewRequestAt,
  }));

  // ✅ Demander un avis sur l'App Store / Google Play
  const askForReview = useCallback(async () => {
    if (!(await StoreReview.isAvailableAsync())) {
      console.log('StoreReview pas disponible...');
      return;
    }
    if (!(await StoreReview.hasAction())) {
      console.log('StoreReview non disponible');
      return;
    }
    await StoreReview.requestReview();
    setLastReviewRequestAt(new Date());
  }, [setLastReviewRequestAt]);

  // ✅ Feedback Privé (si l'utilisateur n'est pas satisfait)
  const askForFeedback = useCallback(() => {
    Alert.alert('Comment peut-on améliorer ?', 'Merci de partager votre feedback avec nous', [
      {
        text: 'Pas maintenant',
        style: 'cancel',
      },
      {
        text: 'Envoyer un email',
        onPress: async () => Linking.openURL('mailto:h.chebbi@hidopi.com'),
      },
    ]);
  }, []);

  const requestFeedbackOrReviewInSettigns = async () => {
    Alert.alert('Votre expérience', "Comment s'est passée la génération de votre facture ?", [
      {
        text: 'Pas terrible',
        style: 'cancel',
        onPress: askForFeedback, // Feedback Privé
      },
      {
        text: "J'adore 😍",
        onPress: askForReview,
      },
    ]);
  };

  // ✅ Demander toujours un feedback après chaque génération de PDF
  const requestFeedbackOrReview = useCallback(() => {
    Alert.alert(
      'Votre expérience',
      "Comment s'est passée la génération de votre facture ?",
      [
        {
          text: 'Pas terrible',
          style: 'cancel',
          onPress: askForFeedback, // Feedback Privé
        },
        {
          text: "J'adore 😍",
          onPress: () => {
            // ✅ Si 3 jours sont passés, demander un avis public
            const now = new Date().getTime();
            if (
              !lastReviewRequestAt ||
              now - lastReviewRequestAt.getTime() > 3 * 24 * 60 * 60 * 1000
            ) {
              askForReview();
            }
          },
        },
      ],
      { cancelable: false }
    );
  }, [lastReviewRequestAt, askForFeedback, askForReview, requestFeedbackOrReviewInSettigns]);

  return {
    requestFeedbackOrReview,
    askForReview,
    askForFeedback,
    requestFeedbackOrReviewInSettigns
  };
};
