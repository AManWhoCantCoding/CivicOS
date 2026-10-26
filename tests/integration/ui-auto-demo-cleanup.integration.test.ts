import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { mapDemoTerminalEvidence } from '@/modules/demo/safe-evidence';

describe('T-011 cleanup handoff integration boundary', () => {
  it('keeps committed mutation pending for operator handoff', () => {
    const evidence = mapDemoTerminalEvidence({
      runId: 'demo-run-1',
      sceneId: 'scene-1',
      stepId: 'step-1',
      terminalState: 'cancelled',
      committedMutation: true,
      durationMs: 42,
    });

    expect(evidence.status).toBe('completed-with-cleanup-pending');
    expect(evidence.reason).toBe('DEMO_CLEANUP_OPERATOR_HANDOFF');
    expect(evidence.status).not.toBe('completed');
  });

  it('marks read-only completion without implying reset', () => {
    const evidence = mapDemoTerminalEvidence({
      runId: 'demo-run-1',
      sceneId: 'scene-1',
      stepId: 'step-1',
      terminalState: 'completed',
      committedMutation: false,
      durationMs: 42,
    });

    expect(evidence).toMatchObject({
      status: 'completed',
      reason: 'DEMO_COMPLETED_NO_MUTATION',
    });
    expect(JSON.stringify(evidence)).not.toContain('reset');
  });

  it('keeps reset as the guarded operator boundary', () => {
    const resetSource = readFileSync(
      join(process.cwd(), 'scripts/demo/reset.ts'),
      'utf8',
    );
    const targetSource = readFileSync(
      join(process.cwd(), 'scripts/demo/demo-db.ts'),
      'utf8',
    );
    const centerSource = readFileSync(
      join(process.cwd(), 'src/components/demo/DemoCenter.tsx'),
      'utf8',
    );

    expect(resetSource).toContain('target.dbName');
    expect(resetSource).toContain('requireResetConfirm');
    expect(targetSource).toContain("['civicos']");
    expect(centerSource).toContain('demo-safe-evidence');
    expect(centerSource).toContain('JSON.stringify(safeEvidence)');
    expect(centerSource).not.toContain('demo:reset');
    expect(centerSource).not.toContain('resetDemo');
  });
});
