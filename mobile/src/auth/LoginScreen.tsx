import React, { useState } from 'react';
import { Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { login } from '../api/session';
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
    <SafeAreaView>
      <View style={{ padding: 24, gap: 12 }}>
        <Text>CivicOS · Đăng nhập</Text>
        <TextInput
          accessibilityLabel="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          accessibilityLabel="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void submit()}
          style={{ minHeight: 44 }}
        >
          <Text>Đăng nhập</Text>
        </Pressable>
        {error && <Text>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}
