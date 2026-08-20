import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { normalizeDatabaseUrl } from './config/databaseUrl.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: true });
if (process.env.DATABASE_URL) process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const prisma = new PrismaClient();
