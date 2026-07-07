module.exports = function (api) {
  api.cache(true);
  const plugins = [];

  return {
    presets: [
      // unstable_transformImportMeta : Hermes ne supporte pas `import.meta` (utilisé
      // par le build ESM de zustand, résolu depuis que SDK 53 active package exports).
      ['babel-preset-expo', { jsxImportSource: 'nativewind', unstable_transformImportMeta: true }],
      'nativewind/babel',
    ],

    plugins: [...plugins, 'react-native-reanimated/plugin'],
  };
};
