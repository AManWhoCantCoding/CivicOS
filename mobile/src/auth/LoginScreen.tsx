import React, { useState } from 'react';
import { Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { login } from '../api/session';
import { mobileBaseline } from '../components/States';
import { useSession } from './SessionContext';

export function LoginScreen() {
  const { refresh } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    try {
      setError(null);
      await login(email, password);
      await refresh();
    } catch {
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: mobileBaseline.color.canvas }}
    >
      <View
        style={{
          padding: mobileBaseline.space.s6,
          gap: mobileBaseline.space.s3,
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
          CivicOS · Đăng nhập
        </Text>
        <TextInput
          accessibilityLabel="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={{
            minHeight: mobileBaseline.controlMin,
            padding: mobileBaseline.space.s2,
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.body,
            color: mobileBaseline.color.text,
            backgroundColor: mobileBaseline.color.surface,
            borderColor: mobileBaseline.color.border,
            borderWidth: 1,
            borderRadius: mobileBaseline.radius.sm,
          }}
        />
        <TextInput
          accessibilityLabel="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            minHeight: mobileBaseline.controlMin,
            padding: mobileBaseline.space.s2,
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.body,
            color: mobileBaseline.color.text,
            backgroundColor: mobileBaseline.color.surface,
            borderColor: mobileBaseline.color.border,
            borderWidth: 1,
            borderRadius: mobileBaseline.radius.sm,
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void submit()}
          style={{
            minHeight: mobileBaseline.controlMin + 1,
            minWidth: mobileBaseline.controlMin,
            padding: mobileBaseline.space.s2,
            borderColor: mobileBaseline.color.accent,
            borderWidth: 1,
            borderRadius: mobileBaseline.radius.sm,
            backgroundColor: mobileBaseline.color.surface,
          }}
        >
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.accent,
            }}
          >
            Đăng nhập
          </Text>
        </Pressable>
        {error && (
          <Text
            accessibilityRole="alert"
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.danger,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
