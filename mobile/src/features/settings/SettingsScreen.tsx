import React from 'react';
import { Text, View } from 'react-native';
import { apiBaseUrl } from '../../config';
export function SettingsScreen() {
  return (
    <View style={{ padding: 16 }}>
      <Text>API runtime</Text>
      <Text>{apiBaseUrl()}</Text>
      <Text>Không lưu secret trong ứng dụng.</Text>
    </View>
  );
}
