import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/modules/identity';
import {
  closeIntakeReport,
  confirmIntakeReport,
  convertIntakeToIncident,
  approveIntakeTransfer,
  parseIntakeClassification,
  processIntakeReport,
  rejectIntakeReport,
  transferIntakeReport,
  verifyIntakeReport,
} from '@/modules/incidents';

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

type CommandBody = Record<string, unknown> | null;

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  const { reportId } = await context.params;
  const body = (await request.json().catch(() => null)) as CommandBody;
  if (!body || typeof body.command !== 'string') {
    return NextResponse.json({ error: 'UNKNOWN_COMMAND' }, { status: 400 });
  }
  try {
    switch (body.command) {
      case 'verify': {
        const parsed = parseIntakeClassification(body);
        return NextResponse.json({
          result: await verifyIntakeReport(reportId, user, parsed),
        });
      }
      case 'process':
        return NextResponse.json({
          result: await processIntakeReport(reportId, user, {
            processedNote: optionalString(body.processedNote),
            result: optionalString(body.result),
          }),
        });
      case 'reject': {
        const reason = optionalString(body.reason) ?? '';
        if (!reason.trim()) {
          return NextResponse.json(
            { error: 'REJECTION_REASON_REQUIRED' },
            { status: 400 },
          );
        }
        return NextResponse.json({
          result: await rejectIntakeReport(reportId, user, { reason }),
        });
      }
      case 'close':
        return NextResponse.json({
          result: await closeIntakeReport(reportId, user, {
            resultNote: optionalString(body.resultNote),
          }),
        });
      case 'convert_to_incident':
        return NextResponse.json(
          await convertIntakeToIncident(reportId, user, {
            idempotencyKey:
              request.headers.get('Idempotency-Key') ??
              optionalString(body.idempotencyKey),
          }),
        );
      case 'confirm':
        return NextResponse.json({
          result: await confirmIntakeReport(reportId, user, {
            idempotencyKey:
              request.headers.get('Idempotency-Key') ??
              optionalString(body.idempotencyKey),
          }),
        });
      case 'transfer': {
        const organizationId = optionalString(body.organizationId) ?? '';
        if (!organizationId.trim()) {
          return NextResponse.json(
            { error: 'ORGANIZATION_REQUIRED' },
            { status: 400 },
          );
        }
        return NextResponse.json({
          result: await transferIntakeReport(reportId, user, {
            organizationId,
            reason: optionalString(body.reason),
          }),
        });
      }
      case 'approve_transfer': {
        const approvalId = optionalString(body.approvalId);
        if (!approvalId) {
          return NextResponse.json(
            { error: 'APPROVAL_REQUIRED' },
            { status: 400 },
          );
        }
        return NextResponse.json({
          result: await approveIntakeTransfer(reportId, approvalId, user),
        });
      }
      default:
        return NextResponse.json({ error: 'UNKNOWN_COMMAND' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'COMMAND_FAILED';
    const status =
      message === 'FORBIDDEN'
        ? 403
        : message === 'INTAKE_NOT_FOUND'
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
