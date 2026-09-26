import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type DataState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'masked' | 'offline';
export function stateLabel(state: DataState): string {
  return {
    loading: 'Đang tải',
    empty: 'Chưa có dữ liệu',
    error: 'Không thể tải dữ liệu',
    forbidden: 'Bạn không có quyền xem dữ liệu này',
    masked: 'Thông tin đã được che',
    offline: 'Đang ngoại tuyến',
  }[state];
}
export function StateMessage({
  state,
  retry,
}: {
  state: DataState;
  retry?: () => void;
}) {
  return (
    <View style={{ padding: 16 }}>
      <Text>{stateLabel(state)}</Text>
      {retry && (
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={{ minHeight: 44, paddingTop: 12 }}
        >
          <Text>Thử lại</Text>
        </Pressable>
      )}
    </View>
  );
}
export function OfflineBanner() {
  return (
    <Text accessibilityLabel="offline-banner">
      Đang ngoại tuyến · chỉ xem basemap/cache
    </Text>
  );
}
export function MaskedValue({
  value,
  masked,
}: {
  value?: string;
  masked?: boolean;
}) {
  return <Text>{masked ? '***' : (value ?? '—')}</Text>;
}
