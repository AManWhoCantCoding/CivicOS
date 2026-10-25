import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  createRegistryEntry,
  listRegistry,
  updateRegistryEntry,
} from '@/modules/vehicles';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json({ registry: await listRegistry(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REGISTRY_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 500 },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json({
      entry: await updateRegistryEntry(await request.json(), user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REGISTRY_FAILED';
    return NextResponse.json(
      { error: message },
      {
        status:
          message === 'FORBIDDEN'
            ? 403
            : message.includes('NOT_FOUND')
              ? 404
              : 400,
      },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      { entry: await createRegistryEntry(await request.json(), user) },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REGISTRY_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 400 },
    );
  }
}
