# T-001 — CADN MBTiles handoff evidence

- **Source:** [Geofabrik Vietnam PBF](https://download.geofabrik.de/asia/vietnam-latest.osm.pbf); resolved URL: `https://download.geofabrik.de/asia/vietnam-261011.osm.pbf`
- **Retrieved:** 2026-10-12
- **Source SHA-256:** `d954e09b891079520bf13799377a9cf783cb1d9fe2745ef11864cb8d2a5b2048`
- **Candidate:** `storage/tiles/cadn/cadn.mbtiles`
- **Candidate SHA-256:** `d08079ef28a1b2f6e6fd8b0477a8fa6837af1f1b403f3f594d8ea532e1bbfe6e`
- **Pipeline:** `civicos-tilemaker:v3.2.0` / Tilemaker v3.2.0 with OpenMapTiles-compatible configuration; served by TileServer GL v5.6.0.
- **CADN bounds:** `[105.93, 20.91, 106.03, 20.99]`
- **Attribution/licence:** `© OpenStreetMap contributors`; OpenStreetMap data under ODbL.

## Verification

- **Metadata gate:** PASS before TileServer start — read-only SQLite check found `format=pbf`, exact CADN bounds, parseable OpenMapTiles-compatible `json.vector_layers` (16 layers), and 59 non-empty tiles.
- **Health:** PASS — `GET /health` returned `200 OK` / `OK`.
- **Style:** PASS — `GET /styles/basic-preview/style.json` returned 200 and references the CADN TileJSON source `/data/v3.json`.
- **TileJSON:** PASS — returned `format=pbf`, exact CADN bounds, attribution, and `/data/v3/{z}/{x}/{y}.pbf` template.
- **In-bounds tile:** PASS — `GET /data/v3/12/3253/1804.pbf` for `(105.98, 20.95)` returned `200`, 53,527 bytes.

The MBTiles binary is an external runtime asset, covered by the repository `storage/` gitignore rule, and was not staged or committed.
