import * as StoreReview from 'expo-store-review';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { useStore } from '~/store';

export const useReviews = () => {
  // Sélecteurs ciblés obligatoires (MOBILE_GUIDELINES §5) : un sélecteur qui
  // retourne un objet/Date recréé à chaque appel rend le snapshot instable
  // → boucle de rendus (« Maximum update depth exceeded ») dès qu'une
  // écriture store survient pendant que l'écran est monté.
  const lastReviewRequestAtRaw = useStore((state) => state.lastReviewRequestAt);
  const setLastReviewRequestAt = useStore((state) => state.setLastReviewRequestAt);
  const lastReviewRequestAt = lastReviewRequestAtRaw ? new Date(lastReviewRequestAtRaw) : null;

  // ✅ Demander un avis sur l'App Store / Google Play
  const askForReview = useCallback(async () => {
    // StoreReview indisponible (simulateur, Expo Go…) : on abandonne silencieusement,
    // la demande d'avis est un bonus, jamais un parcours bloquant.
    if (!(await StoreReview.isAvailableAsync())) {
      return;
    }
    if (!(await StoreReview.hasAction())) {
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
    requestFeedbackOrReviewInSettigns,
  };
};
