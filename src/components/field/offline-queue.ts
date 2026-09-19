'use client';

export type OfflineQueueStatus =
  'pending' | 'syncing' | 'failed' | 'rejected' | 'synced';

export type OfflineQueueItem = {
  id: string;
  commandType: string;
  resourceType: string;
  resourceId?: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  payloadVersion: number;
  baseVersion?: number;
  status: OfflineQueueStatus;
  error?: string;
  response?: Record<string, unknown>;
};

export type OfflineCommandRequest = Omit<
  OfflineQueueItem,
  'status' | 'error' | 'response'
>;

const queueKey = 'civicos:offline-queue';
const queueEvent = 'civicos:offline-queue';
let activeSync: Promise<void> | null = null;

function readQueue(): OfflineQueueItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem(queueKey) ?? '[]');
    return Array.isArray(stored) ? (stored as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineQueueItem[]) {
  localStorage.setItem(queueKey, JSON.stringify(queue.slice(-100)));
  window.dispatchEvent(new Event(queueEvent));
}

function updateQueueItem(
  id: string,
  update: Partial<OfflineQueueItem>,
): OfflineQueueItem | undefined {
  const queue = readQueue();
  let updated: OfflineQueueItem | undefined;
  const next = queue.map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...update };
    return updated;
  });
  writeQueue(next);
  return updated;
}

export function readOfflineQueue(): OfflineQueueItem[] {
  return readQueue();
}

function parseServerCommand(value: unknown): {
  status?: OfflineQueueStatus;
  error?: string | null;
  response?: Record<string, unknown> | null;
} | null {
  if (!value || typeof value !== 'object') return null;
  const command = value as Record<string, unknown>;
  return {
    status:
      typeof command.status === 'string'
        ? (command.status as OfflineQueueStatus)
        : undefined,
    error: typeof command.error === 'string' ? command.error : null,
    response:
      command.response && typeof command.response === 'object'
        ? (command.response as Record<string, unknown>)
        : null,
  };
}

async function syncQueueItem(
  item: OfflineQueueItem,
): Promise<OfflineQueueItem> {
  updateQueueItem(item.id, { status: 'syncing', error: undefined });
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientCommandId: item.id,
        commandType: item.commandType,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        occurredAt: item.occurredAt,
        payload: item.payload,
        payloadVersion: item.payloadVersion,
        baseVersion: item.baseVersion,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      command?: unknown;
      error?: unknown;
    };
    const serverCommand = parseServerCommand(body.command);
    const status: OfflineQueueStatus = serverCommand?.status
      ? serverCommand.status
      : response.ok
        ? 'synced'
        : response.status >= 500
          ? 'failed'
          : 'rejected';
    return (
      updateQueueItem(item.id, {
        status,
        error:
          serverCommand?.error ??
          (typeof body.error === 'string' ? body.error : undefined),
        response: serverCommand?.response ?? undefined,
      }) ?? { ...item, status }
    );
  } catch (error) {
    return (
      updateQueueItem(item.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'NETWORK_ERROR',
      }) ?? { ...item, status: 'failed' }
    );
  }
}

export async function submitOfflineCommand(
  request: OfflineCommandRequest,
): Promise<OfflineQueueItem> {
  const existing = readQueue().find((item) => item.id === request.id);
  if (existing?.status === 'synced' || existing?.status === 'rejected') {
    return existing;
  }

  const item: OfflineQueueItem = {
    ...request,
    status: 'pending',
  };
  const queue = readQueue().filter((entry) => entry.id !== item.id);
  queue.push(item);
  writeQueue(queue);

  if (!navigator.onLine) return item;
  return syncQueueItem(item);
}

export function syncOfflineQueue(): Promise<void> {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    if (!navigator.onLine) return;
    const queue = readQueue().filter(
      (item) => item.status === 'pending' || item.status === 'failed',
    );
    for (const item of queue) await syncQueueItem(item);
  })().finally(() => {
    activeSync = null;
  });
  return activeSync;
}

export const offlineQueueEventName = queueEvent;
