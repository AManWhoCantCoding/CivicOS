import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

const shell = () => readSource('src/components/shell/ModuleShell.tsx');
const sessionHook = () =>
  readSource('src/components/shell/useModuleSession.ts');
const sidebar = () => readSource('src/components/navigation/ModuleSidebar.tsx');
const home = () => readSource('src/app/page.tsx');
const workspace = () =>
  readSource('src/components/workspace/RoleWorkspace.tsx');
const registry = () =>
  readSource('src/components/navigation/feature-registry.ts');

describe('T-003 web shell', () => {
  it('keeps shell, sidebar and home on Light/Blue semantic tokens', () => {
    for (const source of [shell(), sidebar(), home()]) {
      expect(source).toContain('var(--civicos-');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toMatch(/text-cyan-|border-cyan-|bg-cyan-/);
    }
    // The session hook owns no presentation: no visual tokens or markup.
    expect(sessionHook()).not.toContain('var(--civicos-');
    expect(sessionHook()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('keeps module visibility bound to the existing feature registry', () => {
    // The shared shell derives visibility from the T-001 workspace projection
    // (single-expanded, navigation-filtered) rather than a per-module query.
    expect(shell()).toContain('buildWorkspaceProjection(session, assignments)');
    expect(shell()).toContain(
      "from '@/components/navigation/feature-registry'",
    );
    expect(shell()).toContain(
      'inferShellModuleId(projection.features, pathname, hash)',
    );
    expect(shell()).toContain(
      'activeFeatureId(activeFeatures, pathname, hash)',
    );
    expect(shell()).toContain('resolveShellActiveModuleId(');
    // Root entry delegates navigation to RoleWorkspace; projected links live
    // there via the T-001 workspace projection, not as hard-coded home cards.
    expect(home()).toContain('RoleWorkspace');
    expect(home()).toContain('<RoleWorkspace demoTarget={demoTarget} />');
    expect(workspace()).toContain('buildWorkspaceProjection(');
    expect(workspace()).toContain('href={feature.href}');
    expect(workspace()).toContain('Mở phân hệ');
    // Route targets remain defined by the existing feature registry.
    expect(registry()).toContain("href: '/incidents'");
    expect(registry()).toContain("href: '/inspections/establishments'");
    expect(registry()).toContain("href: '/field/vehicles'");
    expect(registry()).toContain("href: '/assignments'");
  });

  it('keeps session scope, assignment visibility and safe states', () => {
    expect(sessionHook()).toContain("fetch('/api/auth/session'");
    expect(sessionHook()).toContain("fetch('/api/identity/assignments'");
    expect(sessionHook()).toContain('SESSION_FAILED');
    expect(sessionHook()).toContain('INVALID_SESSION_RESPONSE');
    expect(sessionHook()).toContain('window.navigator.onLine');
    // Retry returns to loading without inventing a new state.
    expect(sessionHook()).toContain("setState('loading')");
    expect(shell()).toContain('<ModuleLoadingState label="điều hướng" />');
    expect(shell()).toContain('Thử tải lại điều hướng');
    expect(shell()).toContain('onRetry={retry}');
    expect(shell()).toContain(
      'Đăng nhập để xem điều hướng theo phạm vi được giao.',
    );
    expect(shell()).toContain('<ModuleOfflineNotice />');
    expect(shell()).toContain(
      'Chưa có Feature nào trong phạm vi của tài khoản.',
    );
  });

  it('keeps drawer open/close focus handoff and return', () => {
    expect(shell()).toContain('menuButtonRef');
    expect(shell()).toContain('drawerRef');
    expect(shell()).toContain('menuButtonRef.current?.focus()');
    expect(shell()).toContain("querySelector<HTMLElement>('nav a[href]')");
    expect(shell()).toContain("event.key === 'Escape'");
    expect(shell()).toContain('closeDrawer(true)');
    expect(shell()).toContain('aria-modal="true"');
    expect(shell()).toContain('aria-label={`Điều hướng');
    expect(shell()).toContain('aria-label="Đóng điều hướng"');
    expect(shell()).toContain('onClick={() => closeDrawer(false)}');
  });

  it('keeps breadcrumb and back route targets on existing destinations', () => {
    expect(shell()).toContain('aria-label="Breadcrumb"');
    expect(shell()).toContain('href="/"');
    // Route-owner chrome pins the breadcrumb to the route owner's module home;
    // only the active module's feature list renders (single-expanded).
    expect(shell()).toContain('href={fallbackDefinition.homeHref}');
    expect(shell()).toContain('routeOwnerFeatures');
    expect(shell()).toContain('routeActiveFeature');
    expect(shell()).toContain('aria-current="page"');
    expect(shell()).toContain('features={activeFeatures}');
    expect(sidebar()).toContain('href={feature.href}');
    expect(sidebar()).toContain("aria-current={active ? 'page' : undefined}");
  });

  it('keeps accessible names, 44px controls, motion and viewport rules', () => {
    // Workspace controls own the root 44px target; page.tsx is a thin
    // RoleWorkspace host and carries no direct controls.
    for (const source of [shell(), sidebar(), workspace()]) {
      expect(source).toContain('min-h-[44px]');
    }
    expect(shell()).toContain('aria-expanded={!collapsed}');
    expect(shell()).toContain('aria-controls="module-sidebar"');
    expect(shell()).toContain('aria-controls="module-drawer"');
    expect(shell()).toContain('Mở rộng điều hướng');
    expect(shell()).toContain('Thu gọn điều hướng');
    expect(sidebar()).toContain('title={feature.label}');
    // Reduced-motion: shell primitives use motion-safe explicitly; home
    // transitions are neutralized by the shared global
    // prefers-reduced-motion rule in globals.css.
    expect(shell()).toContain('motion-safe:');
    expect(sidebar()).toContain('motion-safe:');
    expect(readSource('src/app/globals.css')).toContain(
      'prefers-reduced-motion',
    );
    expect(shell()).toContain('max-w-[85vw]');
    expect(shell()).toContain('overflow-y-auto');
    expect(sidebar()).toContain('truncate');
  });
});
