import { NextResponse } from 'next/server';

import {
  createIdentityUser,
  ensureDevelopmentUsers,
  getCurrentUser,
  listIdentityUsers,
} from '@/modules/identity';

export async function GET(): Promise<NextResponse> {
  const current = await getCurrentUser();
  if (!current)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    await ensureDevelopmentUsers();
    return NextResponse.json({ users: await listIdentityUsers(current) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'USERS_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const current = await getCurrentUser();
  if (!current)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      role?: string;
      password?: string;
    };
    const allowedRoles = [
      'commander',
      'duty_officer',
      'field_officer',
      'office_officer',
      'village_officer',
      'superior_officer',
      'superior_commander',
      'system_operator',
    ] as const;
    if (
      !body.role ||
      !allowedRoles.includes(body.role as (typeof allowedRoles)[number])
    ) {
      return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 });
    }
    return NextResponse.json(
      {
        user: await createIdentityUser(
          {
            email: body.email ?? '',
            name: body.name ?? '',
            role: body.role as (typeof allowedRoles)[number],
            password: body.password ?? '',
          },
          current,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'USER_CREATE_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 400 },
    );
  }
}
