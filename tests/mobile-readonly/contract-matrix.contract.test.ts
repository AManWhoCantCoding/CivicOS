import { describe, expect, it } from 'vitest';

import { resolveMobileLayers } from '@/modules/mobile-readonly/layers';
import {
  countRelatedInfo,
  getRelatedInfoDetail,
  searchRelatedInfo,
} from '@/modules/mobile-readonly/related-info';
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
  mobileOutsideDispatchId,
  mobileOutsideTaskId,
  mobileUsers,
} from './fixtures';
import {
  expectNoRawPii,
  expectListEnvelope,
  useMobileReadonlyFixture,
} from './helpers';
import * as alarmsRoute from '@/app/api/forces/alarms/route';
import * as dispatchesRoute from '@/app/api/forces/dispatches/route';
import * as dispatchDetailRoute from '@/app/api/forces/dispatches/[dispatchId]/route';
import * as tasksRoute from '@/app/api/forces/tasks/route';
import * as taskDetailRoute from '@/app/api/forces/tasks/[taskId]/route';
import * as tasksByDispatchRoute from '@/app/api/forces/tasksbydispatchid/route';
import * as layersRoute from '@/app/api/map/layers/route';
import * as searchRoute from '@/app/api/related-info/search/route';
import * as countsRoute from '@/app/api/related-info/counts/route';
import * as detailRoute from '@/app/api/related-info/[entityType]/[id]/route';

const describeWithDatabase = describe.skipIf(process.env.RUN_DB_TESTS !== '1');

describeWithDatabase('mobile contract matrix', () => {
  useMobileReadonlyFixture();

  it('checks layers, related-info, forces, boundaries, masking, and GET-only shape', async () => {
    const layers = await resolveMobileLayers(mobileUsers.inScope);
    expect(layers.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          visibleByDefault: expect.any(Boolean),
          entityTypes: expect.any(Array),
        }),
      ]),
    );
    await expect(
      resolveMobileLayers(mobileUsers.commanderWithoutAssignment),
    ).rejects.toThrow('FORBIDDEN');

    const relatedQuery = {
      q: 'active',
      entityType: 'BUSINESS' as const,
      status: 'active',
      page: 1,
      pageSize: 20,
    };
    const related = await searchRelatedInfo(mobileUsers.inScope, relatedQuery);
    expectListEnvelope(related);
    expect(related.data.map((item) => item.id)).toContain(
      mobileEntityIds.businessId,
    );
    expect(related.data.map((item) => item.id)).not.toContain(
      mobileEntityIds.crossBusinessId,
    );
    expect(related.data.map((item) => item.id)).not.toContain(
      mobileEntityIds.unassignedBusinessId,
    );
    expectNoRawPii(related);
    for (const [entityType, inScopeId, excludedIds] of [
      [
        'RESIDENT',
        mobileEntityIds.residentId,
        [mobileEntityIds.crossResidentId, mobileEntityIds.unassignedResidentId],
      ],
      [
        'BUSINESS',
        mobileEntityIds.businessId,
        [mobileEntityIds.crossBusinessId, mobileEntityIds.unassignedBusinessId],
      ],
      [
        'HOTSPOT',
        mobileEntityIds.hotspotId,
        [mobileEntityIds.crossHotspotId, mobileEntityIds.unassignedHotspotId],
      ],
      [
        'VIOLATION',
        mobileEntityIds.violationId,
        [
          mobileEntityIds.crossViolationId,
          mobileEntityIds.unassignedViolationId,
        ],
      ],
    ] as const) {
      const entity = await searchRelatedInfo(mobileUsers.inScope, {
        entityType,
        page: 1,
        pageSize: 20,
      });
      expect(entity.data).not.toHaveLength(0);
      expect(entity.data.map((item) => item.id)).toContain(inScopeId);
      expect(entity.data.map((item) => item.id)).not.toEqual(
        expect.arrayContaining([...excludedIds]),
      );
      expectNoRawPii(entity);
    }

    const counts = await countRelatedInfo(mobileUsers.inScope, relatedQuery);
    expect(Object.keys(counts).sort()).toEqual([
      'ALL',
      'BUSINESS',
      'HOTSPOT',
      'RESIDENT',
      'VIOLATION',
    ]);
    expect(counts).toEqual({
      ALL: 1,
      RESIDENT: 0,
      BUSINESS: 1,
      HOTSPOT: 0,
      VIOLATION: 0,
    });
    await expect(countRelatedInfo(mobileUsers.inScope, {})).resolves.toEqual({
      ALL: 4,
      RESIDENT: 1,
      BUSINESS: 1,
      HOTSPOT: 1,
      VIOLATION: 1,
    });
    await expect(
      getRelatedInfoDetail(
        mobileUsers.inScope,
        'BUSINESS',
        mobileEntityIds.unassignedBusinessId,
      ),
    ).rejects.toThrow('FORBIDDEN');

    const [alarms, dispatches, tasks] = await Promise.all([
      listAlarms(mobileUsers.inScope),
      listDispatches(mobileUsers.inScope, {}),
      listTasks(mobileUsers.inScope, {}),
    ]);
    expect(alarms.alarms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          incidentId: mobileEntityIds.hotspotId,
          resourceId: mobileEntityIds.hotspotId,
          coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
          relatedInfo: { entityType: 'HOTSPOT', id: mobileEntityIds.hotspotId },
          assignmentSummary: expect.any(Object),
        }),
      ]),
    );
    expectNoRawPii(alarms);
    expect(alarms.alarms.map((item) => item.resourceId)).not.toEqual(
      expect.arrayContaining([
        mobileEntityIds.crossHotspotId,
        mobileEntityIds.unassignedHotspotId,
      ]),
    );
    for (const result of [dispatches, tasks]) {
      expectListEnvelope(result);
      expect(result.data).not.toHaveLength(0);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          resourceId: expect.any(String),
          coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
          relatedInfo: expect.any(Object),
          assignmentSummary: expect.any(Object),
        }),
      );
      const violations = await searchRelatedInfo(mobileUsers.inScope, {
        entityType: 'VIOLATION',
        status: 'needs_action',
        page: 1,
        pageSize: 20,
      });
      expect(violations.total).toBe(1);
      expect(violations.data[0]).toMatchObject({
        id: mobileEntityIds.violationId,
        status: 'needs_action',
        metadata: {
          result: 'needs_action',
          checklistKey: 'safety',
          evidenceIds: [expect.stringContaining('synthetic-evidence-')],
        },
      });
      expectNoRawPii(violations);
      expectNoRawPii(result);
      expect(result.data.map((item) => item.resourceId)).not.toEqual(
        expect.arrayContaining([
          mobileEntityIds.crossHotspotId,
          mobileEntityIds.unassignedHotspotId,
        ]),
      );
    }

    await expect(
      listDispatches(mobileUsers.inScope, {
        dispatchId: mobileOutsideDispatchId,
      }),
    ).resolves.toMatchObject({ data: [], total: 0 });
    await expect(
      getDispatch(mobileUsers.inScope, mobileOutsideDispatchId),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      getTask(mobileUsers.inScope, mobileOutsideTaskId),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      getDispatch(mobileUsers.inScope, mobileForgedDispatchId),
    ).rejects.toThrow('FORBIDDEN');
    await expect(
      getTask(mobileUsers.inScope, mobileForgedTaskId),
    ).rejects.toThrow('FORBIDDEN');
    const [dispatchDetail, taskDetail] = await Promise.all([
      getDispatch(mobileUsers.inScope, mobileDispatchId),
      getTask(
        mobileUsers.inScope,
        mobileDispatchId.replace('dispatch:', 'task:'),
      ),
    ]);
    for (const detail of [dispatchDetail, taskDetail]) {
      expect(detail).toEqual(
        expect.objectContaining({
          coordinates: { lat: expect.any(Number), lng: expect.any(Number) },
          relatedInfo: expect.any(Object),
          assignmentSummary: expect.any(Object),
        }),
      );
    }
    expectNoRawPii([dispatchDetail, taskDetail]);
    await expect(
      listDispatches(mobileUsers.commanderWithoutAssignment, {}),
    ).resolves.toMatchObject({ data: [], total: 0 });
    await expect(
      getDispatch(mobileUsers.commanderWithoutAssignment, mobileDispatchId),
    ).rejects.toThrow('FORBIDDEN');

    for (const route of [
      alarmsRoute,
      dispatchesRoute,
      dispatchDetailRoute,
      tasksRoute,
      taskDetailRoute,
      tasksByDispatchRoute,
      layersRoute,
      searchRoute,
      countsRoute,
      detailRoute,
    ]) {
      expect(route.GET).toEqual(expect.any(Function));
      expect(route).not.toHaveProperty('POST');
      expect(route).not.toHaveProperty('PUT');
      expect(route).not.toHaveProperty('PATCH');
      expect(route).not.toHaveProperty('DELETE');
    }
  });
});
