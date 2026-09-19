import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { registerEventConsumer } from '@/modules/eventing';

export async function createInAppNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: string;
  sourceEventId?: string;
}) {
  if (input.sourceEventId) {
    const existing = await prisma.notification.findUnique({
      where: { sourceEventId: input.sourceEventId },
    });
    if (existing) return existing;
  }
  try {
    return await prisma.notification.create({ data: input });
  } catch (error) {
    if (
      input.sourceEventId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return prisma.notification.findUniqueOrThrow({
        where: { sourceEventId: input.sourceEventId },
      });
    }
    throw error;
  }
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

const notificationRegistration = globalThis as typeof globalThis & {
  civicosSlaNotificationConsumer?: boolean;
};

if (!notificationRegistration.civicosSlaNotificationConsumer) {
  registerEventConsumer(
    'SlaOverdue',
    async (event) => {
      const payload = event.payload as {
        userId?: string;
        resourceType?: string;
        resourceId?: string;
        kind?: string;
      };
      if (!payload.userId) return;
      await createInAppNotification({
        userId: payload.userId,
        type: 'sla_overdue',
        title: 'SLA quá hạn',
        body: `${payload.resourceType ?? 'Hồ sơ'} ${payload.resourceId ?? ''} đã quá hạn (${payload.kind ?? 'SLA'}).`,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        sourceEventId: event.eventId,
      });
    },
    'in-app-sla-overdue',
  );
  notificationRegistration.civicosSlaNotificationConsumer = true;
}
