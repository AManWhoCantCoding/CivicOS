import { describe, expect, it, vi } from 'vitest';

import { fixedClock } from '@/modules/platform/clock';
import { normalizeDemoTimestamps } from '../../scripts/demo/normalize-demo-timestamps';

describe('demo timestamp boundary', () => {
  it('updates only the run keys and never sends state or payload fields', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const client = {
      user: { updateMany },
      organizationUnit: { updateMany },
      assignment: { updateMany },
      auditEvent: { updateMany },
      eventRecord: { updateMany },
      outboxMessage: { updateMany },
    };

    await normalizeDemoTimestamps(client as never, fixedClock(new Date()), {
      userIds: ['demo-user'],
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['demo-user'] } },
      data: { createdAt: expect.any(Date), updatedAt: expect.any(Date) },
    });
    expect(updateMany.mock.calls[0]?.[0].data).not.toHaveProperty('status');
    expect(updateMany.mock.calls[0]?.[0].data).not.toHaveProperty('payload');
  });
});
