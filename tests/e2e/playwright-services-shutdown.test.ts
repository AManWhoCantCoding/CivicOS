import { describe, expect, it } from 'vitest';
import { createShutdownExitStatus } from '../../scripts/e2e/shutdown-exit-status.mjs';

describe('playwright services shutdown exit status', () => {
  it('escalates an in-progress successful shutdown on a signal', () => {
    const status = createShutdownExitStatus();
    status.request(0);
    status.request(1);
    const result: number[] = [];
    status.finalize((code: number) => result.push(code));
    expect(result).toEqual([1]);
  });

  it('corrects a success marker when a signal arrives after finalization', () => {
    const status = createShutdownExitStatus();
    const result: number[] = [];
    status.finalize((code: number) => result.push(code));
    status.request(1);
    expect(result).toEqual([0, 1]);
    expect(status.current()).toBe(1);
  });
});
