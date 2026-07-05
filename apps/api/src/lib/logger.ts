import { pino } from 'pino';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Application logger. Emits structured JSON in production (ready for any log
 * drain — Railway, Datadog, etc.) and human-readable output in development.
 *
 * To forward errors to an external tracker (e.g. Sentry), wrap or add a
 * transport here — the error handler already calls `logger.error({ err })`
 * with a request id, so no call-site changes would be needed.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  ...(isProd
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }),
});

export type Logger = typeof logger;
