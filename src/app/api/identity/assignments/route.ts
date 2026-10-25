import { NextResponse } from 'next/server';

import {
  createAssignments,
  getCurrentUser,
  listAssignments,
  requireRole,
  revokeAssignment,
} from '@/modules/identity';

export async function GET(request: Request): Promise<NextResponse> {
  const current = await getCurrentUser();
  if (!current)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const url = new URL(request.url);
    const resourceType = url.searchParams.get('resourceType');
    const resourceId = url.searchParams.get('resourceId');
    return NextResponse.json({
      assignments: await listAssignments({
        actor: current,
        resourceType: resourceType ?? undefined,
        resourceId: resourceId ?? undefined,
        includeRevoked: url.searchParams.get('includeRevoked') === 'true',
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ASSIGNMENT_FAILED';
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
      resourceType?: string;
      resourceId?: string;
      task?: string;
      assigneeUserIds?: string[];
      organizationId?: string;
    };
    const isLandReview =
      body.resourceType === 'LandChangeApplication' &&
      body.task === 'land_review';
    if (isLandReview) {
      requireRole(current, 'commander', 'superior_commander', 'commune_leader');
    } else {
      requireRole(current, 'commander', 'superior_commander');
    }
    if (
      !body.resourceType ||
      !body.resourceId ||
      !body.task ||
      !body.assigneeUserIds?.length
    ) {
      return NextResponse.json(
        { error: 'INVALID_ASSIGNMENT' },
        { status: 400 },
      );
    }
    const assignments = await createAssignments(
      {
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        task: body.task,
        assigneeUserIds: body.assigneeUserIds,
        organizationId: body.organizationId,
      },
      current,
    );
    return NextResponse.json({ assignments }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ASSIGNMENT_FAILED';
    const status =
      message === 'FORBIDDEN' || message.includes('ORGANIZATION')
        ? 403
        : message.includes('NOT_FOUND')
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const current = await getCurrentUser();
  if (!current)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  try {
    const body = (await request.json()) as {
      assignmentId?: string;
      reason?: string;
    };
    if (!body.assignmentId || !body.reason) {
      return NextResponse.json(
        { error: 'INVALID_REVOCATION' },
        { status: 400 },
      );
    }
    const assignment = await revokeAssignment(
      body.assignmentId,
      current,
      body.reason,
    );
    return NextResponse.json({ assignment });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'REVOCATION_FAILED';
    const status =
      message === 'FORBIDDEN' ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
