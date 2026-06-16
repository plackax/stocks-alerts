const transformAllowList = [
  'react-native',
  '@react-native',
  'react-native-.*',
  'expo',
  'expo-.*',
  'expo-modules-core',
  '@expo',
  '@expo/.*',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-svg',
  'react-native-gesture-handler',
  'victory-native',
  '@shopify/react-native-skia',
  'd3-.*',
  'internmap',
];

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    `node_modules/(?!(${transformAllowList.join('|')})/)`,
  ],
  moduleNameMapper: {
    '^expo-modules-core$':
      '<rootDir>/node_modules/expo/node_modules/expo-modules-core/src/index.ts',
    '^expo-modules-core/(.*)$':
      '<rootDir>/node_modules/expo/node_modules/expo-modules-core/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'store/**/*.{ts,tsx}',
    '!app/**/_layout.tsx',
    '!**/*.d.ts',
  ],
};
