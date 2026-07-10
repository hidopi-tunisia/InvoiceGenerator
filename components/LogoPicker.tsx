import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

type LogoPickerProps = {
  /** URI locale (sélectionnée dans cette session ou stockée). */
  logoUri?: string;
  /** URL serveur (Cloudinary) — fallback si pas de logoUri local. */
  logoUrl?: string;
  /** Appelé avec l'URI locale après sélection réussie. */
  onPick: (uri: string) => void;
};

/**
 * Cercle tappable affiché en tête des écrans de profil.
 * Montre l'aperçu du logo (logoUri en priorité, sinon logoUrl) ou une icône
 * appareil photo + « Ajouter un logo » si aucun logo.
 */
export default function LogoPicker({ logoUri, logoUrl, onPick }: LogoPickerProps) {
  const source = logoUri || logoUrl;

  const handlePress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        "Fatourty a besoin d'accéder à votre galerie pour ajouter un logo à votre profil. Veuillez l'autoriser dans les réglages.",
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onPick(result.assets[0].uri);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel="Sélectionner un logo"
      accessibilityRole="button"
      style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}>
      {/* Cercle principal — 96×96pt, bien au-dessus du minimum 44pt */}
      <View style={styles.circle}>
        {source ? (
          <Image
            source={{ uri: source }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel="Aperçu du logo"
          />
        ) : (
          <View style={styles.placeholder}>
            <Feather name="camera" size={28} color="#6b7280" />
          </View>
        )}

        {/* Badge « modifier » affiché en surimpression quand un logo est déjà présent */}
        {source && (
          <View style={styles.editBadge}>
            <Feather name="edit-2" size={11} color="#ffffff" />
          </View>
        )}
      </View>

      <Text style={styles.label}>{source ? 'Modifier le logo' : 'Ajouter un logo'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    marginBottom: 28,
    // Élargir la zone de tap au-delà du cercle visible
    padding: 4,
  },
  pressablePressed: {
    opacity: 0.75,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3f4f6', // gray-100
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Ombre légère pour la carte logo (cohérente avec bg-white rounded-xl shadow-sm)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#e5e7eb', // gray-200
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4f46e5', // primary indigo
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  label: {
    marginTop: 8,
    fontSize: 13,
    color: '#6b7280', // gray-500
    fontWeight: '500',
  },
});
