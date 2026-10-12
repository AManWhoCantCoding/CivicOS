import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DemoCenter, describeDemoNarrator } from '@/components/demo/DemoCenter';
import { DEMO_PACING_MS } from '@/modules/demo/runner';
import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';
import { makeValidManifest } from './demo-manifest-fixture';

const DEMO_URL =
  'postgresql://demo-user:s3cret-token@localhost:5432/civicos_demo?schema=public';

const readyTarget = () =>
  evaluateDemoTargetGuard({
    demoModeEnabled: true,
    demoDatabaseUrl: DEMO_URL,
    databaseUrl: undefined,
  });

function centerSource(): string {
  return readFileSync(
    join(process.cwd(), 'src/components/demo/DemoCenter.tsx'),
    'utf8',
  );
}

describe('T-004 AC-3 accessible Vietnamese narrator', () => {
  it('renders an accessible live region with safe explanation and progress', () => {
    const html = renderToStaticMarkup(
      <DemoCenter target={readyTarget()} manifest={makeValidManifest()} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Tường thuật demo');
    expect(html).toContain('Tiến độ');
    expect(html).toContain('0/2');
    expect(html).not.toContain('step-1:');
    expect(html).not.toContain('{');
  });

  it('narrates lifecycle states in Vietnamese with settled and pacing', () => {
    const base = {
      cursor: 1,
      total: 2,
      currentStepId: 'step-2',
      lastStatus: 'settled' as const,
      lastReason: 'DEMO_STEP_SETTLED',
      personaAlias: 'demo-guide',
    };
    expect(describeDemoNarrator({ ...base, runState: 'idle' })).toContain(
      'sẵn sàng',
    );
    const running = describeDemoNarrator({ ...base, runState: 'running' });
    expect(running).toContain('bước 2/2');
    expect(running).toContain(`${DEMO_PACING_MS / 1000} giây`);
    expect(describeDemoNarrator({ ...base, runState: 'paused' })).toContain(
      'tạm dừng',
    );
    expect(
      describeDemoNarrator({
        ...base,
        runState: 'blocked',
        lastStatus: 'blocked',
        lastReason: 'DEMO_STEP_BLOCKED',
      }),
    ).toContain('DEMO_STEP_BLOCKED');
    expect(describeDemoNarrator({ ...base, runState: 'completed' })).toContain(
      'hoàn tất',
    );
    for (const state of ['idle', 'running', 'paused', 'blocked', 'completed']) {
      const copy = describeDemoNarrator({
        ...base,
        runState: state as 'idle',
      });
      expect(copy.trim().length).toBeGreaterThan(0);
      expect(copy).not.toContain('password');
      expect(copy).not.toContain('s3cret');
    }
  });

  it('keeps the status target focusable and restores focus after state changes', () => {
    const html = renderToStaticMarkup(
      <DemoCenter target={readyTarget()} manifest={makeValidManifest()} />,
    );
    expect(html).toContain('id="demo-center-status"');
    expect(html).toContain('tabindex="-1"');

    const source = centerSource();
    expect(source).toContain('.focus(');
    expect(source).toContain('demo-center-status');
  });

  it('keeps every control at 44px with visible focus', () => {
    const html = renderToStaticMarkup(
      <DemoCenter target={readyTarget()} manifest={makeValidManifest()} />,
    );
    const buttons = [...html.matchAll(/<button[^>]*>/g)].map(
      (match) => match[0],
    );
    expect(buttons.length).toBeGreaterThanOrEqual(5);
    for (const button of buttons) {
      expect(button).toContain('min-h-[44px]');
    }
    const source = centerSource();
    expect(source).toContain('focus-visible');
  });

  it('uses reduced motion for decoration only and keeps narration ordered', () => {
    const source = centerSource();
    expect(source).toContain('motion-safe:');
    expect(source).not.toMatch(/motion-reduce:(hidden|invisible|opacity-0)/);

    const html = renderToStaticMarkup(
      <DemoCenter target={readyTarget()} manifest={makeValidManifest()} />,
    );
    expect(html).toContain('Tường thuật demo');
    expect(html).toContain('Tiến độ');
  });

  it('never renders raw payload, PII or secret in narration', () => {
    const hostile = describeDemoNarrator({
      runState: 'blocked',
      cursor: 0,
      total: 2,
      currentStepId: 'step-1',
      lastStatus: 'blocked',
      lastReason: 'password s3cret-token SELECT * FROM assignment',
      personaAlias: 'demo-guide',
    });
    expect(hostile).not.toContain('password');
    expect(hostile).not.toContain('s3cret');
    expect(hostile).not.toContain('SELECT');
    expect(hostile).toContain('DEMO_STATE_UNKNOWN');

    const html = renderToStaticMarkup(
      <DemoCenter
        target={readyTarget()}
        manifest={makeValidManifest({
          personaAlias: 'demo-guide',
          steps: [
            { id: '<script>alert(1)</script>', action: 'click' },
            { id: 'step-2', action: 'submit' },
          ],
        })}
      />,
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('s3cret-token');
  });
});
