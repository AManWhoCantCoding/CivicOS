import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  focusApiUrl,
  focusBoundsCenter,
  focusMapUrl,
  focusParcelDetailUrl,
  focusScreenReaderLabel,
  isFocusPolygonGeometry,
  mapFocusStatus,
  readFocusProjection,
} from '@/components/map/land-parcel-focus';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const parcelBody = {
  parcel: {
    id: 'parcel-001',
    parcelCode: 'PARCEL-001',
    mapSheetNumber: '12',
    parcelNumber: '34',
    status: 'active',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [105.98, 20.95],
          [105.982, 20.95],
          [105.982, 20.952],
          [105.98, 20.952],
          [105.98, 20.95],
        ],
        [
          [105.9805, 20.9505],
          [105.981, 20.9505],
          [105.981, 20.951],
          [105.9805, 20.951],
          [105.9805, 20.9505],
        ],
      ],
    },
    updatedAt: '2026-10-02T00:00:00.000Z',
  },
  simulated: true,
  projection: 'land-parcel-map',
};

// T-003 AC-1: detail PARCEL-001 → Xem trên bản đồ → /map?parcelId=...
// → đúng một Polygon focus; URL không có geometry/PII/token.
describe('T-003 AC-1 navigates with parcelId and renders one focused LandParcel', () => {
  it('navigates with parcelId and renders one focused LandParcel', () => {
    expect(focusMapUrl('parcel-001')).toBe('/map?parcelId=parcel-001');
    const url = new URL(focusMapUrl('parcel-001'), 'https://civicos.local');
    expect([...url.searchParams.keys()]).toEqual(['parcelId']);
    expect(focusMapUrl('parcel 001/ă')).toBe(
      `/map?parcelId=${encodeURIComponent('parcel 001/ă')}`,
    );
  });

  it('reads one focused projection preserving holes and multiple rings', () => {
    const projection = readFocusProjection(parcelBody);
    expect(projection?.parcel.id).toBe('parcel-001');
    expect(projection?.parcel.geometry.type).toBe('Polygon');
    // Giữ đúng GeoJSON hợp lệ, không flatten thành ring đơn (EC-LPM-07).
    expect(projection?.parcel.geometry.coordinates).toEqual(
      parcelBody.parcel.geometry.coordinates,
    );
    expect(projection?.simulated).toBe(true);
    expect(projection?.projection).toBe('land-parcel-map');
  });

  it('exposes the map entry from parcel detail with only parcelId', () => {
    const detail = readSource('src/components/land/ParcelDetail.tsx');
    expect(detail).toContain('Xem trên bản đồ');
    expect(detail).toContain('Xem thửa đất trên bản đồ');
    expect(detail).toContain('focusMapUrl');
    expect(detail).not.toMatch(/\/map\?.*(geometry|token|policy)/i);
    expect(detail).not.toContain('policyOverride');
  });

  it('exposes the map entry from parcel list with only parcelId', () => {
    const list = readSource('src/components/land/ParcelList.tsx');
    expect(list).toContain('Xem trên bản đồ');
    expect(list).toContain('focusMapUrl');
    expect(list).toContain('aria-label');
    // Existing detail link behavior unchanged.
    expect(list).toContain('/land/parcels/');
    // Map entry carries only parcelId via the shared helper.
    expect(list).not.toMatch(/\/map\?.*(geometry|token|policy)/i);
    expect(list).not.toContain('policyOverride');
    expect(list).not.toMatch(/method:\s*['"]POST['"]/);
    expect(list).not.toMatch(/method:\s*['"]PUT['"]/);
    expect(list).not.toMatch(/method:\s*['"]PATCH['"]/);
    expect(list).not.toMatch(/method:\s*['"]DELETE['"]/);
  });

  it('passes only parcelId from the map page to the workspace', () => {
    const page = readSource('src/app/map/page.tsx');
    expect(page).toContain('parcelId');
    expect(page).toContain('initialParcelId');
    // Query context chỉ đọc parcelId, không giữ geometry/PII/token.
    const accessed = [...page.matchAll(/query\.(\w+)/g)].map((m) => m[1]);
    expect(accessed).toContain('parcelId');
    expect(new Set(accessed)).toEqual(new Set(['parcelId']));
    expect(page).not.toMatch(/[?&](geometry|token)=/);
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('focusApiUrl');
    expect(readSource('src/components/map/land-parcel-focus.ts')).toContain(
      '/api/map/land-parcels',
    );
  });
});

// T-003 AC-2: selection mở /land/parcels/{parcelId}, detail server-check,
// không mutation.
describe('T-003 AC-2 opens parcel detail from accessible selection and never mutates', () => {
  it('opens parcel detail from accessible selection and never mutates', () => {
    expect(focusParcelDetailUrl('parcel-001')).toBe('/land/parcels/parcel-001');
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('Mở chi tiết thửa');
    expect(workspace).toContain('focusParcelDetailUrl');
    expect(workspace).toContain('Bỏ chọn');
    expect(workspace).toContain('Escape');
    expect(workspace).toContain('Chọn thửa đất trên bản đồ');
  });

  it('announces selection without relying on color alone', () => {
    const projection = readFocusProjection(parcelBody);
    expect(projection).not.toBeNull();
    if (!projection) return;
    expect(focusScreenReaderLabel(projection.parcel)).toBe(
      'Thửa PARCEL-001, tờ 12, thửa 34, trạng thái active, dữ liệu mô phỏng nội bộ',
    );
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('aria-live');
    expect(workspace).toContain('sr-only');
  });

  it('performs no mutation from the focus flow', () => {
    for (const file of [
      'src/components/map/MapWorkspace.tsx',
      'src/components/map/land-parcel-focus.ts',
      'src/app/map/page.tsx',
      'src/components/land/ParcelDetail.tsx',
    ]) {
      const source = readSource(file);
      expect(source).not.toMatch(/method:\s*['"]POST['"]/);
      expect(source).not.toMatch(/method:\s*['"]PUT['"]/);
      expect(source).not.toMatch(/method:\s*['"]PATCH['"]/);
      expect(source).not.toMatch(/method:\s*['"]DELETE['"]/);
    }
  });
});

// T-003 AC-3: chỉ allowlist + nhãn internal/simulated + freshness;
// không organization/address/party/rights/Evidence.
describe('T-003 AC-3 renders only allowlisted fields and internal/simulated label', () => {
  it('renders only allowlisted fields and internal/simulated label', () => {
    const projection = readFocusProjection({
      ...parcelBody,
      parcel: {
        ...parcelBody.parcel,
        organizationId: 'ou-secret',
        address: 'secret address',
      },
      extraTop: 'secret',
    });
    expect(projection).not.toBeNull();
    expect(Object.keys(projection ?? {}).sort()).toEqual([
      'parcel',
      'projection',
      'simulated',
    ]);
    expect(Object.keys(projection?.parcel ?? {}).sort()).toEqual(
      [
        'geometry',
        'id',
        'mapSheetNumber',
        'parcelCode',
        'parcelNumber',
        'status',
        'updatedAt',
      ].sort(),
    );
  });

  it('fails closed on non-polygon or repairable-looking geometry', () => {
    expect(
      readFocusProjection({
        ...parcelBody,
        parcel: {
          ...parcelBody.parcel,
          geometry: { type: 'Point', coordinates: [105.98, 20.95] },
        },
      }),
    ).toBeNull();
    expect(
      isFocusPolygonGeometry({
        type: 'Polygon',
        coordinates: [
          [
            [105.98, 20.95],
            [105.981, 20.95],
            [105.981, 20.951],
          ],
        ],
      }),
    ).toBe(false);
    expect(readFocusProjection({ ...parcelBody, simulated: false })).toBeNull();
  });

  it('shows the locked label, freshness and no legal-boundary claim', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    // JSX gộp whitespace khi render nên chuẩn hóa trước khi assert copy.
    const text = workspace.replace(/\s+/g, ' ');
    expect(workspace).toContain('internal / simulated');
    expect(text).toContain(
      'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
    );
    expect(workspace).toContain('Cập nhật');
    expect(workspace).not.toContain('certified');
    expect(workspace).not.toContain('legal boundary');
    const disclaimer = 'không phải ranh giới pháp lý chính thức';
    const flat = workspace.replace(/\s+/g, ' ');
    const total = flat.split('ranh giới pháp lý').length - 1;
    const allowed = flat.split(disclaimer).length - 1;
    expect(total).toBeGreaterThan(0);
    expect(total).toBe(allowed);
    for (const line of workspace.split('\n')) {
      if (line.toLowerCase().includes('official')) {
        expect(line.toLowerCase()).not.toMatch(/parcel|thửa|certified/);
      }
    }
  });

  it('never renders organization, address, party, rights or Evidence on the map', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const focus = readSource('src/components/map/land-parcel-focus.ts');
    for (const source of [workspace, focus]) {
      expect(source).not.toContain('organizationId');
      expect(source).not.toMatch(/[aA]ddress/);
      expect(source).not.toContain('Evidence');
      expect(source).not.toMatch(/party/i);
      expect(source).not.toMatch(/rights/i);
      expect(source).not.toContain('landUseType');
      expect(source).not.toContain('nationalRecordRef');
    }
  });

  it('maps focus errors to the locked Vietnamese states', () => {
    expect(mapFocusStatus(401, null)).toBe('forbidden');
    expect(mapFocusStatus(403, 'LAND_FORBIDDEN')).toBe('forbidden');
    expect(mapFocusStatus(403, 'LAND_ASSIGNMENT_REQUIRED')).toBe('forbidden');
    expect(mapFocusStatus(404, 'LAND_PARCEL_NOT_FOUND')).toBe('not-found');
    expect(mapFocusStatus(503, 'MAP_PROVIDER_UNAVAILABLE')).toBe('provider');
    expect(mapFocusStatus(503, 'MAP_LAYER_FAILED')).toBe('geometry');
    expect(mapFocusStatus(400, 'LAND_GEOMETRY_INVALID')).toBe('geometry');
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('Không được phép xem thửa đất này');
    expect(workspace).toContain('Không tìm thấy thửa đất');
    expect(workspace).toContain('Không thể hiển thị hình học thửa đất');
    expect(workspace).toContain('Bản đồ nền hiện không khả dụng');
    expect(workspace).toContain('Đang tải dữ liệu thửa đất…');
    expect(workspace).toContain('Chưa chọn thửa đất');
    expect(workspace).toContain('Dữ liệu bản đồ có thể đã cũ.');
    expect(workspace).toContain('Tải lại dữ liệu');
  });

  it('centers focus from every ring without deriving business area', () => {
    const projection = readFocusProjection(parcelBody);
    expect(projection).not.toBeNull();
    if (!projection) return;
    expect(focusBoundsCenter(projection.parcel.geometry)).toEqual({
      longitude: (105.98 + 105.982) / 2,
      latitude: (20.95 + 20.952) / 2,
    });
    expect(focusApiUrl('parcel-001')).toBe('/api/map/land-parcels/parcel-001');
  });

  it('renders one focused parcel with approved map tokens and no unsafe polygon', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const text = workspace.replace(/\s+/g, ' ');
    expect(workspace).toContain("'fill-color': '#38BDF8'");
    expect(workspace).toContain("'line-color': '#075985'");
    expect(workspace).not.toContain('#22d3ee');
    expect(workspace).not.toContain('#34d399');
    expect(workspace).not.toContain('#a78bfa');
    expect(workspace).toContain('Mở chi tiết thửa');
    expect(workspace).toContain('internal / simulated');
    expect(text).toContain(
      'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
    );
  });
});
