import { serve } from '@hono/node-server';
import { createApp } from './app';

serve({ fetch: createApp().fetch, port: 8787 });
console.log('API on http://localhost:8787');
