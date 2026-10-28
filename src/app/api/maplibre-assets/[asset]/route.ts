import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

// MapLibre resolves its GeoJSON worker relative to import.meta.url of its ESM
// bundle. Under the Next production bundle that resolves to the page URL, so
// `maplibre-gl-worker.mjs` fails to load and no GeoJSON layer can render.
// MapWorkspace points setWorkerUrl() at this route instead: a fixed allowlist
// of the two library JS modules shipped inside the already-client-bundled
// maplibre-gl package. Public library assets only — no business data, no auth,
// no arbitrary file serving (any other value is rejected before touching the
// filesystem).
const ASSET_CONTENT_TYPE = 'text/javascript; charset=utf-8';

const ALLOWED_ASSETS = new Map<string, string>([
  ['maplibre-gl-worker.mjs', 'maplibre-gl-worker.mjs'],
  ['maplibre-gl-shared.mjs', 'maplibre-gl-shared.mjs'],
]);

function notFound(): NextResponse {
  return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
}

// GET /api/maplibre-assets/{asset}: same-origin allowlisted maplibre-gl
// dist JS. The allowlist pins the exact filename, so a path-traversal value
// never reaches a read.
export async function GET(
  _request: Request,
  context: { params: Promise<{ asset: string }> },
): Promise<NextResponse> {
  const { asset } = await context.params;
  const allowed = ALLOWED_ASSETS.get(asset);
  if (!allowed) return notFound();
  try {
    const body = await readFile(
      path.join(process.cwd(), 'node_modules', 'maplibre-gl', 'dist', allowed),
    );
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: { 'Content-Type': ASSET_CONTENT_TYPE },
    });
  } catch {
    // Package dist missing at runtime is a server configuration problem.
    return notFound();
  }
}
