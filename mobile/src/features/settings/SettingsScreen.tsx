import React from 'react';
import { Text, View } from 'react-native';
import { apiBaseUrl } from '../../config';
import { mobileBaseline } from '../../components/States';
export function SettingsScreen() {
  return (
    <View
      style={{
        padding: mobileBaseline.space.s4,
        gap: mobileBaseline.space.s3,
        backgroundColor: mobileBaseline.color.canvas,
      }}
    >
      <View
        style={{
          backgroundColor: mobileBaseline.color.surface,
          borderColor: mobileBaseline.color.border,
          borderWidth: 1,
          borderRadius: mobileBaseline.radius.md,
          padding: mobileBaseline.space.s3,
          gap: mobileBaseline.space.s2,
        }}
      >
        <Text
          style={{
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.section,
            fontWeight: '600',
            color: mobileBaseline.color.text,
          }}
        >
          API runtime
        </Text>
        <View
          style={{
            backgroundColor: mobileBaseline.color.surfaceMuted,
            borderColor: mobileBaseline.color.border,
            borderWidth: 1,
            borderRadius: mobileBaseline.radius.sm,
            padding: mobileBaseline.space.s2,
          }}
        >
          <Text
            selectable
            style={{
              fontFamily: mobileBaseline.font.mono,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.text,
            }}
          >
            {apiBaseUrl()}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.label,
            lineHeight: mobileBaseline.size.bodyLine,
            color: mobileBaseline.color.textMuted,
          }}
        >
          Không lưu secret trong ứng dụng.
        </Text>
      </View>
    </View>
  );
}
