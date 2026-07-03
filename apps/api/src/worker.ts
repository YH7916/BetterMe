/**
 * Cloudflare Workers entry point (optional deployment path).
 *
 * Primary recommended deployment: Node host (Render/Railway) using server.ts.
 * This file enables an ALTERNATIVE Workers deployment when:
 *   1. wrangler.toml is configured (see apps/api/wrangler.toml)
 *   2. Prisma is configured with the driverAdapters preview feature +
 *      @prisma/adapter-pg pointing at the Supabase pooler (:6543).
 *      See README.md §Deployment for the adapter setup steps.
 *
 * NOTE: lib/prisma.ts is intentionally kept as plain PrismaClient (Node path)
 * to keep the Node/test path clean. If you wire up the driver adapter you will
 * need to modify lib/prisma.ts separately — do not commit that change to the
 * main branch without ensuring the integration test suite still passes.
 */
import { createApp } from './app';

export default { fetch: createApp().fetch };
