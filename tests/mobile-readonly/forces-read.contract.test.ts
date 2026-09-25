import { describe, expect, it, vi } from 'vitest';

import * as identity from '@/modules/identity';
import * as dispatchDetailRoute from '@/app/api/forces/dispatches/[dispatchId]/route';
import * as taskDetailRoute from '@/app/api/forces/tasks/[taskId]/route';
import {
  getDispatch,
  getTask,
  listAlarms,
  listDispatches,
  listTasks,
} from '@/modules/mobile-readonly/forces';
import {
  mobileDispatchId,
  mobileEntityIds,
  mobileForgedDispatchId,
  mobileForgedTaskId,
  mobileUsers,
} from './fixtures';
import { expectNoRawPii, useMobileReadonlyFixture } from './helpers';

describe('mobile forces read contract', () => {
  useMobileReadonlyFixture();
  it('keeps list views read-only, linked, and masked', async () => {
    const result = await Promise.all([
      listAlarms(mobileUsers.inScope),
      listDispatches(mobileUsers.inScope, {}),
      listTasks(mobileUsers.inScope, {}),
    ]);
    expectNoRawPii(result);
    const alarmIds = result[0].alarms.map((alarm) => alarm.resourceId);
    expect(alarmIds).not.toEqual(
      expect.arrayContaining([
        mobileEntityIds.crossHotspotId,
        mobileEntityIds.unassignedHotspotId,
      ]),
    );
    expect(result[0]).toEqual(
      expect.objectContaining({
        alarms: expect.arrayContaining([
          expect.objectContaining({
            coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
            relatedInfo: expect.any(Object),
            assignmentSummary: expect.any(Object),
          }),
        ]),
      }),
    );
    for (const envelope of [result[1], result[2]]) {
      expect(envelope.data).not.toHaveLength(0);
      for (const item of envelope.data) {
        expect(item).toEqual(
          expect.objectContaining({
            coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
            relatedInfo: expect.any(Object),
            assignmentSummary: expect.any(Object),
          }),
        );
      }
      expect(envelope.data.map((item) => item.resourceId)).not.toEqual(
        expect.arrayContaining([
          mobileEntityIds.crossHotspotId,
          mobileEntityIds.unassignedHotspotId,
        ]),
      );
    }
    const [dispatch, task] = await Promise.all([
      getDispatch(mobileUsers.inScope, mobileDispatchId),
      getTask(
        mobileUsers.inScope,
        mobileDispatchId.replace('dispatch:', 'task:'),
      ),
    ]);
    for (const item of [dispatch, task]) {
      expect(item).toEqual(
        expect.objectContaining({
          coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
          relatedInfo: expect.any(Object),
          assignmentSummary: expect.any(Object),
        }),
      );
    }
    expectNoRawPii([dispatch, task]);
    vi.spyOn(identity, 'getCurrentUser').mockResolvedValue(mobileUsers.inScope);
    const [dispatchResponse, taskResponse] = await Promise.all([
      dispatchDetailRoute.GET(new Request('http://localhost'), {
        params: Promise.resolve({ dispatchId: mobileDispatchId }),
      }),
      taskDetailRoute.GET(new Request('http://localhost'), {
        params: Promise.resolve({
          taskId: mobileDispatchId.replace('dispatch:', 'task:'),
        }),
      }),
    ]);
    expect(dispatchResponse.status).toBe(200);
    expect(taskResponse.status).toBe(200);
    expectNoRawPii([
      await dispatchResponse.clone().json(),
      await taskResponse.clone().json(),
    ]);
    const [outsideDispatchResponse, outsideTaskResponse] = await Promise.all([
      dispatchDetailRoute.GET(new Request('http://localhost'), {
        params: Promise.resolve({ dispatchId: mobileForgedDispatchId }),
      }),
      taskDetailRoute.GET(new Request('http://localhost'), {
        params: Promise.resolve({ taskId: mobileForgedTaskId }),
      }),
    ]);
    expect(outsideDispatchResponse.status).toBe(403);
    expect(outsideTaskResponse.status).toBe(403);
    await expect(
      getDispatch(mobileUsers.inScope, mobileForgedDispatchId),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      getTask(mobileUsers.inScope, mobileForgedTaskId),
    ).rejects.toThrow('FORBIDDEN');
  });
});
