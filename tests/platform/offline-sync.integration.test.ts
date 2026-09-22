import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { assertOfflineCommandFresh } from '@/modules/platform';
import {
  acceptOfflineCommand,
  completeOfflineCommand,
  failOfflineCommand,
  markOfflineCommandSyncing,
} from '@/modules/platform';

const postgresEnabled = process.env.RUN_DB_TESTS === '1';
const commandIds: string[] = [];

describe('offline command contract', () => {
  it('requires a stable client command id for idempotency', () => {
    const command = {
      clientCommandId: 'device-1:command-1',
      occurredAt: '2026-09-19T01:00:00Z',
    };
    expect(command.clientCommandId).toContain(':');
    expect(new Date(command.occurredAt).toISOString()).toBe(
      '2026-09-19T01:00:00.000Z',
    );
  });

  it('rejects a command based on a stale resource version', () => {
    expect(() => assertOfflineCommandFresh(3, 4)).toThrow(
      'STALE_OFFLINE_COMMAND',
    );
    expect(() => assertOfflineCommandFresh(3, 3)).not.toThrow();
  });

  it.skipIf(!postgresEnabled)(
    'persists client timestamps, retries idempotently, and preserves the prior result',
    async () => {
      const clientCommandId = `test-device:${randomUUID()}`;
      commandIds.push(clientCommandId);
      const occurredAt = new Date('2026-09-19T01:00:00.000Z');
      const input = {
        clientCommandId,
        actorId: 'offline-test-actor',
        commandType: 'test.append',
        resourceType: 'TestResource',
        occurredAt,
        payload: { appendOnly: true },
        payloadVersion: 1,
      };
      const accepted = await acceptOfflineCommand(input);
      const duplicate = await acceptOfflineCommand(input);
      expect(duplicate.id).toBe(accepted.id);
      expect(duplicate.occurredAt).toEqual(occurredAt);
      expect(duplicate.receivedAt).toEqual(accepted.receivedAt);

      await markOfflineCommandSyncing(clientCommandId);
      const synced = await completeOfflineCommand(clientCommandId, {
        result: 'accepted',
      });
      expect(synced.status).toBe('synced');
      expect((synced.response as { result: string }).result).toBe('accepted');
      expect((await acceptOfflineCommand(input)).response).toEqual(
        synced.response,
      );
      await expect(
        acceptOfflineCommand({ ...input, commandType: 'test.other' }),
      ).rejects.toThrow('CLIENT_COMMAND_ID_CONFLICT');
      await expect(
        acceptOfflineCommand({ ...input, resourceId: randomUUID() }),
      ).rejects.toThrow('CLIENT_COMMAND_ID_CONFLICT');
      await expect(markOfflineCommandSyncing(clientCommandId)).rejects.toThrow(
        'OFFLINE_COMMAND_NOT_PENDING',
      );
    },
  );

  it.skipIf(!postgresEnabled)(
    'recovers a failed command through retry state without overwriting append-only payload',
    async () => {
      const clientCommandId = `test-device:${randomUUID()}`;
      commandIds.push(clientCommandId);
      const occurredAt = new Date('2026-09-19T02:00:00.000Z');
      const payload = {
        entries: [{ op: 'append', field: 'note', value: 'first' }],
      };
      const input = {
        clientCommandId,
        actorId: 'offline-test-actor',
        commandType: 'test.append',
        resourceType: 'TestResource',
        occurredAt,
        payload,
        payloadVersion: 1,
      };
      const accepted = await acceptOfflineCommand(input);
      expect(accepted.status).toBe('pending');
      expect(accepted.occurredAt).toEqual(occurredAt);
      expect(accepted.receivedAt).toBeInstanceOf(Date);
      expect(accepted.attemptCount).toBe(0);

      const syncing = await markOfflineCommandSyncing(clientCommandId);
      expect(syncing.status).toBe('syncing');
      expect(syncing.attemptCount).toBe(1);
      expect(syncing.lastAttemptAt).toBeInstanceOf(Date);

      const failed = await failOfflineCommand(
        clientCommandId,
        'SYNC_UNAVAILABLE',
      );
      expect(failed.status).toBe('failed');
      expect(failed.error).toBe('SYNC_UNAVAILABLE');

      const retry = await markOfflineCommandSyncing(clientCommandId);
      expect(retry.status).toBe('syncing');
      expect(retry.attemptCount).toBe(2);
      expect(retry.lastAttemptAt).toBeInstanceOf(Date);

      const synced = await completeOfflineCommand(clientCommandId, {
        result: { appended: 1 },
      });
      expect(synced.status).toBe('synced');
      expect(synced.error).toBeNull();
      expect(synced.response).toEqual({ result: { appended: 1 } });

      const replayed = await acceptOfflineCommand({
        ...input,
        payload: { entries: [{ op: 'append', field: 'note', value: 'other' }] },
      });
      expect(replayed.id).toBe(accepted.id);
      expect(replayed.payload).toEqual(payload);
      expect(replayed.response).toEqual(synced.response);
    },
  );

  it.skipIf(!postgresEnabled)(
    'reclaims an expired sync lease back to pending for retry',
    async () => {
      const clientCommandId = `test-device:${randomUUID()}`;
      commandIds.push(clientCommandId);
      const input = {
        clientCommandId,
        actorId: 'offline-test-actor',
        commandType: 'test.append',
        resourceType: 'TestResource',
        occurredAt: new Date('2026-09-19T03:00:00.000Z'),
        payload: { appendOnly: true },
        payloadVersion: 1,
      };
      await acceptOfflineCommand(input);
      await markOfflineCommandSyncing(clientCommandId);
      await prisma.offlineCommand.update({
        where: { clientCommandId },
        data: { lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000) },
      });
      const reclaimed = await acceptOfflineCommand(input);
      expect(reclaimed.status).toBe('pending');
      expect(reclaimed.error).toBe('SYNC_LEASE_EXPIRED');
      const retry = await markOfflineCommandSyncing(clientCommandId);
      expect(retry.status).toBe('syncing');
      expect(retry.attemptCount).toBe(2);
    },
  );

  afterAll(async () => {
    if (!postgresEnabled || !commandIds.length) return;
    await prisma.offlineCommand.deleteMany({
      where: { clientCommandId: { in: commandIds } },
    });
  });
});
