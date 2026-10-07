import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

// Approved Light/Blue values from
// `.scratch/civicos-ui-design-system/ui/design-tokens.md` (lowercased: CSS hex
// is case-insensitive, source uses lowercase).
const approvedTokens: Array<[string, string]> = [
  ['--civicos-canvas', '#f8fafc'],
  ['--civicos-surface', '#ffffff'],
  ['--civicos-surface-muted', '#f1f5f9'],
  ['--civicos-text', '#172033'],
  ['--civicos-text-muted', '#475569'],
  ['--civicos-border', '#cbd5e1'],
  ['--civicos-focus', '#1d4ed8'],
  ['--civicos-accent', '#075985'],
  ['--civicos-accent-hover', '#0c4a6e'],
  ['--civicos-success', '#166534'],
  ['--civicos-warning', '#854d0e'],
  ['--civicos-danger', '#b91c1c'],
  ['--civicos-info', '#1e40af'],
  ['--civicos-simulated-bg', '#fff7ed'],
  ['--civicos-simulated-text', '#9a3412'],
  ['--civicos-map-fill', '#38bdf8'],
  ['--civicos-map-stroke', '#075985'],
];

// Every `var(--civicos-*)` a state primitive may reference: approved color
// tokens plus pre-existing structural tokens consumed across feature surfaces
// (must_preserve — e.g. `accent-contrast` is used by land/inspection/incident
// actions and must not be removed here).
const knownTokenNames = new Set([
  'civicos-canvas',
  'civicos-surface',
  'civicos-surface-muted',
  'civicos-surface-raised',
  'civicos-border',
  'civicos-text',
  'civicos-text-muted',
  'civicos-focus',
  'civicos-focus-ring',
  'civicos-focus-ring-width',
  'civicos-accent',
  'civicos-accent-hover',
  'civicos-accent-contrast',
  'civicos-success',
  'civicos-warning',
  'civicos-danger',
  'civicos-info',
  'civicos-simulated-bg',
  'civicos-simulated-text',
  'civicos-map-fill',
  'civicos-map-stroke',
  'civicos-space-1',
  'civicos-space-2',
  'civicos-space-3',
  'civicos-space-4',
  'civicos-space-6',
  'civicos-space-8',
  'civicos-space-12',
  'civicos-radius-sm',
  'civicos-radius-md',
  'civicos-radius-lg',
  'civicos-icon-sm',
  'civicos-icon-md',
  'civicos-icon-lg',
  'civicos-control-min',
]);

describe('T-001 shared foundation', () => {
  it('keeps the approved Light/Blue token values exact', () => {
    const css = readSource('src/app/globals.css');
    const normalized = css.toLowerCase();
    for (const [variable, value] of approvedTokens) {
      expect(normalized).toContain(`${variable}: ${value}`);
    }
    expect(css).toContain('color-scheme: light');
    expect(css).toContain('system-ui, sans-serif');
    expect(css).toContain('ui-monospace, SFMono-Regular, Menlo, monospace');
    expect(css).toContain('min-height: var(--civicos-control-min)');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('var(--civicos-focus-ring');
    expect(css).toContain('prefers-reduced-motion');
  });

  it('keeps RootLayout on the shared stylesheet seam', () => {
    const layout = readSource('src/app/layout.tsx');
    expect(layout).toContain("import './globals.css'");
    expect(layout).toContain('<html lang="vi">');
  });

  it('keeps existing state meaning, safe copy and actions', () => {
    const status = readSource('src/components/shell/ModuleStatus.tsx');
    const denied = readSource('src/components/identity/AccessDenied.tsx');

    for (const name of [
      'ModuleLoadingState',
      'ModuleErrorState',
      'ModuleEmptyState',
      'ModuleReadyState',
      'ModuleWarningState',
      'ModuleDeniedState',
      'ModuleOfflineNotice',
      'ModuleSimulatedNotice',
    ]) {
      expect(status).toContain(name);
    }

    // Representative safe copy per state grammar (existing wording unchanged).
    expect(status).toContain('Đang tải');
    expect(status).toContain('Thử tải lại');
    expect(status).toContain('Tải lại dữ liệu');
    expect(status).toContain('Đang ngoại tuyến');
    expect(status).toContain(
      'Dữ liệu mô phỏng nội bộ; không phải ranh giới pháp lý chính thức.',
    );
    expect(status).toContain('AccessDenied');
    expect(denied).toContain('Không có quyền truy cập');

    // State is never conveyed by color alone: text/icon plus roles.
    expect(status).toContain('aria-hidden');
    expect(status).toContain('role="status"');
    expect(status).toContain('role="alert"');
    expect(status).toContain('role="note"');
    expect(status).toContain('aria-busy="true"');

    // Existing retry callbacks and minimum touch target stay available.
    expect(status).toContain('onRetry');
    expect(status).toContain('retryLabel');
    expect(status).toContain('min-h-[44px]');
  });

  it('rejects forbidden gradient/glow/new semantic tokens', () => {
    const scoped = [
      'src/app/globals.css',
      'src/app/layout.tsx',
      'src/components/shell/ModuleStatus.tsx',
    ];
    for (const file of scoped) {
      const source = readSource(file);
      expect(source).not.toMatch(/gradient|neon|glow/i);
      expect(source).not.toContain('#000000');
      expect(source).not.toContain('official');
      expect(source).not.toContain('certified');
    }

    // State primitives reference only known shared tokens, no hardcoded color.
    const status = readSource('src/components/shell/ModuleStatus.tsx');
    expect(status).toContain('var(--civicos-');
    expect(status).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const referenced = [...status.matchAll(/var\(--([a-z0-9-]+)\)/g)].map(
      (match) => match[1],
    );
    expect(referenced.length).toBeGreaterThan(0);
    for (const name of referenced) {
      expect(knownTokenNames.has(name)).toBe(true);
    }
  });
});
