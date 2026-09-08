module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // babel-preset-expo is nested inside expo/node_modules in SDK 54
      require.resolve('expo/node_modules/babel-preset-expo'),
    ],
    plugins: [
      // zustand's middleware bundle contains `import.meta.env`, which is a
      // SyntaxError in the classic <script> Metro's dev server serves.
      require.resolve('./scripts/babel-plugin-neutralize-import-meta'),
      // Reanimated 4 — must be last plugin
      'react-native-reanimated/plugin',
    ],
  };
};
