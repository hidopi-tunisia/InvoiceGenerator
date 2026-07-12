import { Feather } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

type SwipeableRowProps = {
  children: React.ReactNode;
  /** Action « Supprimer » (icône poubelle, fond rouge) — toujours présente. */
  onDelete: () => void;
  /** Action « Modifier » (icône crayon, fond primaire) — optionnelle. */
  onEdit?: () => void;
  /** Libellés d'accessibilité (ex. « Modifier Client SARL »). */
  editLabel?: string;
  deleteLabel?: string;
  /** Classes du conteneur d'actions — aligner marge/arrondi sur la carte enfant
      (ex. "mb-4 rounded-r-lg" pour une carte "mb-4 rounded-lg"). */
  actionsClassName?: string;
};

/**
 * Rangée glissable façon iOS (Mail) : un swipe vers la gauche révèle les
 * actions Modifier/Supprimer en icônes. Fonctionne aussi sur Android.
 * S'appuie sur ReanimatedSwipeable (gesture-handler + reanimated, thread UI) —
 * le Swipeable historique du même paquet est déprécié.
 */
export default function SwipeableRow({
  children,
  onDelete,
  onEdit,
  editLabel = 'Modifier',
  deleteLabel = 'Supprimer',
  actionsClassName = '',
}: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  // Referme la rangée avant d'exécuter l'action : évite de laisser une rangée
  // ouverte derrière une alerte ou une navigation.
  const runAction = (action: () => void) => {
    swipeableRef.current?.close();
    action();
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View className={`flex-row overflow-hidden ${actionsClassName}`}>
          {onEdit && (
            <Pressable
              onPress={() => runAction(onEdit)}
              accessibilityRole="button"
              accessibilityLabel={editLabel}
              className="w-20 items-center justify-center bg-primary active:bg-primary-dark">
              <Feather name="edit-2" size={22} color="#fff" />
            </Pressable>
          )}
          <Pressable
            onPress={() => runAction(onDelete)}
            accessibilityRole="button"
            accessibilityLabel={deleteLabel}
            className="w-20 items-center justify-center bg-red-500 active:bg-red-600">
            <Feather name="trash-2" size={22} color="#fff" />
          </Pressable>
        </View>
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}
