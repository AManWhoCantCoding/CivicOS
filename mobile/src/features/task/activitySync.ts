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

export async function retryFieldCommands(userId: string) {
  for (const command of readQueue(userId)) {
    const result = await syncFieldCommand(userId, command);
    if (result !== 'synced') break;
  }
}

export const syncResidentActivity = syncFieldCommand;
export const retryResidentActivities = retryFieldCommands;
