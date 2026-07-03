import AntDesign from '@expo/vector-icons/AntDesign';
import { router, useLocalSearchParams } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { customEvent } from 'vexo-analytics';

import { Button } from '../../../components/Button';
import { generateInvoicePdf } from '../../utils/pdf';

import { Invoice } from '~/app/schema/invoice';
import { useReviews } from '~/app/utils/review';
import { useStore } from '~/store';

export const unstable_settings = {
  headerShown: false, // Désactive le header pour cette page
};

export default function SuccessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Récupération des données depuis le store
  const invoice = useStore((data) => data.invoices.find((invoice) => invoice.id === id));

  const resetNewInvoice = useStore((data) => data.resetNewInvoice);

  // Gestion de l'état local
  const [isLoading, setIsLoading] = useState(true);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  // Référence pour l'animation Lottie
  const animation = useRef<LottieView>(null);

  const { requestFeedbackOrReview } = useReviews();

  const handleGeneratePdf = useCallback(async () => {
    if (!invoice) return;
    setIsLoading(true);
    setPdfError(false);
    try {
      const uri = await generateInvoicePdf(invoice as Invoice);
      setPdfUri(uri);
      animation.current?.play(); //une fois le pdf est généré, HOP, l'animation se déclanche.
      customEvent('Facture_PDF_Generee', {
        invoiceNumber: invoice?.invoiceNumber,
      });
    } catch {
      setPdfError(true);
    } finally {
      setIsLoading(false);
    }
  }, [invoice]);

  // Génération du PDF au chargement de la page
  useEffect(() => {
    handleGeneratePdf();
  }, [handleGeneratePdf]);

  // Partage du PDF
  const handleShare = async () => {
    if (!pdfUri) {
      Alert.alert('Erreur', "Le fichier PDF n'a pas encore été généré.");
      return;
    }

    try {
      await shareAsync(pdfUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Partager la facture',
      });
      customEvent('Facture_Partagee', {});
      await requestFeedbackOrReview();
    } catch (error) {
      console.error('Erreur lors du partage :', error);
      Alert.alert('Erreur', 'Impossible de partager la facture.');
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      {/* Animation Lottie */}
      <LottieView
        ref={animation}
        source={require('../../../assets/nice.lottie')}
        style={{
          ...StyleSheet.absoluteFillObject,
          //zIndex: 1, // Met au premier plan
          backgroundColor: '#eee',
        }}
      />
      {/* Texte de succès */}
      <AntDesign name="checkcircle" size={60} color="green" />
      <Text className="mb-4 text-center text-2xl font-bold text-gray-800">Félicitations !</Text>
      <Text className="text-center text-base text-gray-600">
        Votre facture a été générée avec succès.
      </Text>

      {/* Échec de génération : message + réessai */}
      {pdfError && (
        <>
          <Text className="mt-4 text-center text-base text-red-500">
            Impossible de générer le PDF.
          </Text>
          <Button variant="link" title="Réessayer" onPress={handleGeneratePdf} />
        </>
      )}

      {/* Bouton de partage */}
      {!pdfError && (
        <Button
          onPress={handleShare}
          disabled={isLoading}
          className={`${isLoading ? 'bg-gray-300' : 'bg-indigo-500'} mt-6 rounded-full px-6 py-3 text-lg font-semibold`}
          variant="primary"
          title={isLoading ? 'Génération en cours...' : 'Partager la facture'}
        />
      )}

      {/* Bouton pour revenir à l'accueil */}
      <Button
        title="Revenir à l'accueil"
        variant="link"
        className="mt-6 rounded-full px-6 py-3"
        onPress={() => {
          resetNewInvoice();
          router.replace('/');
        }}
      />
    </View>
  );
}
