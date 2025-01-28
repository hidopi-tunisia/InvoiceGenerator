import * as StoreReview from 'expo-store-review';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { customEvent } from 'vexo-analytics';

import { useStore } from '~/store';

export const useReviews = () => {
  const { lastReviewRequestAt, setLastReviewRequestAt } = useStore((state) => ({
    lastReviewRequestAt: state.lastReviewRequestAt,
    setLastReviewRequestAt: state.setLastReviewRequestAt,
  }));

  const askForReview = useCallback(async () => {
    if (!(await StoreReview.isAvailableAsync())) {
      console.log('StoreReview pas disponible...');
      return;
    }
    if (!(await StoreReview.hasAction())) {
      console.log('StoreReview non disponible');
      return;
    }
    customEvent('Request Review', {});
    await StoreReview.requestReview();
  }, [setLastReviewRequestAt]);

  const askForFeedback = useCallback(() => {
    Alert.alert('Comment on peut améliorer ?', 'Merci de partager votre feedback avec nous', [
      {
        text: 'Pas maintenant',
        style: 'cancel',
      },
      {
        text: 'Envoyer par email',
        onPress: async () => Linking.openURL('mailto:h.chebbi@hidopi.com'),
      },
    ]);
  }, []);

  const requestReviewOrFeedback = useCallback(() => {
    customEvent('RequestReview Or Feedback', {});

    if (
      lastReviewRequestAt &&
      new Date().getTime() - lastReviewRequestAt.getTime() < 7 * 24 * 60 * 60 * 1000
    ) {
      return;
    }

    setLastReviewRequestAt(new Date());
    Alert.alert('Votre expérience ?', "Vous aimez l'application ?", [
      {
        text: 'Pas vraiment',
        style: 'cancel',
        onPress: askForFeedback,
      },
      {
        text: "J'adore",
        onPress: askForReview,
      },
    ]);
  }, [lastReviewRequestAt, askForFeedback, askForReview]);

  return {
    requestReviewOrFeedback,
  };
};
