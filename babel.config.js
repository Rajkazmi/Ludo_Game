module.exports = {
  presets: ['module:@react-native/babel-preset'], // or 'module:metro-react-native-babel-preset'
  plugins: [
    // ... other plugins if you have any
    'react-native-reanimated/plugin', // This MUST be the last item
  ],
};