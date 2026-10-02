import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

// T-008 P1 web discovery UI contract (screen-14 + local prototype): idle
// until a bounded query, validation, multiple selection, cursor next/reset,
// and every fail-closed state. Source assertions follow the T-003/T-004
// pattern because MapWorkspace is a client component.
describe('T-008 web discovery stays idle until a bounded query', () => {
  it('renders the filter-first workspace with reset and no auto-load', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('Khám phá thửa đất trong phạm vi');
    expect(workspace).toContain(
      'Nhập ít nhất một bộ lọc hoặc thu hẹp vùng bản đồ trước khi tìm.',
    );
    expect(workspace).toContain('Tìm thửa đất');
    expect(workspace).toContain('Đặt lại');
    expect(workspace).toContain('discovery-parcel-code');
    expect(workspace).toContain('discovery-map-sheet');
    expect(workspace).toContain('discovery-parcel-number');
    expect(workspace).toContain('discovery-commune-code');
    expect(workspace).toContain('discovery-status');
    expect(workspace).toContain('discovery-min-lng');
    expect(workspace).toContain('Giới hạn CADN');
    const guard = workspace.slice(
      workspace.indexOf('function buildDiscoverySearch'),
      workspace.indexOf('function readDiscoveryItems'),
    );
    expect(guard).toContain('{ idle: true }');
    expect(guard).toContain('CADN_BOUNDS');
    expect(guard).toContain('DISCOVERY_STATUSES');
  });

  it('fetches the discovery route only after validation, never unbounded', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain("'/api/map/land-parcels'");
    expect(workspace).not.toContain('/api/map/land-parcels?parcelId=');
    const runner = workspace.slice(
      workspace.indexOf('const runDiscovery = useCallback'),
      workspace.indexOf('const revalidateDiscovery = useCallback'),
    );
    expect(runner.indexOf('buildDiscoverySearch(')).toBeLessThan(
      runner.indexOf('fetch(`${DISCOVERY_API}?${built.search}`'),
    );
    expect(runner).toContain("cache: 'no-store'");
    expect(runner).toContain('discoverySeq.current !== seq');
    expect(runner).toContain('if (!window.navigator.onLine)');
  });

  it('resets and binds the cursor when filters change', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('Trang tiếp');
    expect(workspace).toContain('Trang trước');
    expect(workspace).toContain('Reset cursor');
    expect(workspace).toContain('discoveryHistory');
    expect(workspace).toContain(
      'Trang kết quả không còn phù hợp với bộ lọc hiện tại. Hãy tìm lại.',
    );
    const reset = workspace.slice(
      workspace.indexOf('const resetDiscoveryPage = useCallback'),
      workspace.indexOf('const updateDiscoveryFilter = useCallback'),
    );
    expect(reset).toContain('setDiscoveryCursor(null)');
    expect(reset).toContain('setDiscoveryHistory([])');
    expect(reset).toContain("setDiscoveryStatus('idle')");
    expect(workspace).toContain('updateDiscoveryFilter');
    expect(workspace).toContain('updateDiscoveryBox');
  });
});

describe('T-008 web discovery selection and states', () => {
  it('supports multiple result selection with a server re-checked detail link', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain(
      'aria-pressed={discoverySelectedId === item.id}',
    );
    expect(workspace).toContain('focusParcelDetailUrl(selected.id)');
    expect(workspace).toContain('Mở chi tiết thửa');
    expect(workspace).toContain('internal / simulated');
    expect(workspace).toContain('land-parcel-discovery-fill');
    expect(workspace).toContain('land-parcel-discovery-line');
    expect(workspace).not.toContain('map-areas-fill-land');
  });

  it('covers empty, invalid, forbidden, overflow, offline, stale and query-error', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain(
      'Không tìm thấy thửa đất trong phạm vi/bộ lọc này.',
    );
    expect(workspace).toContain(
      'Vùng tìm kiếm không hợp lệ hoặc quá rộng. Hãy thu hẹp vùng bản đồ.',
    );
    expect(workspace).toContain(
      'Bạn không có quyền xem nội dung này trong phạm vi hiện tại.',
    );
    expect(workspace).toContain(
      'Kết quả quá lớn để hiển thị an toàn. Hãy thu hẹp bộ lọc.',
    );
    expect(workspace).toContain(
      'Polygon thửa đất không được lưu trong bộ nhớ offline.',
    );
    expect(workspace).toContain('Dữ liệu bản đồ có thể đã cũ.');
    expect(workspace).toContain('Không thể tải lớp thửa đất. Thử lại.');
    expect(workspace).toContain('Bản đồ nền hiện không khả dụng');
    expect(workspace).toContain("setDiscoveryStatus('stale')");
    expect(workspace).toContain("setDiscoveryStatus('overflow')");
    expect(workspace).toContain('revalidateDiscovery');
  });

  it('guards revalidation with discoverySeq and maps MAP_LAYER_FAILED to the safe error state', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const revalidate = workspace.slice(
      workspace.indexOf('const revalidateDiscovery = useCallback'),
      workspace.indexOf('const resetDiscoveryPage = useCallback'),
    );
    expect(revalidate).toContain('const seq = discoverySeq.current');
    expect(revalidate).toContain('discoverySeq.current !== seq');
    expect(revalidate.indexOf('const seq = discoverySeq.current')).toBeLessThan(
      revalidate.indexOf('fetch(`${DISCOVERY_API}?${built.search}`'),
    );
    expect(revalidate.indexOf('discoverySeq.current !== seq')).toBeLessThan(
      revalidate.indexOf("setDiscoveryStatus('stale')"),
    );
    const runner = workspace.slice(
      workspace.indexOf('const runDiscovery = useCallback'),
      workspace.indexOf('const revalidateDiscovery = useCallback'),
    );
    const layerFailed = runner.indexOf('MAP_LAYER_FAILED');
    expect(layerFailed).toBeGreaterThan(-1);
    expect(runner.slice(layerFailed, layerFailed + 200)).toContain("'error'");
    expect(runner).toContain("setDiscoveryStatus('overflow')");
  });

  it('preserves P0 focus and generic Incident/Inspection behavior', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    expect(workspace).toContain('land-parcel-focus');
    expect(workspace).toContain('focusApiUrl');
    expect(workspace).toContain('Chưa chọn thửa đất');
    expect(workspace).toContain('/api/map/markers');
    expect(workspace).toContain('/api/map/config');
    expect(workspace).toContain("marker.aggregateType === 'Incident'");
    expect(workspace).toContain("marker.aggregateType === 'Inspection'");
    expect(workspace).toContain('map-areas-fill');
    expect(workspace).toContain('map-areas-line');
    expect(workspace).toContain('Quay lại danh sách thửa');
    expect(workspace).not.toContain('organizationId');
    expect(workspace).not.toMatch(/[aA]ddress/);
  });
});
