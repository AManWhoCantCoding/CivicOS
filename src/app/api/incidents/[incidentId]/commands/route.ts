import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  assignIncident,
  approveIncident,
  classifyIncident,
  closeIncident,
  resolveIncident,
  rejectIncidentApproval,
  startVerification,
  transferIncident,
} from '@/modules/incidents';

export async function POST(
  request: Request,
  context: { params: Promise<{ incidentId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { incidentId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    switch (body.command) {
      case 'classify':
        return NextResponse.json({
          incident: await classifyIncident(
            incidentId,
            user,
            String(body.category ?? ''),
            String(body.severity ?? ''),
          ),
        });
      case 'assign':
        return NextResponse.json({
          result: await assignIncident(
            incidentId,
            user,
            Array.isArray(body.assigneeUserIds)
              ? body.assigneeUserIds.map(String)
              : [],
          ),
        });
      case 'verify':
        return NextResponse.json({
          incident: await startVerification(
            incidentId,
            user,
            String(body.note ?? ''),
          ),
        });
      case 'transfer':
        return NextResponse.json({
          incident: await transferIncident(
            incidentId,
            user,
            String(body.organizationId ?? ''),
          ),
        });
      case 'resolve':
        return NextResponse.json({
          incident: await resolveIncident(
            incidentId,
            user,
            String(body.resolution ?? ''),
          ),
        });
      case 'close':
        return NextResponse.json({
          incident: await closeIncident(incidentId, user),
        });
      case 'approve':
        return NextResponse.json({
          result: await approveIncident(
            incidentId,
            String(body.approvalId ?? ''),
            user,
          ),
        });
      case 'reject':
        return NextResponse.json({
          result: await rejectIncidentApproval(
            incidentId,
            String(body.approvalId ?? ''),
            user,
            String(body.reason ?? ''),
          ),
        });
      default:
        return NextResponse.json({ error: 'UNKNOWN_COMMAND' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'COMMAND_FAILED';
    const status =
      message === 'FORBIDDEN' ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
