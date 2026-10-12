import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const runbook = readFileSync(
  join(process.cwd(), 'docs/runbooks/ui-auto-demo/README.md'),
  'utf8',
);

describe('T-013 operator recovery documentation', () => {
  it('defines stop, replay, escalation, and the runner safety boundary', () => {
    for (const term of ['Stop', 'Replay', 'escalate', 'blocked', 'deferred']) {
      expect(runbook).toContain(term);
    }
    for (const prohibition of [
      'không tự khởi động',
      'không bypass',
      'không giả thành công',
      'không retry mù',
    ]) {
      expect(runbook).toContain(prohibition);
    }
  });
});
