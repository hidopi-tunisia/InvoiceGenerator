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

    // Reanimated v4 (SDK 54) : le traitement des worklets est déplacé dans
    // react-native-worklets → le plugin babel devient worklets/plugin.
    plugins: [...plugins, 'react-native-worklets/plugin'],
  };
};
