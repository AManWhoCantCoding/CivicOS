import { forcePaths } from '../forces';

describe('forces read paths', () => {
  it('includes task detail and source-compatible alias', () => {
    expect(forcePaths.task('t1')).toBe('/api/forces/tasks/t1');
    expect(forcePaths.tasksByDispatch('d1')).toBe(
      '/api/forces/tasksbydispatchid?dispatchId=d1',
    );
  });
});
