import { NextResponse } from 'next/server';

import {
  ensureDevelopmentUsers,
  getCurrentUser,
  listOrganizationUnits,
} from '@/modules/identity';

export async function GET(): Promise<NextResponse> {
  const current = await getCurrentUser();
  if (!current)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    await ensureDevelopmentUsers();
    return NextResponse.json({
      organizationUnits: await listOrganizationUnits(current),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ORGANIZATION_UNITS_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 500 },
    );
  }
}
