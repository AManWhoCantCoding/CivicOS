module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/src/**/*.test.[jt]s?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:@maplibre/maplibre-react-native|react-native|@react-native)/)',
  ],
};
