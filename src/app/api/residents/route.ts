import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import { listSubjects, registerSubject, toApiError } from '@/modules/residents';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const subjects = await listSubjects(user, {
      subjectType: url.searchParams.get('subjectType') ?? undefined,
      overdue: url.searchParams.get('overdue') === 'true',
    });
    return NextResponse.json({ subjects });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const subject = await registerSubject(await request.json(), user);
    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
