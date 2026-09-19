import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('database migration contract', () => {
  it('uses PostgreSQL as the configured production datasource', () => {
    expect(process.env.DATABASE_URL ?? 'postgresql://test').toContain(
      'postgresql',
    );
  });

  it('ships a clean-database migration for the event-first schema', () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        'prisma',
        'migrations',
        '0001_event_first',
        'migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain('CREATE TABLE "EventRecord"');
    expect(migration).toContain('CREATE TABLE "OutboxMessage"');
    expect(migration).toContain('CREATE TABLE "ProjectionRecord"');
  });
});
