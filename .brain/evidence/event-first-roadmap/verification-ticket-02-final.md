# Ticket 02 — independent verification

Date: 2026-09-21

PostgreSQL preparation (native Windows PowerShell):

```text
docker.exe info
Context:    desktop-linux
Server Version: 29.6.2

docker.exe compose up -d
Container civicos-postgres-1 Running
```

## Requested command results

### 1. Identity tests

Command:

```text
RUN_DB_TESTS=1 npx.cmd vitest run tests/identity
```

Raw result:

```text
Test Files  5 passed (5)
Tests       25 passed (25)
Duration    4.19s
```

`tests/identity/sensitive-log-leak.test.ts`: `3 tests passed`.

### 2. Full test suite

Command:

```text
RUN_DB_TESTS=1 npm.cmd test
```

Raw result:

```text
Test Files  20 passed (20)
Tests       61 passed (61)
Duration    13.99s
```

### 3. Typecheck, lint, build

Commands and raw results:

```text
npm.cmd run typecheck
> civic-os@0.1.0 typecheck
> tsc --noEmit
```

Exit code: `0`.

```text
npm.cmd run lint
> civic-os@0.1.0 lint
> eslint .
```

Exit code: `0`.

```text
npm.cmd run build
> civic-os@0.1.0 build
> next build

✓ Compiled successfully in 1288ms
✓ Generating static pages using 11 workers (26/26) in 436ms
```

Exit code: `0`.

### 4. E2E tests

Command:

```text
npx.cmd playwright test tests/e2e/login-and-access.spec.ts
```

Raw result:

```text
Running 8 tests using 2 workers
8 passed (15.6s)
```

Command:

```text
npm.cmd run test:e2e
```

Raw result:

```text
Running 18 tests using 6 workers
18 passed (17.5s)
```

## Sensitive-log test boundary observed

The new test does capture console output: `captureConsole()` spies on `console.log`, `console.info`, `console.warn`, and `console.error` with Vitest, and `serializeCalls()` serializes each spy's calls. `expectNoPlaintext()` asserts the marker is absent from every serialized call and from the joined serialized output.

The test also asserts, within its stated cases, that encrypted sensitive data does not contain the marker, decrypts back to the marker, and that the blind index is deterministic and does not contain the marker. The PostgreSQL cases assert absence of the password/intake markers in captured console calls and selected persisted values.

These assertions only establish the boundaries above; they do not establish absence from logging sinks or execution paths not exercised by this test.

## Remaining gaps

No command in the requested verification scope produced a failure. The sensitive-log test's coverage is limited to the exact console methods, code paths, and persisted fields asserted by the test.
