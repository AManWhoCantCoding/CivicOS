import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('vehicle UI freshness seams', () => {
  it('refreshes statistics when a new observation changes the workspace key', () => {
    const workspace = source(
      'src/components/vehicles/VehicleObservationWorkspace.tsx',
    );
    const statistics = source('src/components/vehicles/VehicleStatistics.tsx');

    expect(workspace).toContain(
      '<VehicleStatistics refreshKey={refreshKey} />',
    );
    expect(statistics).toContain('refreshKey = 0');
    expect(statistics).toContain('}, [online, refreshKey]);');
  });

  it('marks only an active parking watch complete from the verification timestamp', () => {
    const detail = source(
      'src/components/vehicles/VehicleObservationDetail.tsx',
    );

    expect(detail).toContain("current.parkingWatch?.status === 'active'");
    expect(detail).toContain("typeof verification.verifiedAt === 'string'");
    expect(detail).toContain('completedAt: verification.verifiedAt');
    expect(detail).toContain(': current.parkingWatch,');
  });
});
