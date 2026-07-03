import React, { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

type SnackbarProps = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  /** Durée d'affichage avant fermeture automatique (ms). */
  duration?: number;
};

// Snackbar léger (pattern « Supprimé — Annuler ») : auto-dismiss, une action max.
// L'écran parent doit être en position relative (View racine flex-1).
export default function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 5000,
}: SnackbarProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      accessibilityLiveRegion="polite"
      className="absolute bottom-6 left-4 right-4 flex-row items-center justify-between rounded-lg bg-gray-900 px-4 py-3 shadow-lg">
      <Text className="flex-1 text-sm text-white">{message}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="ml-4 p-1">
          <Text className="text-sm font-bold text-primary-light">{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
