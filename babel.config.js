module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin is auto-added by babel-preset-expo when
    // react-native-worklets is installed (a dependency of reanimated 4).
    // We don't need to add it manually here.
  };
};
