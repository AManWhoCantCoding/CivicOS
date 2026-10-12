import type { DataState } from '../components/States';

export type NativeRecoveryState =
  DataState | 'dependency-unavailable' | 'unknown';
export type NativeRecovery = {
  surface: 'mobile';
  state: NativeRecoveryState;
  status: 'observed' | 'blocked' | 'failed';
  reason: string;
  label: string;
  explanation: string;
  affordances: { stop: true; replay: true };
};

const affordances = { stop: true as const, replay: true as const };
const COPY: Partial<Record<DataState, Omit<NativeRecovery, 'surface'>>> = {
  loading: {
    state: 'loading',
    status: 'observed',
    reason: 'DEMO_STATE_LOADING',
    label: 'Đang tải',
    explanation: 'Bề mặt đang tải; giữ nguyên trạng thái mobile hiện có.',
    affordances,
  },
  empty: {
    state: 'empty',
    status: 'observed',
    reason: 'DEMO_STATE_EMPTY',
    label: 'Chưa có dữ liệu',
    explanation: 'Bề mặt chưa có dữ liệu; không tạo dữ liệu thay thế.',
    affordances,
  },
  error: {
    state: 'error',
    status: 'failed',
    reason: 'DEMO_STATE_ERROR',
    label: 'Không thể tải dữ liệu',
    explanation: 'Bề mặt báo lỗi; không hiển thị lỗi thô.',
    affordances,
  },
  forbidden: {
    state: 'forbidden',
    status: 'observed',
    reason: 'DEMO_STATE_FORBIDDEN',
    label: 'Không có quyền truy cập',
    explanation: 'Giữ nguyên quyền truy cập hiện có.',
    affordances,
  },
  offline: {
    state: 'offline',
    status: 'observed',
    reason: 'DEMO_STATE_OFFLINE',
    label: 'Đang ngoại tuyến',
    explanation: 'Đang ngoại tuyến; chỉ giữ semantics xem hiện có.',
    affordances,
  },
  masked: {
    state: 'masked',
    status: 'observed',
    reason: 'DEMO_STATE_MASKED',
    label: 'Thông tin đã được che',
    explanation: 'Thông tin được che theo quyền hiện có.',
    affordances,
  },
  simulated: {
    state: 'simulated',
    status: 'observed',
    reason: 'DEMO_STATE_SIMULATED',
    label: 'Dữ liệu mô phỏng',
    explanation: 'Dữ liệu mô phỏng không phải dữ liệu nghiệp vụ.',
    affordances,
  },
};
const UNKNOWN: Omit<NativeRecovery, 'surface'> = {
  state: 'unknown',
  status: 'failed',
  reason: 'DEMO_STATE_UNKNOWN',
  label: 'Trạng thái chưa xác định',
  explanation: 'Trạng thái không xác định; không hiển thị dữ liệu thô.',
  affordances,
};

export function resolveNativeRecovery(input: unknown): NativeRecovery {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    return { surface: 'mobile', ...UNKNOWN };
  const value = input as { state?: unknown; dependency?: unknown };
  if (
    value.state === 'unavailable' ||
    value.state === 'dependency-unavailable'
  ) {
    return {
      surface: 'mobile',
      state: 'dependency-unavailable',
      status: 'blocked',
      reason: 'DEMO_DEPENDENCY_UNAVAILABLE',
      label: 'Phụ thuộc chưa sẵn sàng',
      explanation:
        'Phụ thuộc mobile chưa sẵn sàng; liên hệ operator trước khi chạy.',
      affordances,
    };
  }
  const mapped =
    typeof value.state === 'string'
      ? COPY[value.state as DataState]
      : undefined;
  return mapped
    ? { surface: 'mobile', ...mapped }
    : { surface: 'mobile', ...UNKNOWN };
}
