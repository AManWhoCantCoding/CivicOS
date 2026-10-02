import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LAND_PARCEL_FOCUS_FILL,
  LAND_PARCEL_FOCUS_LINE,
  LAND_PARCEL_FOCUS_SOURCE,
} from '@/components/map/land-parcel-focus';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

// T-003 web regression: focused layer riêng, generic Incident/Inspection
// và map permission/provider behavior giữ nguyên.
describe('T-003 web map keeps a separate focused parcel layer', () => {
  it('renders the focused polygon on its own layer ids', () => {
    expect(LAND_PARCEL_FOCUS_SOURCE).toBe('land-parcel-focus');
    expect(LAND_PARCEL_FOCUS_FILL).toBe('land-parcel-focus-fill');
    expect(LAND_PARCEL_FOCUS_LINE).toBe('land-parcel-focus-line');
    for (const id of [
      LAND_PARCEL_FOCUS_SOURCE,
      LAND_PARCEL_FOCUS_FILL,
      LAND_PARCEL_FOCUS_LINE,
    ]) {
      expect(id).not.toContain('map-areas');
    }
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('land-parcel-focus');
    expect(workspace).toContain('focusApiUrl');
  });

  it('never merges LandParcel into the generic marker endpoint', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('/api/map/markers');
    expect(workspace).toContain('/api/map/config');
    const markersRoute = readSource('src/app/api/map/markers/route.ts');
    expect(markersRoute).not.toContain('land-parcels');
    expect(markersRoute).not.toContain('land-parcel');
    const platform = readSource('src/modules/platform/map/index.ts');
    expect(platform).not.toContain('land-parcels');
    expect(platform).not.toContain('land-parcel-focus');
  });

  it('preserves Incident/Inspection markers and generic map states', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('showIncidents');
    expect(workspace).toContain('showInspections');
    expect(workspace).toContain('showAreas');
    expect(workspace).toContain('Incident');
    expect(workspace).toContain('Inspection');
    expect(workspace).toContain('map-areas-fill');
    expect(workspace).toContain('map-areas-line');
    expect(workspace).toContain('OpenStreetMap');
    expect(workspace).toContain('realtime 30s');
    expect(workspace).toContain('MAP_OFFLINE_WRITE_BLOCKED');
    const page = readSource('src/app/map/page.tsx');
    expect(page).toContain("canEnterEntry(current, ['map-workspace'])");
    expect(page).toContain('Bản đồ nghiệp vụ');
  });
});

describe('T-003 web focus stays private, fresh and offline-safe', () => {
  it('fetches no-store, ignores stale responses and warns on stale data', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain("cache: 'no-store'");
    expect(workspace).toContain('focusSeq');
    expect(workspace).toContain('Dữ liệu bản đồ có thể đã cũ.');
    expect(workspace).toContain('Tải lại dữ liệu thửa đất');
  });

  it('never renders cached polygons offline and announces offline state', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain(
      'Đang ngoại tuyến. Không tải polygon thửa đất khi ngoại tuyến.',
    );
    expect(workspace).toContain('role="status"');
    expect(workspace).toContain('role="alert"');
    expect(workspace).toContain('aria-busy');
    expect(workspace).toContain('min-h-[44px]');
  });

  it('keeps forbidden and not-found messages generic', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain(
      'Bạn không có quyền xem nội dung này trong phạm vi hiện tại.',
    );
    expect(workspace).toContain(
      'Thửa đất không tồn tại hoặc không nằm trong phạm vi truy cập.',
    );
    expect(workspace).toContain('Quay lại danh sách thửa');
  });

  it('keeps the map entry readable with the locked Vietnamese copy', () => {
    const page = readSource('src/app/map/page.tsx');
    expect(page).toContain('Bản đồ thửa đất');
    const detail = readSource('src/components/land/ParcelDetail.tsx');
    expect(detail).toContain('Xem trên bản đồ');
  });
});
