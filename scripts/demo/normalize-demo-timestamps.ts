import type { Clock } from '@/modules/platform/clock';

type TimestampModel = {
  updateMany: (args: {
    where: { id: { in: string[] } };
    data: Record<string, Date>;
  }) => Promise<unknown>;
};

export type DemoTimestampClient = {
  user?: TimestampModel;
  organizationUnit?: TimestampModel;
  assignment?: TimestampModel;
  auditEvent?: TimestampModel;
  eventRecord?: TimestampModel;
  outboxMessage?: TimestampModel;
};

export type DemoTimestampRunKeys = {
  userIds?: string[];
  organizationUnitIds?: string[];
  assignmentIds?: string[];
  auditEventIds?: string[];
  eventRecordIds?: string[];
  outboxMessageIds?: string[];
};

export async function normalizeDemoTimestamps(
  client: DemoTimestampClient,
  clock: Clock,
  runKeys: DemoTimestampRunKeys,
): Promise<void> {
  const now = clock.now();
  if (runKeys.userIds?.length && client.user) {
    await client.user.updateMany({
      where: { id: { in: runKeys.userIds } },
      data: { createdAt: now, updatedAt: now },
    });
  }
  if (runKeys.organizationUnitIds?.length && client.organizationUnit) {
    await client.organizationUnit.updateMany({
      where: { id: { in: runKeys.organizationUnitIds } },
      data: { createdAt: now, updatedAt: now },
    });
  }
  if (runKeys.assignmentIds?.length && client.assignment) {
    await client.assignment.updateMany({
      where: { id: { in: runKeys.assignmentIds } },
      data: { grantedAt: now, createdAt: now, updatedAt: now },
    });
  }
  if (runKeys.auditEventIds?.length && client.auditEvent) {
    await client.auditEvent.updateMany({
      where: { id: { in: runKeys.auditEventIds } },
      data: { occurredAt: now },
    });
  }
  if (runKeys.eventRecordIds?.length && client.eventRecord) {
    await client.eventRecord.updateMany({
      where: { id: { in: runKeys.eventRecordIds } },
      data: { occurredAt: now, recordedAt: now },
    });
  }
  if (runKeys.outboxMessageIds?.length && client.outboxMessage) {
    await client.outboxMessage.updateMany({
      where: { id: { in: runKeys.outboxMessageIds } },
      data: { createdAt: now, availableAt: now },
    });
  }
}
