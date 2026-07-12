import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';

type ButtonProps = {
  title: string; // Titre du bouton
  variant?: 'primary' | 'secondary' | 'link'; // Variantes disponibles
  loading?: boolean; // Affiche un spinner et désactive le bouton (anti double-submit)
} & TouchableOpacityProps;

const variantStyles = {
  primary: {
    button: 'items-center bg-primary rounded-[28px] shadow-md p-4',
    text: 'text-white text-lg font-semibold text-center',
    spinner: '#ffffff',
  },
  secondary: {
    button: 'border-2 border-primary bg-white shadow-md p-4 rounded-[28px]',
    text: 'text-primary text-lg font-semibold text-center',
    spinner: '#4f46e5',
  },
  link: {
    button: 'items-center p-4',
    text: 'text-primary text-lg font-bold',
    spinner: '#4f46e5',
  },
};

export const Button = forwardRef<View, ButtonProps>(
  ({ title, variant = 'primary', loading = false, disabled, ...touchableProps }, ref) => {
    const styles = variantStyles[variant] ?? variantStyles.primary;
    const isDisabled = !!disabled || loading;

    return (
      <TouchableOpacity
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...touchableProps}
        disabled={isDisabled}
        className={`flex-row items-center justify-center ${styles.button} ${
          isDisabled ? 'opacity-60' : ''
        } ${touchableProps.className || ''}`}>
        {loading && (
          <ActivityIndicator size="small" color={styles.spinner} style={{ marginRight: 8 }} />
        )}
        <Text className={styles.text}>{title}</Text>
      </TouchableOpacity>
    );
  }
);
