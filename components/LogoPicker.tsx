import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
    // Pas de requestMediaLibraryPermissionsAsync : le picker système
    // (PHPicker iOS 14+ / Photo Picker Android 13+) n'exige AUCUNE permission,
    // et demander une permission sans clé NSPhotoLibraryUsageDescription dans
    // l'Info.plist fait tuer l'app par iOS (crash TCC constaté sur device).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Fix 5 : remplace MediaTypeOptions.Images (déprécié)
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const pickedUri = result.assets[0].uri;
      // Fix 4 : copier hors du cache purgeable (chemin change à chaque MAJ iOS).
      // Nom stable avec horodatage ; fallback sur l'URI d'origine si la copie échoue.
      const ext = pickedUri.split('.').pop() ?? 'jpg';
      const destUri = `${FileSystem.documentDirectory}logo-${Date.now()}.${ext}`;
      let finalUri = pickedUri;
      try {
        await FileSystem.copyAsync({ from: pickedUri, to: destUri });
        finalUri = destUri;
      } catch {
        // Copie impossible : on garde l'URI du picker (l'upload logo gérera l'erreur réseau)
      }
      onPick(finalUri);
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
