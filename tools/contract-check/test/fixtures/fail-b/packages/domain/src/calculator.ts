import { z } from 'zod';
import type { Kysely } from 'kysely';
import { Pool } from 'pg/lib/index.js';
export { foo } from 'fastify';

export type Schema = z.ZodType<unknown>;
export type Db = Kysely<unknown>;
export const pool = Pool;
export const later = (): Promise<unknown> => import('pg');
