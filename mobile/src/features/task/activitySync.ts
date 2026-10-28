import { ApiError, requestJson } from '../../api/client';
import {
  enqueue,
  readQueue,
  rejectCommand,
  removeCommand,
  clearQueue,
  isRejectedCommand,
  type OfflineCommand,
} from './activityQueue';

type SyncResponse = { command?: { status?: string } };

export async function syncFieldCommand(
  userId: string,
  command: OfflineCommand,
): Promise<'synced' | 'pending' | 'rejected'> {
  if (isRejectedCommand(userId, command.clientCommandId)) return 'rejected';
  enqueue(userId, command);
  try {
    const response = await requestJson<SyncResponse>('/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (response.command?.status === 'synced') {
      removeCommand(userId, command.clientCommandId);
      return 'synced';
    }
    if (response.command?.status === 'rejected') {
      rejectCommand(userId, command.clientCommandId);
      return 'rejected';
    }
    return 'pending';
  } catch (error) {
    if (
      error instanceof ApiError &&
      [400, 401, 403, 404, 409].includes(error.status)
    ) {
      if (error.status === 401) clearQueue(userId);
      else rejectCommand(userId, command.clientCommandId);
      return 'rejected';
    }
    return 'pending';
  }
}

/**
 * Result of one serialized queue-retry pass: `idle` (pending queue empty),
 * `synced` (every pending command synced), `pending`/`rejected` (the pass
 * stopped on the first command with that outcome; a rejected command can
 * leave the pending queue), `error` (an unexpected error propagated out of the retry pass).
 */
export type QueueRetryOutcome =
  | 'synced'
  | 'pending'
  | 'rejected'
  | 'idle'
  | 'error';

export async function retryFieldCommands(
  userId: string,
  isCurrent: () => boolean = () => true,
): Promise<QueueRetryOutcome> {
  const queued = readQueue(userId);
  if (!queued.length) return 'idle';
  for (const command of queued) {
    if (!isCurrent()) return 'idle';
    const result = await syncFieldCommand(userId, command);
    if (result !== 'synced') return result;
  }
  return 'synced';
}

export const syncResidentActivity = syncFieldCommand;
export const retryResidentActivities = retryFieldCommands;

export type QueueRetryRunner = { retry: (userId: string) => void; stop: () => void };

/**
 * Serializes queue retries and coalesces their triggers (the session/mount
 * effect and Android's restored-online event) so exactly one retry loop is in
 * flight at a time. A trigger arriving while a loop is in flight is not lost:
 * it schedules one follow-up pass, which re-reads the pending queue, so no
 * duplicate POST for a command happens inside a single pass.
 */
export function createQueueRetryRunner(
  onSettled?: (outcome: QueueRetryOutcome) => void,
): QueueRetryRunner {
  let inFlight = false;
  let queuedUserId: string | null = null;
  let active = true;
  let currentUserId: string | null = null;

  const attempt = async (userId: string) => {
    let outcome: QueueRetryOutcome = 'error';
    try {
      outcome = await retryFieldCommands(userId, () => active && currentUserId === userId);
    } catch {
      // Encrypted-queue errors keep the stored commands untouched; a later
      // connection event or screen re-entry retries them again.
    } finally {
      if (active) onSettled?.(outcome);
      if (!active) {
        queuedUserId = null;
        inFlight = false;
        return;
      }
      if (queuedUserId !== null) {
        const nextUserId = queuedUserId;
        queuedUserId = null;
        void attempt(nextUserId);
      } else {
        inFlight = false;
      }
    }
  };

  return {
    retry(userId: string) {
      active = true;
      currentUserId = userId;
      if (inFlight) {
        queuedUserId = userId;
        return;
      }
      inFlight = true;
      void attempt(userId);
    },
    stop() {
      active = false;
      currentUserId = null;
      queuedUserId = null;
    },
  };
}
