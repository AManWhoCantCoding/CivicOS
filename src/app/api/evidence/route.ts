import { NextResponse } from 'next/server';

import { assertAccess, getCurrentUser, recordAudit } from '@/modules/identity';
import {
  createGeoPoint,
  getEvidence,
  LocalEvidenceStorage,
} from '@/modules/platform';
import { createVehicleObservationEvidence } from '@/modules/vehicles';
import { createEvidence } from '@/modules/platform';

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  const resourceType = form.get('resourceType');
  const resourceId = form.get('resourceId');
  const capturedAtValue = form.get('capturedAt');
  const latitudeValue = form.get('latitude');
  const longitudeValue = form.get('longitude');
  if (
    !(file instanceof File) ||
    typeof resourceType !== 'string' ||
    typeof resourceId !== 'string'
  ) {
    return NextResponse.json({ error: 'INVALID_EVIDENCE' }, { status: 400 });
  }
  try {
    await assertAccess(user, { resourceType, resourceId }, 'mutate');
    const capturedAt =
      typeof capturedAtValue === 'string'
        ? new Date(capturedAtValue)
        : new Date();
    if (Number.isNaN(capturedAt.getTime()))
      throw new Error('INVALID_CAPTURE_TIME');
    const latitude =
      typeof latitudeValue === 'string' && latitudeValue.length
        ? Number(latitudeValue)
        : undefined;
    const longitude =
      typeof longitudeValue === 'string' && longitudeValue.length
        ? Number(longitudeValue)
        : undefined;
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new Error('GEOPOINT_INCOMPLETE');
    }
    if (latitude !== undefined && longitude !== undefined) {
      createGeoPoint(latitude, longitude);
    }
    const evidenceInput = {
      resourceType,
      resourceId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      bytes: new Uint8Array(await file.arrayBuffer()),
      capturedAt,
      actorId: user.id,
      latitude,
      longitude,
    };
    const evidence =
      resourceType === 'VehicleObservation'
        ? await createVehicleObservationEvidence(
            new LocalEvidenceStorage(),
            evidenceInput,
            user,
          )
        : await createEvidence(new LocalEvidenceStorage(), evidenceInput);
    if (resourceType !== 'VehicleObservation')
      await recordAudit({
        actor: user,
        resourceType,
        resourceId,
        operation: 'evidence.uploaded',
        metadata: {
          evidenceId: evidence.id,
          originalHash: evidence.originalHash,
        },
      });
    return NextResponse.json({ evidence }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'EVIDENCE_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 400 },
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const evidenceId = new URL(request.url).searchParams.get('evidenceId');
  if (!evidenceId)
    return NextResponse.json(
      { error: 'EVIDENCE_ID_REQUIRED' },
      { status: 400 },
    );
  const evidence = await getEvidence(evidenceId);
  if (!evidence)
    return NextResponse.json({ error: 'EVIDENCE_NOT_FOUND' }, { status: 404 });
  try {
    await assertAccess(
      user,
      { resourceType: evidence.resourceType, resourceId: evidence.resourceId },
      'read_sensitive',
    );
    const bytes = await new LocalEvidenceStorage().read(evidence.storageKey);
    await recordAudit({
      actor: user,
      resourceType: evidence.resourceType,
      resourceId: evidence.resourceId,
      operation: 'evidence.downloaded',
      metadata: {
        evidenceId: evidence.id,
        originalHash: evidence.originalHash,
      },
    });
    return new NextResponse(bytes as BodyInit, {
      headers: {
        'Content-Type': evidence.mimeType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `inline; filename="${evidence.fileName.replace(/"/g, '')}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'EVIDENCE_FAILED';
    return NextResponse.json(
      { error: message },
      { status: message === 'FORBIDDEN' ? 403 : 404 },
    );
  }
}
