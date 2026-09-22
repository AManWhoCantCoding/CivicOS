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
  attemptedAt?: string;
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

function isSyncable(item: OfflineQueueItem) {
  if (item.status === 'pending' || item.status === 'failed') return true;
  if (item.status !== 'syncing') return false;
  return (
    !item.attemptedAt ||
    Date.now() - new Date(item.attemptedAt).getTime() > 5 * 60 * 1000
  );
}

function claimSyncSlot(id: string, task: () => Promise<void>): Promise<void> {
  const holder = globalThis.navigator as unknown as {
    locks?: {
      request: (name: string, task: () => Promise<void>) => Promise<void>;
    };
  };
  if (!holder.locks) return task();
  return holder.locks.request(`civicos:offline-sync:${id}`, task);
}

async function reconcileQueueItem(
  id: string,
  fallback: OfflineQueueItem,
): Promise<OfflineQueueItem> {
  try {
    const response = await fetch('/api/sync');
    if (!response.ok) return fallback;
    const body = (await response.json().catch(() => null)) as {
      commands?: unknown;
    };
    const commands = Array.isArray(body?.commands) ? body.commands : [];
    const match = commands.find(
      (command): command is Record<string, unknown> =>
        !!command &&
        typeof command === 'object' &&
        (command as Record<string, unknown>).clientCommandId === id,
    );
    if (!match) return fallback;
    const status = match.status;
    if (status !== 'synced' && status !== 'failed' && status !== 'rejected') {
      return (
        updateQueueItem(id, {
          status: 'pending',
          attemptedAt: undefined,
          error: undefined,
        }) ?? fallback
      );
    }
    return (
      updateQueueItem(id, {
        status,
        error: typeof match.error === 'string' ? match.error : undefined,
        response:
          match.response && typeof match.response === 'object'
            ? (match.response as Record<string, unknown>)
            : undefined,
      }) ?? fallback
    );
  } catch {
    return fallback;
  }
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
  updateQueueItem(item.id, {
    status: 'syncing',
    attemptedAt: new Date().toISOString(),
    error: undefined,
  });
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
    const serverError =
      serverCommand?.error ??
      (typeof body.error === 'string' ? body.error : undefined);
    if (!response.ok && serverError === 'OFFLINE_COMMAND_NOT_PENDING') {
      return reconcileQueueItem(item.id, item);
    }
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
        error: serverError ?? undefined,
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
  let current = item;
  await claimSyncSlot(item.id, async () => {
    const fresh = readQueue().find(
      (entry) => entry.id === item.id && isSyncable(entry),
    );
    if (!fresh) {
      current = readQueue().find((entry) => entry.id === item.id) ?? item;
      return;
    }
    current = await syncQueueItem(fresh);
  });
  return current;
}

async function reconcileWithServer(): Promise<void> {
  let commands: Record<string, unknown>[] = [];
  try {
    const response = await fetch('/api/sync');
    if (!response.ok) return;
    const body = (await response.json().catch(() => null)) as {
      commands?: unknown;
    };
    commands = (Array.isArray(body?.commands) ? body.commands : []).filter(
      (command): command is Record<string, unknown> =>
        !!command && typeof command === 'object',
    );
  } catch {
    return;
  }
  if (!commands.length) return;
  const byId = new Map(
    commands.map((command) => [command.clientCommandId as string, command]),
  );
  const queue = readQueue();
  let changed = false;
  const next = queue.map((item) => {
    const match = byId.get(item.id);
    if (!match) return item;
    const status = match.status as OfflineQueueStatus | undefined;
    if (status === 'synced' || status === 'failed' || status === 'rejected') {
      const error = typeof match.error === 'string' ? match.error : undefined;
      const response =
        match.response && typeof match.response === 'object'
          ? (match.response as Record<string, unknown>)
          : undefined;
      if (
        item.status === status &&
        item.error === error &&
        JSON.stringify(item.response ?? null) ===
          JSON.stringify(response ?? null)
      ) {
        return item;
      }
      changed = true;
      return { ...item, status, error, response };
    }
    if (item.status !== 'pending' || item.attemptedAt || item.error) {
      changed = true;
      return {
        ...item,
        status: 'pending' as OfflineQueueStatus,
        attemptedAt: undefined,
        error: undefined,
      };
    }
    return item;
  });
  if (changed) writeQueue(next);
}

export function syncOfflineQueue(): Promise<void> {
  if (activeSync) return activeSync;
  activeSync = claimSyncSlot('queue', async () => {
    if (!navigator.onLine) return;
    const capacity = readQueue().length + 2;
    for (let pass = 0; pass <= capacity; pass++) {
      const seen = new Set<string>();
      const queue = readQueue().filter((item) => {
        if (!isSyncable(item) || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      if (!queue.length) break;
      let progressed = false;
      for (const item of queue) {
        await claimSyncSlot(item.id, async () => {
          const fresh = readQueue().find(
            (entry) => entry.id === item.id && isSyncable(entry),
          );
          if (!fresh) return;
          await syncQueueItem(fresh);
          progressed = true;
        });
      }
      await reconcileWithServer();
      if (!readQueue().some((item) => isSyncable(item))) break;
      if (!progressed) break;
    }
  }).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

export const offlineQueueEventName = queueEvent;
