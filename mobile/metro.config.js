import { getDefaultConfig, mergeConfig } from '@react-native/metro-config';

module.exports = mergeConfig(getDefaultConfig(__dirname), {});
