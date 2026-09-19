import { PrismaClient } from '@prisma/client';

export function createTestDatabase(): PrismaClient {
  return new PrismaClient();
}

export async function closeTestDatabase(client: PrismaClient): Promise<void> {
  await client.$disconnect();
}
