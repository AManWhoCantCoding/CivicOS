// Baseline development Identity fixture seed for the DB-backed Vitest
// lifecycle (spawned by scripts/e2e/run-vitest-db.mjs strictly between the
// initial reset and the Vitest run, while the shared whole-run advisory lock
// is held by the runner parent).
//
// Contract:
// - The FULL lifecycle env is validated (strict, credential-free gate,
//   same seam as the runner/test setup) BEFORE any dynamic import of the
//   Identity/Prisma modules and BEFORE any Prisma connection is opened.
// - Refusals print a stable, credential-free code only — never the URL.
// - It calls the existing ensureDevelopmentUsers() helper ONLY. The Pilot 01
//   sandbox guard inside that helper is untouched (it still short-circuits on
//   the exact 127.0.0.1:5433 sandbox branch; this entrypoint never rewrites
//   DATABASE_URL and never bypasses it).
// - The runner-supplied environment already carries the validated
//   civicos_e2e target on both DATABASE_URL and CIVICOS_E2E_DATABASE_URL, so
//   the standard shared Prisma client connects only to that exact target.

import { validateVitestDbLifecycleEnv } from './run-vitest-db.mjs';

/** Stable, credential-free refusal (no URL, no credentials — ever). */
function refuse(code: string): never {
  process.stderr.write(`vitest-db seed refused: ${code}\n`);
  process.exit(1);
}

function validateSeedEnv(): string {
  const validated = validateVitestDbLifecycleEnv(process.env);
  if (!validated.dbTestsRequested) {
    // RUN_DB_TESTS=1 is missing: this entrypoint is lifecycle-only and must
    // never run as part of an ordinary (anonymous-env) invocation.
    return refuse('E2E_SEED_RUN_FLAG_REQUIRED');
  }
  if (!validated.ok || !validated.targetUrl) {
    return refuse(validated.code ?? 'E2E_SEED_ENV_REFUSED');
  }
  return validated.targetUrl;
}

async function seed(): Promise<void> {
  // Only here — AFTER the strict gate — may the Identity/Prisma modules be
  // imported (ensureDevelopmentUsers statically wires the shared Prisma
  // client, which reads the runner-validated DATABASE_URL).
  const { ensureDevelopmentUsers } =
    await import('../../src/modules/identity/local-provider');
  const { prisma } = await import('../../src/lib/prisma');
  try {
    await ensureDevelopmentUsers();
    process.stdout.write('vitest-db seed completed: identity fixtures ready\n');
  } finally {
    // Disconnect the existing shared client exactly once, even on failure —
    // the parent runner owns the locks/resets and must stay independent.
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  validateSeedEnv();
  try {
    await seed();
  } catch (error) {
    // Stable, credential-free failure summary only: never echo a connection
    // string (Prisma/client errors may embed it) — first line, truncated,
    // with postgres URLs redacted out defensively.
    const message = error instanceof Error ? error.message : String(error);
    const safe = message
      .split('\n')[0]
      .replace(/postgres(ql)?:\/\/\S+/g, '[redacted-database]')
      .slice(0, 160);
    process.stderr.write(`vitest-db seed failed: ${safe}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(
    `vitest-db seed failed: ${
      error instanceof Error ? error.message : String(error)
    }\n`,
  );
  process.exit(1);
});
