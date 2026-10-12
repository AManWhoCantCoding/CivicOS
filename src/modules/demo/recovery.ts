export const DEMO_RECOVERY_STATES = [
  'loading',
  'empty',
  'validation',
  'forbidden',
  'offline',
  'error',
  'masked',
  'simulated',
  'dependency-unavailable',
] as const;

export type DemoRecoveryState = (typeof DEMO_RECOVERY_STATES)[number];
export type DemoRecoverySurface = 'web' | 'mobile';
export type DemoRecoveryStatus = 'observed' | 'blocked' | 'failed';
export type DemoRecovery = {
  surface: DemoRecoverySurface;
  state: DemoRecoveryState | 'unknown';
  status: DemoRecoveryStatus;
  reason: string;
  label: string;
  explanation: string;
  affordances: { stop: true; replay: true };
};

type Copy = Omit<DemoRecovery, 'surface'>;
const affordances = { stop: true as const, replay: true as const };
const COPY: Record<DemoRecoveryState, Copy> = {
  loading: {
    state: 'loading',
    status: 'observed',
    reason: 'DEMO_STATE_LOADING',
    label: 'Đang tải',
    explanation: 'Đang tải; demo giữ nguyên trạng thái hiện tại.',
    affordances,
  },
  empty: {
    state: 'empty',
    status: 'observed',
    reason: 'DEMO_STATE_EMPTY',
    label: 'Chưa có dữ liệu',
    explanation: 'Chưa có dữ liệu; demo không tạo dữ liệu thay thế.',
    affordances,
  },
  validation: {
    state: 'validation',
    status: 'observed',
    reason: 'DEMO_STATE_VALIDATION',
    label: 'Dữ liệu chưa hợp lệ',
    explanation: 'Dữ liệu chưa hợp lệ; không bỏ qua kiểm tra.',
    affordances,
  },
  forbidden: {
    state: 'forbidden',
    status: 'observed',
    reason: 'DEMO_STATE_FORBIDDEN',
    label: 'Bạn không có quyền xem dữ liệu này',
    explanation:
      'Bạn không có quyền xem dữ liệu này; giữ nguyên quyền hiện có.',
    affordances,
  },
  offline: {
    state: 'offline',
    status: 'observed',
    reason: 'DEMO_STATE_OFFLINE',
    label: 'Đang ngoại tuyến',
    explanation: 'Đang ngoại tuyến; demo không tự gửi lại hoặc tạo dữ liệu.',
    affordances,
  },
  error: {
    state: 'error',
    status: 'failed',
    reason: 'DEMO_STATE_ERROR',
    label: 'Không thể tải dữ liệu',
    explanation:
      'Không thể tải dữ liệu; demo dừng an toàn và không hiển thị lỗi thô.',
    affordances,
  },
  masked: {
    state: 'masked',
    status: 'observed',
    reason: 'DEMO_STATE_MASKED',
    label: 'Thông tin đã được che',
    explanation:
      'Thông tin đã được che theo quyền hiện có; demo không giải-mặt nạ.',
    affordances,
  },
  simulated: {
    state: 'simulated',
    status: 'observed',
    reason: 'DEMO_STATE_SIMULATED',
    label: 'Dữ liệu mô phỏng',
    explanation:
      'Dữ liệu mô phỏng chỉ phục vụ trình diễn, không phải dữ liệu nghiệp vụ.',
    affordances,
  },
  'dependency-unavailable': {
    state: 'dependency-unavailable',
    status: 'blocked',
    reason: 'DEMO_DEPENDENCY_UNAVAILABLE',
    label: 'Phụ thuộc chưa sẵn sàng',
    explanation:
      'Phụ thuộc của demo chưa sẵn sàng; liên hệ operator để chuẩn bị trước khi chạy.',
    affordances,
  },
};
const UNKNOWN: Copy = {
  state: 'unknown',
  status: 'failed',
  reason: 'DEMO_STATE_UNKNOWN',
  label: 'Trạng thái chưa xác định',
  explanation:
    'Trạng thái không xác định; demo dừng an toàn để không hiển thị dữ liệu thô.',
  affordances,
};

export function resolveDemoRecovery(input: unknown): DemoRecovery {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    return { surface: 'web', ...UNKNOWN };
  const candidate = input as { surface?: unknown; state?: unknown };
  const surface = candidate.surface === 'mobile' ? 'mobile' : 'web';
  const state = candidate.state;
  return typeof state === 'string' &&
    (DEMO_RECOVERY_STATES as readonly string[]).includes(state)
    ? { surface, ...COPY[state as DemoRecoveryState] }
    : { surface, ...UNKNOWN };
}
