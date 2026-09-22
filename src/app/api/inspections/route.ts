import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  listDueInspections,
  listInspections,
  parseScheduleInput,
  scheduleInspection,
  toApiError,
} from '@/modules/inspections';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const state = new URL(request.url).searchParams.get('state');
    const inspections =
      state === 'due' || state === 'overdue'
        ? await listDueInspections(user)
        : await listInspections(user);
    return NextResponse.json({ inspections });
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
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      {
        inspection: await scheduleInspection(
          parseScheduleInput(await request.json()),
          user,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
