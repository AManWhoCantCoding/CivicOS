import { describe, expect, it } from 'vitest';

import * as alarms from '@/app/api/forces/alarms/route';
import * as dispatches from '@/app/api/forces/dispatches/route';
import * as dispatchDetail from '@/app/api/forces/dispatches/[dispatchId]/route';
import * as tasks from '@/app/api/forces/tasks/route';
import * as taskDetail from '@/app/api/forces/tasks/[taskId]/route';
import * as tasksByDispatch from '@/app/api/forces/tasksbydispatchid/route';
import * as layers from '@/app/api/map/layers/route';
import * as search from '@/app/api/related-info/search/route';
import * as counts from '@/app/api/related-info/counts/route';
import * as detail from '@/app/api/related-info/[entityType]/[id]/route';

describe('mobile read-only guard', () => {
  it('exports GET only on every mobile route', () => {
    for (const route of [
      alarms,
      dispatches,
      dispatchDetail,
      tasks,
      taskDetail,
      tasksByDispatch,
      layers,
      search,
      counts,
      detail,
    ]) {
      expect(route.GET).toEqual(expect.any(Function));
      expect(route).not.toHaveProperty('POST');
      expect(route).not.toHaveProperty('PUT');
      expect(route).not.toHaveProperty('PATCH');
      expect(route).not.toHaveProperty('DELETE');
    }
  });
});
