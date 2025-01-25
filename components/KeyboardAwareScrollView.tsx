import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = PropsWithChildren<{
  edges?: ('bottom' | 'top' | 'right')[]; // Edges to adjust the view to avoid keyboard. Default: ['bottom']
  //children: ReactNode; // The content to be displayed inside the view.
}>;

export default function KeyboardAwareScrollView({ children, edges = ['bottom'] }: Props) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 97 : 80}
      style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          gap: 5,
          paddingBottom: Platform.OS === 'android' ? 0 : 10,
        }}
        keyboardShouldPersistTaps="handled">
        <SafeAreaView
          edges={['bottom']}
          style={{ flex: 1, marginBottom: Platform.OS === 'android' ? 10 : 0 }}>
          {children}
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
