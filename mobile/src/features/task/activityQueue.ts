import { MMKVLoader } from 'react-native-mmkv-storage';

export type ResidentActivityCommand = {
  commandType: 'resident.record_activity';
  resourceType: 'SubjectManagementRecord';
  resourceId: string;
  clientCommandId: string;
  occurredAt: string;
  payloadVersion: 1;
  baseVersion: number;
  payload: { activityType: string; content: string; evaluation?: string };
};

export type InspectionCommand = {
  commandType:
    'inspection.start' | 'inspection.save_checklist' | 'inspection.finding';
  resourceType: 'Inspection';
  resourceId: string;
  clientCommandId: string;
  occurredAt: string;
  payloadVersion: 1;
  baseVersion: number;
  payload:
    | Record<string, never>
    | { responses: Array<{ key: string; value: string }> }
    | {
        checklistKey: string;
        description: string;
        result: string;
        severity?: string;
        category?: string;
      };
};
export type OfflineCommand = ResidentActivityCommand | InspectionCommand;
type QueueEntry = { command: OfflineCommand; status: 'pending' | 'rejected' };

const KEY = 'pending-resident-activities';
const LIMIT = 20;
let activeUser: string | null = null;
let store: ReturnType<MMKVLoader['initialize']> | null = null;

function storage(userId: string) {
  if (!userId) throw new Error('SECURE_QUEUE_UNAVAILABLE');
  if (activeUser !== userId || !store) {
    activeUser = userId;
    store = new MMKVLoader()
      .withInstanceID(`resident-activity-${encodeURIComponent(userId)}`)
      .withEncryption()
      .initialize();
  }
  return store;
}

function readEntries(userId: string): QueueEntry[] {
  const raw = storage(userId).getString(KEY);
  if (!raw) return [];
  const entries: unknown = JSON.parse(raw);
  if (!Array.isArray(entries) || entries.length > LIMIT)
    throw new Error('SECURE_QUEUE_UNAVAILABLE');
  return entries.map((entry) =>
    entry && typeof entry === 'object' && 'command' in entry
      ? (entry as QueueEntry)
      : { command: entry as OfflineCommand, status: 'pending' },
  );
}

function writeEntries(userId: string, entries: QueueEntry[]) {
  if (!storage(userId).setString(KEY, JSON.stringify(entries)))
    throw new Error('SECURE_QUEUE_UNAVAILABLE');
}

export function readQueue(userId: string): OfflineCommand[] {
  return readEntries(userId)
    .filter((entry) => entry.status === 'pending')
    .map((entry) => entry.command);
}

export function readRejected(userId: string): OfflineCommand[] {
  return readEntries(userId)
    .filter((entry) => entry.status === 'rejected')
    .map((entry) => entry.command);
}

export function isRejectedCommand(userId: string, id: string) {
  return readEntries(userId).some(
    (entry) =>
      entry.status === 'rejected' && entry.command.clientCommandId === id,
  );
}

export function rejectCommand(userId: string, id: string) {
  const entries = readEntries(userId).map((entry) =>
    entry.command.clientCommandId === id
      ? { ...entry, status: 'rejected' as const }
      : entry,
  );
  writeEntries(userId, entries);
}

export function nextInspectionVersion(
  userId: string,
  inspectionId: string,
  baseVersion: number,
) {
  return (
    baseVersion +
    readQueue(userId).filter(
      (entry) =>
        entry.resourceType === 'Inspection' &&
        entry.resourceId === inspectionId,
    ).length
  );
}

export function enqueue(userId: string, command: OfflineCommand) {
  const stored = readEntries(userId);
  const entries = stored.map((entry) => entry.command);
  if (
    entries.some((entry) => entry.clientCommandId === command.clientCommandId)
  )
    return entries;
  if (entries.length >= LIMIT) throw new Error('QUEUE_FULL');
  const updated = [...stored, { command, status: 'pending' as const }];
  writeEntries(userId, updated);
  return updated;
}

export function removeCommand(userId: string, id: string) {
  const updated = readEntries(userId).filter(
    (entry) => entry.command.clientCommandId !== id,
  );
  if (updated.length) writeEntries(userId, updated);
  else storage(userId).removeItem(KEY);
}

export function clearQueue(userId: string) {
  if (!userId) return;
  storage(userId).removeItem(KEY);
}
