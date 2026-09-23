import { NextResponse } from 'next/server';

import {
  MAP_ERRORS,
  mapTileHealthUrl,
  resolveMapProvider,
} from '@/modules/platform/map';

// Sức khỏe tile runtime; fallback không thay thế provider chính thức.
export async function GET(): Promise<NextResponse> {
  try {
    const provider = resolveMapProvider();
    const healthUrl = mapTileHealthUrl(provider);
    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(2500),
      });
      return NextResponse.json({
        status: response.ok ? 'healthy' : 'unreachable',
        reachable: response.ok,
        provider,
        healthUrl,
        official: false,
      });
    } catch {
      return NextResponse.json({
        status: 'unreachable',
        reachable: false,
        provider,
        healthUrl,
        official: false,
      });
    }
  } catch {
    return NextResponse.json(
      { error: MAP_ERRORS.providerUnavailable, official: false },
      { status: 503 },
    );
  }
}
