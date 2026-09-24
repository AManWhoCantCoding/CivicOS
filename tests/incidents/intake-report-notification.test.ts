import { describe, expect, it } from 'vitest';

import { MockIntakeResultNotificationAdapter } from '@/modules/incidents/notification-adapter';

describe('MockIntakeResultNotificationAdapter', () => {
  it('tracks dispatch retries and preserves availableAt without PII', () => {
    const adapter = new MockIntakeResultNotificationAdapter();
    const availableAt = new Date('2026-10-14T08:00:00.000Z');
    const notification = {
      reportId: 'report-1',
      recipientId: 'opaque-recipient-1',
      body: 'Kết quả xử lý report-1',
      availableAt,
    };

    expect(adapter.dispatch(notification)).toMatchObject({ attempt: 1 });
    expect(adapter.retry(notification)).toMatchObject({ attempt: 2 });
    expect(adapter.attempts).toHaveLength(2);
    expect(
      adapter.attempts.every((attempt) => attempt.availableAt === availableAt),
    ).toBe(true);
    expect(JSON.stringify(adapter.attempts)).not.toContain('sourceName');
    expect(JSON.stringify(adapter.attempts)).not.toContain('sourceContact');
    expect(JSON.stringify(adapter.attempts)).not.toContain('sensitiveRef');
  });
});
