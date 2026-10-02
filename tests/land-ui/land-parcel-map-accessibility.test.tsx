import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('T-004 web map accessibility and privacy contract', () => {
  it('labels every map state section and exposes semantic announcements', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const sectionIds = [
      'map-loading-heading',
      'map-denied-heading',
      'map-error-heading',
      'map-workspace-heading',
      'land-parcel-focus-heading',
      'land-parcel-empty-heading',
      'map-markers-empty-heading',
    ];

    for (const id of sectionIds) {
      expect(workspace).toContain(`aria-labelledby="${id}"`);
      expect(workspace).toContain(`id="${id}"`);
    }
    expect(workspace).toContain('role="status"');
    expect(workspace).toContain('role="alert"');
    expect(workspace).toContain('aria-live="polite"');
    expect(workspace).toContain('aria-live="assertive"');
    expect(workspace).toContain('aria-busy="true"');
  });

  it('provides visible focus, keyboard selection and large recovery targets', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');

    expect(workspace).toContain('focus-visible:outline-2');
    expect(workspace).toContain('tabIndex={-1}');
    expect(workspace).toContain('aria-pressed={focusSelected}');
    expect(workspace).toContain(
      'aria-describedby="land-parcel-focus-description"',
    );
    expect(workspace).toContain('onKeyDown');
    expect(workspace).toContain("event.key === 'Escape'");
    expect(workspace).toContain('min-h-[44px]');
    expect(workspace).toContain('Mở chi tiết thửa');
    expect(workspace).toContain('Tải lại dữ liệu thửa đất');
  });

  it('keeps the internal simulated and no-legal-boundary wording visible', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const text = workspace.replace(/\s+/g, ' ');

    expect(workspace).toContain('internal / simulated');
    expect(text).toContain(
      'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
    );
    expect(workspace).not.toContain('certified');
    expect(workspace).not.toContain('legal boundary');
  });

  it('keeps forbidden and not-found copy generic and sensitive fields out', () => {
    const workspace = readSource('src/components/map/MapWorkspace.tsx');
    const focus = readSource('src/components/map/land-parcel-focus.ts');

    expect(workspace).toContain(
      'Bạn không có quyền xem nội dung này trong phạm vi hiện tại.',
    );
    expect(workspace).toContain(
      'Thửa đất không tồn tại hoặc không nằm trong phạm vi truy cập.',
    );
    for (const source of [workspace, focus]) {
      expect(source).not.toContain('organizationId');
      expect(source).not.toMatch(/[aA]ddress/);
      expect(source).not.toContain('Evidence');
      expect(source).not.toMatch(/party/i);
      expect(source).not.toMatch(/rights/i);
      expect(source).not.toContain('policyOverride');
      expect(source).not.toMatch(/[?&]token=/i);
    }
  });
});
