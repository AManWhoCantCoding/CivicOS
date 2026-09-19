import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  approveRecommendation,
  completeInspection,
  getInspection,
  recordFinding,
  rejectRecommendation,
  saveChecklistResponses,
  startInspection,
  submitRecommendation,
} from '@/modules/inspections';

function commandError(error: unknown): NextResponse {
  const message =
    error instanceof Error ? error.message : 'INSPECTION_COMMAND_FAILED';
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ inspectionId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json(
      await getInspection((await context.params).inspectionId, user),
    );
  } catch (error) {
    return commandError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ inspectionId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const inspectionId = (await context.params).inspectionId;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    switch (body.command) {
      case 'start':
        return NextResponse.json({
          inspection: await startInspection(inspectionId, user),
        });
      case 'save_checklist':
        return NextResponse.json({
          inspection: await saveChecklistResponses(
            {
              inspectionId,
              responses: Array.isArray(body.responses)
                ? body.responses.map((response) => {
                    const value = response as Record<string, unknown>;
                    return {
                      key: String(value.key ?? ''),
                      value: String(value.value ?? ''),
                    };
                  })
                : [],
            },
            user,
          ),
        });
      case 'complete':
        return NextResponse.json({
          inspection: await completeInspection(
            { inspectionId, result: String(body.result ?? '') },
            user,
          ),
        });
      case 'finding':
        return NextResponse.json({
          finding: await recordFinding(
            {
              inspectionId,
              checklistKey: String(body.checklistKey ?? ''),
              description: String(body.description ?? ''),
              result: String(body.result ?? ''),
              evidenceIds: Array.isArray(body.evidenceIds)
                ? body.evidenceIds.map(String)
                : [],
            },
            user,
          ),
        });
      case 'recommend':
        return NextResponse.json({
          recommendation: await submitRecommendation(
            {
              inspectionId,
              findingIds: Array.isArray(body.findingIds)
                ? body.findingIds.map(String)
                : [],
              action: String(body.action ?? ''),
              reason: String(body.reason ?? ''),
            },
            user,
          ),
        });
      case 'approve':
        return NextResponse.json({
          recommendation: await approveRecommendation(
            inspectionId,
            String(body.recommendationId ?? ''),
            user,
          ),
        });
      case 'reject':
        return NextResponse.json({
          recommendation: await rejectRecommendation(
            inspectionId,
            String(body.recommendationId ?? ''),
            user,
            String(body.reason ?? ''),
          ),
        });
      default:
        return NextResponse.json({ error: 'UNKNOWN_COMMAND' }, { status: 400 });
    }
  } catch (error) {
    return commandError(error);
  }
}
