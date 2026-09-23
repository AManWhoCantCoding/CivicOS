import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireRole } from '@/modules/identity';
import { getSubjectDetail, toApiError } from '@/modules/residents';

export async function GET(
  _request: Request,
  context: { params: Promise<{ subjectId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { subjectId } = await context.params;
    return NextResponse.json({
      subject: await getSubjectDetail(subjectId, user),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ subjectId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const { subjectId } = await context.params;
    await getSubjectDetail(subjectId, user);
    requireRole(user, 'commander', 'duty_officer', 'office_officer');
    const body = (await request.json()) as {
      displayName?: string;
      status?: string;
    };
    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(typeof body.displayName === 'string' && body.displayName.trim()
          ? { displayName: body.displayName.trim() }
          : {}),
        ...(typeof body.status === 'string' && body.status.trim()
          ? { status: body.status.trim() }
          : {}),
      },
    });
    return NextResponse.json({
      subject: await getSubjectDetail(subject.id, user),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.status },
    );
  }
}
