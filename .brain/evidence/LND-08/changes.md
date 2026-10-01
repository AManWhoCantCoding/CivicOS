# Evidence LND-08 — Review transition và timeline

## Files

- `src/modules/land/application-service.ts`: `reviewApplication`, `listApplicationTimeline`, safe `TimelineEvent` projection and recursive forbidden-key sanitizer.
- `src/modules/land/schemas.ts`: strict positive integer `If-Match-Version` and empty review body parsers.
- `src/modules/land/errors.ts`: stable `LAND_VERSION_CONFLICT` and `LAND_INVALID_TRANSITION` mappings.
- `src/modules/land/index.ts`: narrow public exports for review/timeline services and `TimelineEvent`.
- `src/app/api/land/applications/[applicationId]/review/route.ts`: thin POST route.
- `src/app/api/land/applications/[applicationId]/timeline/route.ts`: thin GET route.
- `tests/land/lnd08-review-timeline.test.ts`: request parsing, transition/version/Assignment/scope, event/audit, timeline ordering/privacy and nested-sanitization regressions.

## Review repair

- Initial implementation exposed forbidden keys nested inside timeline payload/metadata. `sanitizeTimelineValue` now recursively removes `changePayload`, ciphertext and storage-internal keys from objects and arrays; a DB regression locks this behavior.

## Scope

- No design, research, Prisma schema/migration, identity, UI, phase or environment files changed by LND-08.
