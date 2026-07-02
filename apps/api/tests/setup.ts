import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load .env.test but do NOT override already-set env vars (e.g. from CI).
// dotenv does not override by default, so CI-provided DATABASE_URL wins.
config({ path: resolve(import.meta.dirname, '../.env.test') });
