import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DemoCenter } from '@/components/demo/DemoCenter';
import type { BridgeReadiness } from '@/modules/demo/readiness';
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

const mobileManifest = () =>
  makeValidManifest({ surface: 'mobile', personaAlias: 'demo-guide' });

function readyReadiness(): BridgeReadiness {
  return {
    state: 'ready',
    canStart: true,
    dependencies: {
      bridge: 'ready',
      device: 'ready',
      api: 'ready',
      worker: 'ready',
      map: 'ready',
      target: 'ready',
      mode: 'ready',
      manifest: 'ready',
    },
    reasons: [],
    message: 'Cầu nối mobile đã sẵn sàng.',
  };
}

function blockedReadiness(): BridgeReadiness {
  return {
    state: 'blocked',
    canStart: false,
    dependencies: {
      bridge: 'ready',
      device: 'unavailable',
      api: 'ready',
      worker: 'ready',
      map: 'ready',
      target: 'ready',
      mode: 'ready',
      manifest: 'ready',
    },
    reasons: [
      'Thiết bị chưa sẵn sàng. Liên hệ operator để chuẩn bị thiết bị trước khi chạy mobile.',
    ],
    message: 'Cầu nối mobile bị chặn. Liên hệ operator để chuẩn bị thiết bị.',
  };
}

describe('T-008 DemoCenter mobile bridge readiness', () => {
  it('renders the dependency matrix and keeps start enabled when ready', () => {
    const html = renderToStaticMarkup(
      <DemoCenter
        target={readyTarget()}
        manifest={mobileManifest()}
        bridgeReadiness={readyReadiness()}
      />,
    );
    expect(html).toContain('data-testid="demo-bridge-readiness"');
    expect(html).toContain('Cầu nối');
    expect(html).toContain('Thiết bị');
    expect(html).toContain('sẵn sàng');
    expect(html).toContain('Bắt đầu demo');
    expect(html).not.toContain('s3cret-token');
    expect(html).not.toContain('postgresql://');
  });

  it('renders the safe blocked reason and gates start while blocked', () => {
    const personaSwitch = vi.fn();
    const executor = vi.fn().mockReturnValue('settled');
    const html = renderToStaticMarkup(
      <DemoCenter
        target={readyTarget()}
        manifest={mobileManifest()}
        bridgeReadiness={blockedReadiness()}
        personaSwitch={personaSwitch}
        executor={executor}
      />,
    );
    expect(html).toContain('data-testid="demo-bridge-readiness"');
    expect(html).toContain('Liên hệ operator');
    expect(html).not.toContain('Bắt đầu demo');
    expect(html).toContain('Chưa thể bắt đầu demo');
    expect(html).not.toContain('s3cret-token');
    expect(html).not.toContain('postgresql://');
    expect(personaSwitch).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('preserves the web default with no bridge input', () => {
    const html = renderToStaticMarkup(
      <DemoCenter target={readyTarget()} manifest={makeValidManifest()} />,
    );
    expect(html).not.toContain('data-testid="demo-bridge-readiness"');
    expect(html).toContain('Bắt đầu demo');
  });

  it('preserves an already-blocked target reason for mobile scenes', () => {
    const blockedTarget = evaluateDemoTargetGuard({ demoModeEnabled: true });
    const html = renderToStaticMarkup(
      <DemoCenter target={blockedTarget} manifest={mobileManifest()} />,
    );

    expect(html).toContain(
      'Thiếu target demo. Liên hệ operator để cấu hình trước khi chạy.',
    );
    expect(html).not.toContain('DEMO_BRIDGE_BLOCKED');
  });
});
