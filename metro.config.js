// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { withSentryConfig } = require('@sentry/react-native/metro');

/** @type {import('expo/metro-config').MetroConfig} */
// eslint-disable-next-line no-undef
let config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('lottie');
config = withSentryConfig(config);
module.exports = withNativeWind(config, { input: './global.css' });
