// components/TransitionView.tsx
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function TransitionView({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(300)}>
      {children}
    </Animated.View>
  );
}
