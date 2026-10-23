import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { DemoTargetStatus } from '@/components/demo/DemoTargetStatus';
import { evaluateDemoTargetGuard } from '@/modules/demo/target-guard';

const DEMO_URL =
  'postgresql://demo-user:s3cret-token@localhost:5432/civicos_demo?schema=public';
const WRONG_URL =
  'postgresql://demo-user:s3cret-token@localhost:5432/civicos_demo_shadow?schema=public';

describe('T-001 demo target status component', () => {
  it('renders ready copy with enabled start control', () => {
    const result = evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: DEMO_URL,
      databaseUrl: undefined,
    });
    const html = renderToStaticMarkup(
      <DemoTargetStatus result={result} onStart={() => {}} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('civicos_demo');
    expect(html).not.toContain('s3cret-token');
    expect(html).not.toContain('postgresql://');
    expect(html).not.toContain('disabled=""');
  });

  it('renders blocked copy with disabled start control', () => {
    const result = evaluateDemoTargetGuard({
      demoModeEnabled: true,
      demoDatabaseUrl: WRONG_URL,
      databaseUrl: undefined,
    });
    const html = renderToStaticMarkup(<DemoTargetStatus result={result} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('disabled');
    expect(html).not.toContain('s3cret-token');
    expect(html).not.toContain('civicos_demo_shadow');
  });

  it('renders disabled-mode blocked state without starting anything', () => {
    const result = evaluateDemoTargetGuard({ demoModeEnabled: false });
    const html = renderToStaticMarkup(<DemoTargetStatus result={result} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('disabled');
  });
});
