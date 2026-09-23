import { NextResponse } from 'next/server';

import {
  MAP_ERRORS,
  mapTileHealthUrl,
  resolveMapProvider,
} from '@/modules/platform/map';

// Cấu hình provider bản đồ runtime, không chứa secret.
export async function GET(): Promise<NextResponse> {
  try {
    const provider = resolveMapProvider();
    return NextResponse.json({
      provider,
      bounds: provider.bounds,
      healthUrl: mapTileHealthUrl(provider),
      official: provider.official,
    });
  } catch {
    return NextResponse.json(
      { error: MAP_ERRORS.providerUnavailable },
      { status: 503 },
    );
  }
}
