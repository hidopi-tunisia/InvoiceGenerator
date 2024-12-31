import AntDesign from '@expo/vector-icons/AntDesign';
import { router } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

import { Button } from '../../../components/Button';
import { generateInvoicePdf } from '../../utils/pdf';

import { Invoice } from '~/app/schema/invoice';
import { useStore } from '~/store';

export default function SuccessScreen() {
  // Récupération des données depuis le store
  const subtotal = useStore((state) => state.getSubtotal());
  const total = useStore((state) => state.getTotal());
  const invoice = useStore((state) => state.newInvoice);
  const resetNewInvoice = useStore((state) => state.resetNewInvoice);

  // Gestion de l'état local
  const [isLoading, setIsLoading] = useState(true);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  // Référence pour l'animation Lottie
  const animation = useRef<LottieView>(null);

  // Génération du PDF au chargement de la page
  useEffect(() => {
    const handleGeneratePdf = async () => {
      setIsLoading(true);
      try {
        const uri = await generateInvoicePdf(invoice as Invoice, subtotal, total);
        if (uri) {
          setPdfUri(uri);
          animation.current?.play(); //une fois le pdf est généré, HOP, l'animation se déclanche.
        } else {
          console.error('Erreur : Impossible de générer le fichier PDF.');
        }
      } catch (error) {
        console.error('Erreur lors de la génération du PDF :', error);
      } finally {
        setIsLoading(false);
      }
    };

    handleGeneratePdf();
  }, [invoice, subtotal, total]);

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
        autoPlay
        loop={false}
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: '#eee',
        }}
      />

      {/* Texte de succès */}
      <AntDesign name="checkcircle" size={60} color="green" />
      <Text className="mb-4 text-center text-2xl font-bold text-gray-800">Félicitations !</Text>
      <Text className="text-center text-base text-gray-600">
        Votre facture a été générée avec succès.
      </Text>

      {/* Bouton de partage */}
      <Button
        onPress={handleShare}
        disabled={isLoading}
        className={`${isLoading ? 'bg-gray-300' : 'bg-indigo-500'} mt-6 rounded-full px-6 py-3 text-lg font-semibold`}
        variant="primary"
        title={isLoading ? 'Génération en cours...' : 'Partager la facture'}
      />

      {/* Bouton pour revenir à l'accueil */}
      <Button
        title="Revenir à laccueil"
        variant="secondary"
        className="mt-6 rounded-full px-6 py-3"
        onPress={() => {
          resetNewInvoice();
          router.replace('/');
        }}
      />
    </View>
  );
}
