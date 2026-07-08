// Learn more https://docs.expo.io/guides/customizing-metro
// Sentry 7 (SDK 54) : pour Expo, getSentryExpoConfig remplace
// getDefaultConfig + withSentryConfig (câblage serializer/debugId correct).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// eslint-disable-next-line no-undef
const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts.push('lottie');
module.exports = withNativeWind(config, { input: './global.css' });
