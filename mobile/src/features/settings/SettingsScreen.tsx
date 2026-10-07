import React from 'react';
import { Text, View } from 'react-native';
import { apiBaseUrl } from '../../config';
import { mobileBaseline } from '../../components/States';
export function SettingsScreen() {
  return (
    <View
      style={{
        padding: mobileBaseline.space.s4,
        gap: mobileBaseline.space.s2,
        backgroundColor: mobileBaseline.color.canvas,
      }}
    >
      <Text
        style={{
          fontFamily: mobileBaseline.font.sans,
          fontSize: mobileBaseline.size.title,
          color: mobileBaseline.color.text,
        }}
      >
        API runtime
      </Text>
      <Text
        style={{
          fontFamily: mobileBaseline.font.mono,
          fontSize: mobileBaseline.size.label,
          color: mobileBaseline.color.textMuted,
        }}
      >
        {apiBaseUrl()}
      </Text>
      <Text
        style={{
          fontFamily: mobileBaseline.font.sans,
          fontSize: mobileBaseline.size.label,
          color: mobileBaseline.color.textMuted,
        }}
      >
        Không lưu secret trong ứng dụng.
      </Text>
    </View>
  );
}
