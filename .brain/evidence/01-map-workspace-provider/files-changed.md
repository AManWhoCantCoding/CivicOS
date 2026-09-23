# Files changed — `01-map-workspace-provider`

## Kết quả cuối

- Reviewer checkpoint cuối: **PASS** trong phạm vi ticket map.
- Commit implementation: `64208ac` (`feat(map): add PS-E1 map workspace`).
- Map-focused tests: **23/23 PASS**.
- Tile smoke runtime thật: **PASS** — Geofabrik Vietnam PBF, MBTiles CADN, TileServer health/style/TileJSON/PBF HTTP 200, bbox + OSM attribution/license, `restarts=0`.
- Các lỗi còn lại của toàn repo (`scripts/demo/seed.ts`, migration contract, unrelated E2E và format ngoài scope) đã được ghi nhận trong `tests.md`; Reviewer xác nhận chúng ngoài scope map.

## Files trong commit

- `.brain/evidence/01-map-workspace-provider/changes.md` — Developer evidence.
- `.brain/evidence/01-map-workspace-provider/review.md` — Reviewer direction/final evidence.
- `.brain/evidence/01-map-workspace-provider/tests.md` — Tester evidence.
- `.scratch/civicos-e1-clone-mvp/issues/01-map-workspace-provider.md` — ticket/AC/steps.
- `docker-compose.yml` — TileServer GL service.
- `package-lock.json` — dependency lock.
- `package.json` — `maplibre-gl` dependency.
- `src/app/api/map/config/route.ts` — provider config API.
- `src/app/api/map/health/route.ts` — tile health API.
- `src/app/api/map/markers/route.ts` — scoped marker API.
- `src/app/map/layout.tsx` — map shell layout.
- `src/app/map/page.tsx` — map route.
- `src/components/map/MapWorkspace.tsx` — MapLibre workspace UI.
- `src/components/map/index.ts` — map public contract.
- `src/components/map/maplibre-gl.d.ts` — MapLibre type shim.
- `src/components/navigation/feature-registry.ts` — map navigation registration.
- `src/modules/platform/index.ts` — map contract export.
- `src/modules/platform/map/index.ts` — provider, projection, geometry and permission contracts.
- `tests/map/map-geometry.test.ts` — geometry/projection tests.
- `tests/map/map-permission-offline.test.ts` — permission/offline guard tests.
- `tests/map/map-polygon.test.ts` — GeoArea polygon tests.
- `tests/map/map-provider.test.ts` — provider contract tests.
- `tests/map/map-smoke.test.ts` — smoke/fallback/attribution contract tests.
