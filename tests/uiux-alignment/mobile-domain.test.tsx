import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { deepLinkFor } from '../../mobile/src/navigation/deepLinks';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const map = () => readSource('mobile/src/features/map/MapScreen.tsx');
const relatedList = () =>
  readSource('mobile/src/features/related-info/RelatedInfoScreen.tsx');
const relatedDetail = () =>
  readSource('mobile/src/features/related-info/RelatedInfoDetail.tsx');
const alarm = () => readSource('mobile/src/features/alarm/AlarmScreen.tsx');
const dispatch = () =>
  readSource('mobile/src/features/dispatch/DispatchScreen.tsx');
const task = () => readSource('mobile/src/features/task/TaskScreen.tsx');
const incident = () =>
  readSource('mobile/src/features/incident/IncidentScreen.tsx');
const land = () => readSource('mobile/src/features/land/LandScreen.tsx');
const settings = () =>
  readSource('mobile/src/features/settings/SettingsScreen.tsx');
const navigator = () => readSource('mobile/src/navigation/AppNavigator.tsx');
const deepLinks = () => readSource('mobile/src/navigation/deepLinks.ts');
const states = () => readSource('mobile/src/components/States.tsx');
const writeGuard = () => readSource('mobile/src/components/WriteGuard.ts');

const allSurfaces = () => [
  map(),
  relatedList(),
  relatedDetail(),
  alarm(),
  dispatch(),
  task(),
  incident(),
  land(),
  settings(),
];

describe('T-012 mobile domain read-only', () => {
  it('keeps every operational tab reachable on the existing routes', () => {
    for (const route of [
      'Map',
      'RelatedInfo',
      'Alarms',
      'Dispatches',
      'Tasks',
      'Incident',
      'Land',
      'Settings',
    ]) {
      expect(navigator()).toContain(`'${route}'`);
    }
    expect(navigator()).not.toMatch(
      /'(Create|Update|CitizenIntake|Edit|Approve|Upload)'/,
    );
    expect(deepLinkFor({ incidentId: 'inc-1' })).toEqual({
      route: 'Incident',
      params: expect.objectContaining({ incidentId: 'inc-1' }),
    });
    expect(
      deepLinkFor({
        relatedInfo: { entityType: 'RESIDENT', id: 'res-1' },
      }),
    ).toEqual({
      route: 'RelatedInfoDetail',
      params: expect.objectContaining({
        relatedInfo: { entityType: 'RESIDENT', id: 'res-1' },
      }),
    });
    expect(navigator()).toContain('openMap(item, context)');
    expect(navigator()).toContain('openMap(undefined, context)');
    expect(navigator()).toContain('onOpenMap={openLandParcelOnMap}');
    expect(navigator()).toContain('onOpenLandDetail={openLandParcelDetail}');
    expect(navigator()).toContain('initialParcelCode={landParcelCode}');
    expect(navigator()).toContain('Đăng xuất');
  });

  it('keeps the read-only boundary with no mutation or public-intake control', () => {
    for (const source of allSurfaces()) {
      expect(source).not.toMatch(
        /Tạo hồ sơ|Tạo mới|Gửi hồ sơ|Phê duyệt|Từ chối|Đồng bộ|Phân công|submitOffline|public-intake|CitizenIntake/i,
      );
      expect(source).not.toMatch(/\bapprove\b|\bupload\b/i);
      expect(source).not.toContain('official');
      expect(source).not.toContain('certified');
      expect(source).not.toMatch(/#000000|#000\b|gradient|neon|glow/i);
    }
    expect(writeGuard()).toContain('READ_ONLY_MVP');
    expect(incident()).toContain('/api/incidents/');
    expect(land()).toContain('getPublicLandLookup');
  });

  it('applies the shared Light/Blue baseline and state grammar', () => {
    for (const source of allSurfaces()) {
      expect(source).toContain('mobileBaseline');
    }
    for (const source of [
      map(),
      relatedList(),
      relatedDetail(),
      alarm(),
      dispatch(),
      task(),
      incident(),
      land(),
    ]) {
      expect(source).toContain('minWidth');
      expect(source).toContain('accessibilityRole');
    }
    expect(states()).toContain('StateMessage');
    expect(states()).toContain('MaskedValue');
    expect(states()).toContain('OfflineBanner');
    expect(states()).toContain('controlMin: 44');
    for (const source of [
      relatedList(),
      relatedDetail(),
      incident(),
      alarm(),
      dispatch(),
      task(),
      land(),
      map(),
    ]) {
      expect(source).toContain('StateMessage');
      expect(source).toContain('OfflineBanner');
    }
    for (const source of [
      relatedList(),
      relatedDetail(),
      alarm(),
      dispatch(),
      task(),
      land(),
    ]) {
      expect(source).toContain('MaskedValue');
    }
    expect(relatedList()).toContain('Mở bản đồ');
    expect(relatedDetail()).toContain('‹ Quay lại');
    expect(relatedDetail()).toContain('Mở trên bản đồ');
    expect(incident()).toContain('Incident · chỉ đọc');
    expect(incident()).toContain('Mở trên bản đồ');
    expect(incident()).toContain('accessibilityLabel="Mở trên bản đồ"');
    expect(settings()).toContain('Không lưu secret trong ứng dụng.');
  });

  it('keeps map safe states with no offline polygon fallback', () => {
    expect(map()).toContain('land-parcel-focus-source');
    expect(map()).toContain('mobileBaseline.color.mapFill');
    expect(map()).toContain('mobileBaseline.color.mapStroke');
    expect(map()).toContain('internal / simulated');
    expect(map()).toContain('land-parcel-focus-panel');
    expect(map()).toContain(
      'Polygon thửa đất không được lưu trong bộ nhớ offline.',
    );
    expect(map()).toContain('Thử lại khi có kết nối');
    expect(map()).toContain('Quay lại bản đồ');
    expect(map()).toContain('isLandParcelFocusOffline()');
    expect(map()).toContain('setLandParcel(null)');
    expect(land()).toContain('Xem trên bản đồ');
    expect(land()).toContain('onOpenMap(parcel.id)');
    expect(land()).toContain('Mô phỏng');
  });

  it('hides raw API/PII/geometry disclosure behind safe fields', () => {
    expect(incident()).not.toContain('JSON.stringify');
    expect(incident()).not.toMatch(/informant|sourceContact|sourceName/i);
    expect(incident()).not.toMatch(/latitude|longitude/i);
    expect(incident()).not.toMatch(/geometry|events|approvals|audit/i);
    expect(incident()).toContain('readIncidentSummary');
    expect(incident()).toContain('Cập nhật:');
    for (const source of [
      relatedList(),
      relatedDetail(),
      alarm(),
      dispatch(),
      task(),
      land(),
      settings(),
    ]) {
      expect(source).not.toContain('JSON.stringify(body)');
    }
    expect(land()).toContain('maskedSubject');
  });

  it('blocks masked RelatedInfo geometry from map surfaces', () => {
    expect(relatedDetail()).toMatch(
      /!detail\.masked\s*&&\s*\(detail\.geometry/,
    );
    expect(relatedDetail()).toContain('!detail.masked && detail.geometry');
    expect(relatedDetail()).toContain('!detail.masked && detail.lat');
    expect(relatedDetail()).toContain('Mở trên bản đồ');
    expect(relatedDetail()).toContain('onOpenMap?.(detail)');
    expect(relatedDetail()).toContain('‹ Quay lại');
    expect(relatedList()).toContain('if (!item.masked) setMapItem(item)');
    expect(relatedList()).toContain(
      'visible={mapItem !== null && !mapItem.masked}',
    );
    expect(relatedList()).toContain('{mapItem && !mapItem.masked && (');
    expect(relatedList()).toContain(
      'if (mapItem && !mapItem.masked) onOpenMap?.(mapItem);',
    );
    expect(relatedList()).toContain('onPress={() => setSelected(item)}');
    expect(map()).toContain('if (item.masked) return null');
    expect(map()).toContain('land-parcel-focus-source');
    expect(map()).toContain('isLandParcelFocusOffline()');
  });
});
