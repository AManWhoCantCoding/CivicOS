import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import type { SessionScope } from '@/components/navigation/feature-registry';
import { buildWorkspaceProjection } from '@/components/navigation/workspace-registry';
import {
  resolveActiveModuleId,
  RoleWorkspaceView,
} from '@/components/workspace/RoleWorkspace';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const page = () => readSource('src/app/page.tsx');
const workspace = () =>
  readSource('src/components/workspace/RoleWorkspace.tsx');
const workspaceHook = () =>
  readSource('src/components/shell/useWorkspaceSession.ts');
const sessionControls = () =>
  readSource('src/components/identity/SessionControls.tsx');

function session(
  id: string,
  roles: string[],
  organizationUnitId = 'ou-a',
): NonNullable<SessionScope> {
  return { id, roles, organizationUnitId };
}

const commander = () => session('commander-1', ['commander']);

function view(
  props: Partial<ComponentProps<typeof RoleWorkspaceView>> = {},
): string {
  return renderToStaticMarkup(
    <RoleWorkspaceView
      session={commander()}
      assignments={[]}
      sessionState="ready"
      assignmentState="ready"
      online
      onRetry={() => {}}
      {...props}
    />,
  );
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

const HIDDEN_LABELS = [
  'Hàng đợi Incident',
  'Ghi nhận tin báo',
  'Danh mục cơ sở',
  'Lịch kiểm tra',
  'Hàng đợi fieldwork',
  'Danh sách cư dân đặc biệt',
  'Báo cáo tháng cư dân',
];

describe('T-002 role-aware root workspace', () => {
  it('does not render inventory while session is loading/error', () => {
    const loading = view({
      session: null,
      sessionState: 'loading',
      assignmentState: 'loading',
    });
    expect(loading).toContain('Đang kiểm tra phiên…');
    expect(loading).not.toContain('<a href');
    expect(loading).not.toContain('Không có quyền truy cập');

    const error = view({ sessionState: 'error', assignmentState: 'ready' });
    expect(error).toContain('Không thể kiểm tra phiên đăng nhập.');
    expect(error).toContain('Thử lại');
    expect(error).not.toContain('<a href');
    expect(error).not.toContain('Không có quyền truy cập');

    // The three hard-coded root cards are gone from the route entry.
    expect(page()).not.toContain('const modules');
    expect(page()).not.toContain('01 / Incident');
    expect(page()).not.toContain('02 / Inspection');
    expect(page()).not.toContain('03 / Field');
    expect(page()).not.toContain('Hàng đợi vụ việc');
    expect(page()).not.toContain('Cơ sở kinh doanh');
    expect(page()).not.toContain('Phương tiện hiện trường');
    expect(page()).not.toContain('Mở Assignment');
  });

  it('renders only permitted projection for authenticated session', () => {
    const html = view();
    const projection = buildWorkspaceProjection(commander(), []);

    // Every rendered link comes from a projected FeatureDef entry; nothing
    // outside the T-001 projection is linked (module homeHref is never used).
    const allowed = new Set(projection.features.map((feature) => feature.href));
    const rendered = hrefs(html);
    expect(rendered.length).toBeGreaterThan(0);
    for (const href of rendered) {
      expect(allowed.has(href), href).toBe(true);
    }
    expect(html).not.toContain('href="/incidents"');

    // Navigation-hidden features stay unlinked from the workspace.
    for (const label of HIDDEN_LABELS) {
      expect(html).not.toContain(label);
    }
    expect(html).not.toContain('href="/residents"');
    expect(html).not.toContain('href="/residents/reports"');

    expect(workspace()).toContain('href={feature.href}');
    expect(workspace()).toContain('buildWorkspaceProjection(');
    expect(workspace()).not.toContain('homeHref');
  });

  it('links the module entry to a projected feature href for task-scoped roles', () => {
    const fieldOfficer = session('field-1', ['field_officer']);
    const projection = buildWorkspaceProjection(fieldOfficer, []);
    // vehicles is visible via /field/vehicles while MODULES.vehicles.homeHref
    // (/vehicles/registry) is not eligible for this role.
    const vehicles = projection.modules.find(
      (entry) => entry.module.id === 'vehicles',
    );
    expect(vehicles?.features.map((feature) => feature.href)).toContain(
      '/field/vehicles',
    );
    expect(vehicles?.features.map((feature) => feature.href)).not.toContain(
      '/vehicles/registry',
    );

    const html = view({ session: fieldOfficer });
    const allowed = new Set(projection.features.map((feature) => feature.href));
    const rendered = hrefs(html);
    expect(rendered.length).toBeGreaterThan(0);
    for (const href of rendered) {
      expect(allowed.has(href), href).toBe(true);
    }
    expect(html).toContain('Mở phân hệ →');
    expect(html).not.toContain('/vehicles/registry');
  });

  it('fails closed while assignments are loading or unavailable', () => {
    const loading = view({ assignmentState: 'loading' });
    expect(loading).toContain('Đang tải điều hướng…');
    expect(loading).not.toContain('<a href');
    expect(loading).not.toContain('Không có quyền truy cập');

    const error = view({ assignmentState: 'error' });
    expect(error).toContain('Không thể tải điều hướng.');
    expect(error).toContain('Thử tải lại điều hướng');
    expect(error).not.toContain('<a href');

    // The hook reuses the existing assignment read and surfaces failure
    // instead of failing open; no new workspace endpoint exists.
    expect(workspaceHook()).toContain("fetch('/api/identity/assignments'");
    expect(workspaceHook()).toContain('ASSIGNMENTS_FAILED');
    expect(workspaceHook()).toContain('setAssignments([])');
    expect(workspaceHook()).not.toContain('/api/workspace');
    expect(workspaceHook()).not.toContain('/api/navigation');
    expect(workspaceHook()).not.toContain('/api/modules');
    expect(workspaceHook()).not.toContain('ROLE_BASE_CAPABILITIES');
  });

  it('renders AccessDenied for a valid session with no feature', () => {
    const citizen = session('citizen-1', ['citizen']);
    expect(buildWorkspaceProjection(citizen, []).modules).toEqual([]);
    const html = view({ session: citizen });
    expect(html).toContain('Không có quyền truy cập');
    expect(html).not.toContain('<a href');
    expect(html).not.toContain('Mở phân hệ');

    const loginRequired = view({ session: null, assignmentState: 'ready' });
    expect(loginRequired).toContain(
      'Đăng nhập để xem điều hướng theo phạm vi được giao.',
    );
    expect(loginRequired).not.toContain('<a href');
  });

  it('selects the first permitted module without granting access', () => {
    const projection = buildWorkspaceProjection(commander(), []);
    expect(projection.modules.length).toBeGreaterThan(1);
    expect(resolveActiveModuleId(projection.modules, null)).toBe(
      projection.modules[0]?.module.id,
    );
    expect(resolveActiveModuleId(projection.modules, 'vehicles')).toBe(
      'vehicles',
    );
    expect(resolveActiveModuleId(projection.modules, 'land')).toBe(
      projection.modules[0]?.module.id,
    );
    expect(resolveActiveModuleId([], null)).toBe(null);

    const html = view();
    const first = projection.modules[0];
    const second = projection.modules[1];
    expect(first && second).toBeTruthy();
    if (!first || !second) return;
    // Exactly one tab is selected and only its feature list renders.
    expect(html).toContain(`id="workspace-tab-${first.module.id}"`);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    for (const feature of first.features) {
      expect(html).toContain(feature.label);
    }
    for (const feature of second.features) {
      expect(html).not.toContain(feature.label);
    }
    expect(html).toContain('Mở phân hệ →');

    // Selection is presentation state: no entry-authorization recompute, no
    // shared-shell takeover, no policy copy in the root workspace.
    expect(workspace()).toContain('aria-selected');
    expect(workspace()).toContain('Presentation-only');
    expect(workspace()).not.toContain('canEnterFeature');
    expect(workspace()).not.toContain('visibleRoles');
    expect(workspace()).not.toContain('requiresTask');
    expect(workspace()).not.toContain('ModuleShell');
    expect(workspace()).not.toContain('ModuleSidebar');
  });

  it('preserves login/logout API boundary and root route', () => {
    expect(page()).toContain('SessionControls');
    expect(page()).toContain('RoleWorkspace');
    expect(page()).toContain('export default function Home');
    expect(page()).not.toContain("method: 'DELETE'");

    // The existing session/logout boundary is untouched.
    expect(sessionControls()).toContain(
      "fetch('/api/auth/session', { method: 'DELETE' })",
    );
    expect(sessionControls()).toContain("router.push('/login')");
    expect(sessionControls()).toContain('Đăng nhập');
    expect(sessionControls()).toContain('Đăng xuất');

    // The workspace adds no auth mutation and no new route.
    expect(workspaceHook()).toContain("fetch('/api/auth/session'");
    expect(workspaceHook()).toContain('SESSION_FAILED');
    expect(workspaceHook()).toContain('INVALID_SESSION_RESPONSE');
    expect(workspaceHook()).not.toContain('DELETE');
    expect(workspaceHook()).not.toContain('/login');
    expect(workspaceHook()).not.toContain('var(--civicos-');
    expect(workspace()).not.toContain('router.push');
    expect(workspace()).not.toContain('/api/auth/session');
    expect(workspace()).toContain('var(--civicos-');
    expect(workspace()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
