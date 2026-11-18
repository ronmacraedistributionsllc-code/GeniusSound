import { PrismaClient } from '@prisma/client';

const g = globalThis as unknown as { __gsPrisma?: PrismaClient };

export const db: PrismaClient = g.__gsPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.__gsPrisma = db;
