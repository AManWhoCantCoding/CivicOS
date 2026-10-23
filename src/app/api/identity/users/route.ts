import { NextResponse } from 'next/server';

import {
  createIdentityUser,
  ensureDevelopmentUsers,
  getCurrentUser,
  listIdentityUsers,
} from '@/modules/identity';
import { USER_PROVISIONING_ROLES } from '@/modules/identity/contracts';

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
    const role = USER_PROVISIONING_ROLES.find(
      (allowedRole) => allowedRole === body.role,
    );
    if (!role) {
      return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 });
    }
    return NextResponse.json(
      {
        user: await createIdentityUser(
          {
            email: body.email ?? '',
            name: body.name ?? '',
            role,
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
