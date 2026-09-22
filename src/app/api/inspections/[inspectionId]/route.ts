import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  approveRecommendation,
  completeInspection,
  getInspection,
  parseInspectionCommand,
  recordFinding,
  rejectRecommendation,
  saveChecklistResponses,
  startInspection,
  submitRecommendation,
  toApiError,
} from '@/modules/inspections';

function commandError(error: unknown): NextResponse {
  const apiError = toApiError(error);
  return NextResponse.json(
    { error: apiError.message, code: apiError.code },
    { status: apiError.status },
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
  try {
    const input = parseInspectionCommand(await request.json());
    switch (input.command) {
      case 'start':
        return NextResponse.json({
          inspection: await startInspection(inspectionId, user),
        });
      case 'save_checklist':
        return NextResponse.json({
          inspection: await saveChecklistResponses(
            {
              inspectionId,
              responses: input.responses,
            },
            user,
          ),
        });
      case 'complete':
        return NextResponse.json({
          inspection: await completeInspection(
            { inspectionId, result: input.result },
            user,
          ),
        });
      case 'finding':
        return NextResponse.json({
          finding: await recordFinding(
            {
              inspectionId,
              checklistKey: input.checklistKey,
              description: input.description,
              result: input.result,
              evidenceIds: input.evidenceIds,
            },
            user,
          ),
        });
      case 'recommend':
        return NextResponse.json({
          recommendation: await submitRecommendation(
            {
              inspectionId,
              findingIds: input.findingIds,
              action: input.action,
              reason: input.reason,
            },
            user,
          ),
        });
      case 'approve': {
        const recommendation = await approveRecommendation(
          inspectionId,
          input.recommendationId,
          user,
        );
        return NextResponse.json({
          recommendation,
          inspectionVersion: recommendation.inspectionVersion,
        });
      }
      case 'reject': {
        const recommendation = await rejectRecommendation(
          inspectionId,
          input.recommendationId,
          user,
          input.reason,
        );
        return NextResponse.json({
          recommendation,
          inspectionVersion: recommendation.inspectionVersion,
        });
      }
    }
  } catch (error) {
    return commandError(error);
  }
}
