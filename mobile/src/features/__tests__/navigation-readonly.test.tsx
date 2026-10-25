import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../../features/map/MapScreen', () => ({
  MapScreen: () => null,
}));

import { routes } from '../../navigation/AppNavigator';

function readSource(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8');
}

describe('navigation remains read-only', () => {
  it('keeps the approved native route set in order', () => {
    expect([...routes]).toEqual([
      'Map',
      'RelatedInfo',
      'Alarms',
      'Dispatches',
      'Tasks',
      'Incident',
      'Land',
      'Settings',
    ]);
  });
  it('does not expose create, update, or citizen intake routes', () => {
    expect(routes).not.toEqual(
      expect.arrayContaining(['Create', 'Update', 'CitizenIntake']),
    );
  });
});

describe('CUI-003 read-only screens and approved task actions', () => {
  it('keeps shared presentation and navigation checks', () => {
    const relatedInfo = readSource('../related-info/RelatedInfoScreen.tsx');
    const detail = readSource('../related-info/RelatedInfoDetail.tsx');
    const alarm = readSource('../alarm/AlarmScreen.tsx');
    const dispatch = readSource('../dispatch/DispatchScreen.tsx');
    const task = readSource('../task/TaskScreen.tsx');
    for (const source of [relatedInfo, detail, alarm, dispatch, task]) {
      expect(source).toContain('mobileBaseline');
      expect(source).toContain('minWidth: 44');
      expect(source).toContain('MaskedValue');
    }
    for (const source of [relatedInfo, detail, alarm, dispatch]) {
      expect(source).not.toMatch(/Tạo mới|Xóa|submitOffline/i);
    }
    expect(
      [
        ...new Set(
          task.match(
            /\b(?:resident\.record_activity|inspection\.(?:start|save_checklist|finding))\b/g,
          ),
        ),
      ].sort(),
    ).toEqual(
      [
        'resident.record_activity',
        'inspection.start',
        'inspection.save_checklist',
        'inspection.finding',
      ].sort(),
    );
    expect(task).not.toContain('submitOffline');
    expect(relatedInfo).toContain('onOpenMap');
    expect(relatedInfo).toContain('Mở bản đồ');
    expect(detail).toContain('‹ Quay lại');
    expect(detail).toContain('onBack');
    expect(detail).toContain('Mở trên bản đồ');
    for (const source of [alarm, dispatch, task]) {
      expect(source).toContain('‹ Quay lại');
      expect(source).toContain('deepLinkFor');
      expect(source).toContain('onNavigate');
    }
  });
});
