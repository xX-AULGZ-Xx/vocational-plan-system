import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('rootpassword')) {
    return process.env.DATABASE_URL;
  }
  const envPaths = [
    '/app/host_config/.env',
    '/app/host_config/apps/api/.env',
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
    '/app/.env',
    '/app/apps/api/.env',
  ];
  for (const p of envPaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
        if (match && match[1]) {
          process.env.DATABASE_URL = match[1];
          return match[1];
        }
      }
    } catch (e) {}
  }
  return process.env.DATABASE_URL || 'mysql://root:rootpassword@127.0.0.1:3306/vocational_plan_db';
}

export let prisma = new PrismaClient({
  datasources: {
    db: { url: getDatabaseUrl() },
  },
});

export function refreshPrismaClient(newUrl?: string): PrismaClient {
  const url = newUrl || getDatabaseUrl();
  process.env.DATABASE_URL = url;
  prisma = new PrismaClient({
    datasources: {
      db: { url },
    },
  });
  return prisma;
}

// Helper to serialize BigInt for JSON responses
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
