import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

// Shared mobile presentation baseline (presentation only, no behavior change).
// Literal hex values mirror the approved CivicOS Light/Blue baseline:
// canvas #F8FAFC, surface #FFFFFF, accent #075985, focus #1D4ED8 and the
// semantic success/warning/danger/info/simulated colors. React Native has no
// CSS variables, so screens reuse this module instead of copying values.
export const mobileBaseline = {
  color: {
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    text: '#172033',
    textMuted: '#475569',
    border: '#CBD5E1',
    focus: '#1D4ED8',
    accent: '#075985',
    accentHover: '#0C4A6E',
    success: '#166534',
    warning: '#854D0E',
    danger: '#B91C1C',
    info: '#1E40AF',
    simulatedBg: '#FFF7ED',
    simulatedText: '#9A3412',
    mapFill: '#38BDF8',
    mapStroke: '#075985',
  },
  font: {
    sans: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    mono: 'monospace',
  },
  size: {
    caption: 12,
    label: 14,
    body: 16,
    section: 20,
    title: 20,
    bodyLine: 24,
  },
  space: {
    s1: 4,
    s2: 8,
    s3: 12,
    s4: 16,
    s6: 24,
    s8: 32,
    s12: 48,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
  },
  controlMin: 44,
} as const;

export type DataState =
  | 'loading'
  | 'empty'
  | 'ready'
  | 'warning'
  | 'stale'
  | 'error'
  | 'forbidden'
  | 'masked'
  | 'offline'
  | 'simulated';

const STATE_COPY: Record<DataState, string> = {
  loading: 'Đang tải',
  empty: 'Chưa có dữ liệu',
  ready: 'Sẵn sàng',
  warning: 'Cảnh báo',
  stale: 'Dữ liệu có thể đã cũ',
  error: 'Không thể tải dữ liệu',
  forbidden: 'Bạn không có quyền xem dữ liệu này',
  masked: 'Thông tin đã được che',
  offline: 'Đang ngoại tuyến',
  simulated:
    'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
};

export function stateLabel(state: DataState): string {
  return STATE_COPY[state];
}

// Text/icon pair for every state: status is never carried by color alone.
const STATE_ICON: Record<DataState, string> = {
  loading: '◌',
  empty: '○',
  ready: '●',
  warning: '▲',
  stale: '▲',
  error: '⚠',
  forbidden: '⊘',
  masked: '◐',
  offline: 'ℹ',
  simulated: 'ℹ',
};

export function stateIcon(state: DataState): string {
  return STATE_ICON[state];
}

const STATE_COLOR: Record<DataState, string> = {
  loading: mobileBaseline.color.info,
  empty: mobileBaseline.color.textMuted,
  ready: mobileBaseline.color.success,
  warning: mobileBaseline.color.warning,
  stale: mobileBaseline.color.warning,
  error: mobileBaseline.color.danger,
  forbidden: mobileBaseline.color.danger,
  masked: mobileBaseline.color.info,
  offline: mobileBaseline.color.info,
  simulated: mobileBaseline.color.simulatedText,
};

export function stateColor(state: DataState): string {
  return STATE_COLOR[state];
}

const STATE_HINT: Partial<Record<DataState, string>> = {
  warning: 'Tải lại dữ liệu để xem bản mới nhất.',
  stale: 'Tải lại dữ liệu để xem bản mới nhất.',
  offline: 'Kiểm tra kết nối rồi thử lại.',
};

export function StateMessage({
  state,
  retry,
}: {
  state: DataState;
  retry?: () => void;
}) {
  const color = stateColor(state);
  const background =
    state === 'simulated'
      ? mobileBaseline.color.simulatedBg
      : mobileBaseline.color.surface;
  return (
    <View
      accessibilityRole={state === 'error' ? 'alert' : 'none'}
      style={{
        padding: mobileBaseline.space.s3,
        gap: mobileBaseline.space.s2,
        backgroundColor: background,
        borderColor: color,
        borderWidth: 1,
        borderRadius: mobileBaseline.radius.md,
      }}
    >
      <Text
        style={{
          fontFamily: mobileBaseline.font.sans,
          fontSize: mobileBaseline.size.body,
          lineHeight: mobileBaseline.size.bodyLine,
          color,
        }}
      >
        <Text>{stateIcon(state)} </Text>
        {stateLabel(state)}
      </Text>
      {STATE_HINT[state] ? (
        <Text
          style={{
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.label,
            color: mobileBaseline.color.textMuted,
          }}
        >
          {STATE_HINT[state]}
        </Text>
      ) : null}
      {retry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thử lại"
          onPress={retry}
          style={{
            minHeight: mobileBaseline.controlMin,
            minWidth: mobileBaseline.controlMin,
            padding: mobileBaseline.space.s2,
            borderColor: color,
            borderWidth: 1,
            borderRadius: mobileBaseline.radius.sm,
            backgroundColor: mobileBaseline.color.surface,
          }}
        >
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color,
            }}
          >
            Thử lại
          </Text>
        </Pressable>
      )}
    </View>
  );
}
export function OfflineBanner() {
  return (
    <View
      style={{
        padding: mobileBaseline.space.s2,
        gap: mobileBaseline.space.s1,
        backgroundColor: mobileBaseline.color.surface,
        borderColor: mobileBaseline.color.info,
        borderWidth: 1,
        borderRadius: mobileBaseline.radius.sm,
      }}
    >
      <Text
        accessibilityLabel="offline-banner"
        style={{
          fontFamily: mobileBaseline.font.sans,
          fontSize: mobileBaseline.size.label,
          color: mobileBaseline.color.info,
        }}
      >
        <Text>ℹ </Text>Đang ngoại tuyến · chỉ xem basemap/cache
      </Text>
    </View>
  );
}
export function MaskedValue({
  value,
  masked,
}: {
  value?: string;
  masked?: boolean;
}) {
  return (
    <Text
      accessibilityLabel={masked ? 'masked-value' : undefined}
      style={{
        fontFamily: mobileBaseline.font.sans,
        fontSize: mobileBaseline.size.body,
        lineHeight: mobileBaseline.size.bodyLine,
        color: mobileBaseline.color.textMuted,
      }}
    >
      {masked ? '***' : (value ?? '—')}
    </Text>
  );
}
