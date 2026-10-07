// Seed demo idempotent: reuse domain command/transaction/event boundaries.
// Khong static-import Prisma/domain o top-level: target phai duoc resolve +
// validate + ap vao env TRUOC khi cac module do khoi tao connection.
import {
  DEMO_LABELS,
  type DemoEnv,
  type DemoTarget,
  applyDemoTargetToEnv,
  assertDemoTarget,
  resolveDemoTarget,
} from './demo-db';
import { parseDemoNow } from '@/modules/platform/clock';

export function resolveSeedTarget(env: DemoEnv = process.env): DemoTarget {
  const target = resolveDemoTarget(env.DATABASE_URL, env.DEMO_DATABASE_URL);
  assertDemoTarget(target.url);
  return target;
}

export async function seedDemo(env: DemoEnv = process.env) {
  parseDemoNow(env.DEMO_NOW);
  const target = resolveSeedTarget(env);
  console.log(
    `Demo target database: ${target.displayUrl} (name=${target.dbName})`,
  );
  applyDemoTargetToEnv(target);

  const { prisma } = await import('@/lib/prisma');
  const { processOutboxUntilIdle } = await import('@/modules/eventing');
  const identityProvider = await import('@/modules/identity/local-provider');
  const incidentCommands = await import('@/modules/incidents/commands');
  const inspectionCommands = await import('@/modules/inspections/commands');
  const vehicles = await import('@/modules/vehicles/commands');
  type IdentityUser = import('@/modules/identity').IdentityUser;

  async function loadActor(email: string): Promise<IdentityUser> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? user.email,
      roles: user.roles.map(
        ({ role }) => role.name as IdentityUser['roles'][number],
      ),
      organizationUnitId: user.organizationUnitId ?? undefined,
    };
  }

  await identityProvider.ensureDevelopmentUsers();
  const [commander, duty, field] = await Promise.all([
    loadActor('truong@civicos.local'),
    loadActor('trucban@civicos.local'),
    loadActor('hientruong@civicos.local'),
  ]);

  const registered = await incidentCommands.registerIntakeReport(
    {
      sourceChannel: 'direct',
      receivedAt: new Date('2026-03-09T08:00:00.000Z').toISOString(),
      content: `${DEMO_LABELS.incident} Tin bao hu cau ve mat trat tu tai khu cho dem Nghia Tru.`,
      idempotencyKey: DEMO_LABELS.incidentKey,
    },
    duty,
  );
  let incidentId: string | null = registered.incidentId;
  if (!incidentId) {
    await incidentCommands.verifyIntakeReport(registered.reportId, duty, {
      classification: 'sufficient',
      verificationNote: 'Demo xac minh du co so.',
    });
    const { incidentId: convertedId } =
      await incidentCommands.convertIntakeToIncident(registered.reportId, duty);
    if (!convertedId) throw new Error('SEED_CONVERT_FAILED');
    incidentId = convertedId;
  }
  const assigned = await prisma.assignment.findFirst({
    where: {
      resourceType: 'Incident',
      resourceId: incidentId,
      assigneeUserId: field.id,
      status: 'active',
    },
  });
  if (!assigned)
    await incidentCommands.assignIncident(incidentId, commander, [field.id]);
  const incident = await prisma.incident.findUniqueOrThrow({
    where: { id: incidentId },
  });
  if (incident.status === 'received')
    await incidentCommands.classifyIncident(
      incidentId,
      field,
      'an_ninh_trat_tu',
      'trung_binh',
    );

  let establishment = await prisma.establishment.findFirst({
    where: { name: DEMO_LABELS.establishment, active: true },
  });
  if (!establishment) {
    establishment = await inspectionCommands.registerEstablishment(
      {
        name: DEMO_LABELS.establishment,
        ownerName: 'Nguyen Van Demo',
        address: 'Thon 1, Xa Nghia Tru (hu cau)',
        type: 'Karaoke',
      },
      commander,
    );
  }
  const scheduledAt = new Date(DEMO_LABELS.inspectionAt);
  let inspection = await prisma.inspection.findUnique({
    where: {
      establishmentId_scheduledAt: {
        establishmentId: establishment.id,
        scheduledAt,
      },
    },
  });
  if (!inspection) {
    try {
      inspection = await inspectionCommands.scheduleInspection(
        {
          establishmentId: establishment.id,
          assignedUserId: field.id,
          scheduledAt: scheduledAt.toISOString(),
        },
        commander,
      );
    } catch (error) {
      if (!(error instanceof Error && error.message === 'DUPLICATE_SCHEDULE'))
        throw error;
      inspection = await prisma.inspection.findUniqueOrThrow({
        where: {
          establishmentId_scheduledAt: {
            establishmentId: establishment.id,
            scheduledAt,
          },
        },
      });
    }
  }

  const registry = await prisma.suspiciousVehicleEntry.findMany({
    where: { plate: DEMO_LABELS.plate, status: 'active' },
  });
  if (!registry.length) {
    await vehicles.createRegistryEntry(
      {
        plate: DEMO_LABELS.plate,
        source: 'demo',
        reason: DEMO_LABELS.registryReason,
        validFrom: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      },
      commander,
    );
  }
  const { observation } = await vehicles.recordVehicleObservation(
    {
      plate: DEMO_LABELS.plate,
      observedAt: new Date('2026-03-09T20:00:00.000Z').toISOString(),
      latitude: 20.98,
      longitude: 106.05,
      description: `${DEMO_LABELS.incident} Quan sat hu cau phuc vu trinh dien.`,
      clientCommandId: DEMO_LABELS.observationKey,
    },
    field,
  );

  const { seedIdentityResidents } = await import('./seed-identity-residents');
  const identityResidents = await seedIdentityResidents();

  const { seedIntakeIncidents } = await import('./seed-intake-incidents');
  const intakeIncidents = await seedIntakeIncidents();

  const { seedInspections } = await import('./seed-inspections');
  const inspections = await seedInspections();

  const { seedVehicles } = await import('./seed-vehicles');
  const vehiclesSeed = await seedVehicles();

  const drained = await processOutboxUntilIdle();
  const [users, incidentCount, inspectionCount, observationCount] =
    await Promise.all([
      prisma.user.count({ where: { active: true } }),
      prisma.incident.count({ where: { id: incidentId } }),
      prisma.inspection.count({ where: { id: inspection.id } }),
      prisma.vehicleObservation.count({ where: { id: observation.id } }),
    ]);
  const result = {
    incidentId,
    inspectionId: inspection.id,
    observationId: observation.id,
    residentSubjectIds: identityResidents.subjectIds,
    residentRecordIds: identityResidents.recordIds,
    residentReportIds: identityResidents.reportIds,
    intakeReportIds: intakeIncidents.reportIds,
    intakeIncidentIds: intakeIncidents.incidentIds,
    inspectionScenarioIds: inspections.inspectionIds,
    inspectionScenarioStatuses: inspections.statuses,
    inspectionRecommendationIds: inspections.recommendationIds,
    vehicleRegistryIds: vehiclesSeed.registryIds,
    vehicleObservationIds: vehiclesSeed.observationIds,
    vehicleObservationStatuses: vehiclesSeed.statuses,
    vehicleEvidenceIds: vehiclesSeed.evidenceIds,
    vehicleVerificationIds: vehiclesSeed.verificationIds,
    drained,
    users,
    incidents: incidentCount,
    inspections: inspectionCount,
    observations: observationCount,
  };
  console.log(
    `seeded incident=${result.incidentId} inspection=${result.inspectionId} observation=${result.observationId} drained=${result.drained} intakes=${Object.values(result.intakeReportIds).length} inspectionScenarios=${Object.values(result.inspectionScenarioStatuses).join('/')} vehicles=${Object.values(result.vehicleObservationStatuses).join('/')}`,
  );
  return result;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/demo/seed.ts')) {
  void seedDemo().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    },
  );
}
