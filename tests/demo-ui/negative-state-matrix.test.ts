import { describe, expect, it } from 'vitest';

import { resolveDemoRecovery } from '@/modules/demo/recovery';
import { createDemoRunner } from '@/modules/demo/runner';
import { makeValidManifest } from './demo-manifest-fixture';

describe('T-010 negative state recovery', () => {
  it.each([
    ['loading', 'DEMO_STATE_LOADING', 'Đang tải'],
    ['empty', 'DEMO_STATE_EMPTY', 'Chưa có dữ liệu'],
    ['validation', 'DEMO_STATE_VALIDATION', 'Dữ liệu chưa hợp lệ'],
    ['forbidden', 'DEMO_STATE_FORBIDDEN', 'Bạn không có quyền xem dữ liệu này'],
    ['offline', 'DEMO_STATE_OFFLINE', 'Đang ngoại tuyến'],
    ['error', 'DEMO_STATE_ERROR', 'Không thể tải dữ liệu'],
    ['masked', 'DEMO_STATE_MASKED', 'Thông tin đã được che'],
    ['simulated', 'DEMO_STATE_SIMULATED', 'Dữ liệu mô phỏng'],
  ] as const)('maps %s to safe Vietnamese recovery', (state, reason, label) => {
    const result = resolveDemoRecovery({ surface: 'web', state });
    expect(result).toMatchObject({ state, reason, label });
    expect(result.explanation).toContain(label);
  });

  it('blocks unavailable dependencies without echoing hostile input', () => {
    const result = resolveDemoRecovery({
      surface: 'mobile',
      state: 'dependency-unavailable',
      dependency: 'worker',
      error: 'password=s3cret <script>alert(1)</script>',
    });
    expect(result.status).toBe('blocked');
    expect(result.reason).toBe('DEMO_DEPENDENCY_UNAVAILABLE');
    expect(JSON.stringify(result)).not.toContain('s3cret');
    expect(JSON.stringify(result)).not.toContain('script');
  });

  it('uses a fixed fallback for unknown or hostile input', () => {
    const result = resolveDemoRecovery({
      state: 'DROP TABLE users',
      payload: 'secret',
    });
    expect(result).toMatchObject({
      state: 'unknown',
      reason: 'DEMO_STATE_UNKNOWN',
    });
    expect(JSON.stringify(result)).not.toContain('DROP');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('normalizes executor surface metadata without adding lifecycle ownership', async () => {
    const events: unknown[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [{ id: 'step-1', action: 'click' }],
      }),
      executor: () => ({
        status: 'settled' as const,
        surface: 'mobile',
        surfaceState: 'dependency-unavailable',
        reason: 'raw secret payload',
      }),
      onEvent: (event) => events.push(event),
    });
    await runner.start();
    expect(runner.getState()).toBe('blocked');
    expect(events[0]).toMatchObject({
      status: 'blocked',
      reason: 'DEMO_DEPENDENCY_UNAVAILABLE',
      surface: 'mobile',
      surfaceState: 'dependency-unavailable',
    });
    expect(JSON.stringify(events)).not.toContain('secret');
  });
});
