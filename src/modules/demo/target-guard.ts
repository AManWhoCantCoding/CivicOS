import { resolveDemoTarget } from '../../../scripts/demo/demo-db';

export type DemoGuardState = 'ready' | 'blocked';
export type DemoGuardTarget = 'civicos' | 'unknown' | 'forbidden';

export type DemoTargetGuardInput = {
  demoModeEnabled: boolean;
  demoDatabaseUrl?: string;
  databaseUrl?: string;
};

export type DemoTargetGuardResult = {
  state: DemoGuardState;
  target: DemoGuardTarget;
  canStart: boolean;
  web: 'ready' | 'unavailable';
  reason: string;
  message: string;
};

const DEMO_SAFE_LABEL = 'civicos';

function blocked(
  target: DemoGuardTarget,
  reason: string,
  message: string,
): DemoTargetGuardResult {
  return {
    state: 'blocked',
    target,
    canStart: false,
    web: 'unavailable',
    reason,
    message,
  };
}

export function evaluateDemoTargetGuard(
  input: DemoTargetGuardInput,
): DemoTargetGuardResult {
  if (!input.demoModeEnabled) {
    return blocked(
      'unknown',
      'DEMO_MODE_DISABLED',
      'Chế độ demo đang tắt. Ứng dụng hoạt động như bình thường.',
    );
  }
  try {
    const target = resolveDemoTarget(input.databaseUrl, input.demoDatabaseUrl);
    if (target.dbName !== DEMO_SAFE_LABEL) {
      return blocked(
        'forbidden',
        'DEMO_TARGET_FORBIDDEN',
        'Target không phải demo. Runner bị chặn, không đăng nhập persona.',
      );
    }
    return {
      state: 'ready',
      target: DEMO_SAFE_LABEL,
      canStart: true,
      web: 'ready',
      reason: 'DEMO_TARGET_READY',
      message: `Target demo ${DEMO_SAFE_LABEL} đã sẵn sàng kiểm tra.`,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('DEMO_TARGET_LOCAL_ONLY')
    ) {
      return blocked(
        'forbidden',
        'DEMO_TARGET_LOCAL_ONLY',
        'Demo chỉ cho phép database civicos trên Docker Compose loopback:5432. Runner bị chặn, không đăng nhập persona.',
      );
    }
    if (
      error instanceof Error &&
      error.message.includes('DEMO_TARGET_CONFLICT')
    ) {
      return blocked(
        'forbidden',
        'DEMO_TARGET_CONFLICT',
        'DEMO_DATABASE_URL xung đột với DATABASE_URL runtime. Runner bị chặn, không đăng nhập persona.',
      );
    }
    if (
      error instanceof Error &&
      error.message.includes('DEMO_RESET_REFUSED')
    ) {
      return blocked(
        'forbidden',
        'DEMO_TARGET_FORBIDDEN',
        'Target không phải demo. Runner bị chặn, không đăng nhập persona.',
      );
    }
    if (
      error instanceof Error &&
      error.message.includes('DEMO_DATABASE_URL_REQUIRED')
    ) {
      return blocked(
        'unknown',
        'DEMO_TARGET_MISSING',
        'Thiếu target demo. Liên hệ operator để cấu hình trước khi chạy.',
      );
    }
    return blocked(
      'unknown',
      'DEMO_TARGET_INVALID',
      'Target demo sai định dạng. Liên hệ operator để cấu hình trước khi chạy.',
    );
  }
}
