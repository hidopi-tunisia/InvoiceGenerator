import { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { style } from 'twrnc';

type ButtonProps = {
  title: string; // Titre du bouton
  variant?: 'primary' | 'secondary' | 'link'; // Variantes disponibles
} & TouchableOpacityProps;

export const Button = forwardRef<View, ButtonProps>(
  ({ title, variant = 'primary', ...touchableProps }, ref) => {
    const variantStyles = {
      primary: styles.primary,
      secondary: styles.secondary,
      link: styles.link,
    };

    return (
      <TouchableOpacity
        ref={ref}
        {...touchableProps}
        className={`${styles.primary} ${variantStyles[variant]?.button} ${
          touchableProps.className || ''
        }`}>
        <Text className={variantStyles[variant]?.text}>{title}</Text>
      </TouchableOpacity>
    );
  }
);

const styles = {
  primary: {
    button: 'items-center bg-blue-700 rounded-[28px] shadow-md p-4',
    text: 'text-white text-lg font-semibold text-center',
  },
  secondary: {
    button: 'border-2 border-indigo-500 bg-white shadow-md p-4 rounded-[28px]',
    text: 'text-indigo-500 text-lg font-semibold text-center',
  },
  link: {
    button: 'items-center p-4',
    text: 'text-blue-600 text-lg font-bold',
  },
};
