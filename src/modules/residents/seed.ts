import { prisma } from '@/lib/prisma';
import { encryptSensitive } from '@/modules/identity';

const SEED_SUBJECTS = [
  {
    id: 'seed-subject-tam-tru',
    displayName: 'Seed Tam Tru',
    subjectType: 'temporary_resident',
    purpose: 'temporary_resident',
    overdue: false,
  },
  {
    id: 'seed-subject-nuoc-ngoai',
    displayName: 'Seed Nuoc Ngoai',
    subjectType: 'foreign_resident',
    purpose: 'foreign_resident',
    overdue: false,
  },
  {
    id: 'seed-subject-tai-hoa-nhap',
    displayName: 'Seed Tai Hoa Nhap',
    subjectType: 'reintegration',
    purpose: 'reintegration',
    overdue: true,
  },
] as const;

export async function seedResidentDemo(organizationId: string) {
  for (const seed of SEED_SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        displayName: seed.displayName,
        subjectType: seed.subjectType,
        sensitiveProfile: encryptSensitive(`seed-profile-${seed.id}`),
      },
    });
    const existing = await prisma.subjectManagementRecord.findFirst({
      where: { subjectId: subject.id, purpose: seed.purpose },
    });
    if (!existing) {
      await prisma.subjectManagementRecord.create({
        data: {
          subjectId: subject.id,
          purpose: seed.purpose,
          assignedOrganizationId: organizationId,
          nextCheckAt: seed.overdue
            ? new Date(Date.now() - 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  return SEED_SUBJECTS.length;
}
