import { Redirect } from 'expo-router';

import { useStore } from '~/store';

export default function Index() {
  const onboardingCompleted = useStore((data) => data.onboardingCompleted);
  console.log('====================================');
  console.log('onboardingCompleted', onboardingCompleted);
  console.log('====================================');
  if (!onboardingCompleted) {
    return <Redirect href="/onbording" />;
  }
  return <Redirect href="/(tabs)" />;
}
