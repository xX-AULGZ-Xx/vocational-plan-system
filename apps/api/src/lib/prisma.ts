import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Helper to serialize BigInt for JSON responses
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
