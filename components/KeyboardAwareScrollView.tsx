import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PropsWithChildren, ReactNode } from 'react';

export default function KeyboardAwareScrollView({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 97 : 80}
      style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 10,
          gap: 5,
          paddingBottom: Platform.OS === 'android' ? 0 : 10,
        }}
        keyboardShouldPersistTaps="handled">
        <SafeAreaView edges={['bottom']} style={{ flex: 1,marginBottom: Platform.OS === 'android' ? 10 : 0 }}>
          {children}
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
