import { z } from 'zod';
import {
  OpenApiGeneratorV31,
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { stepUpdateSchema, submitSchema, paySchema } from '@betterme/shared';

extendZodWithOpenApi(z);

const idParam = { id: z.string().uuid() };
const json = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });

function buildDocument() {
  const registry = new OpenAPIRegistry();

  const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
  });
  const secured = [{ [bearerAuth.name]: [] }];

  const StepUpdate = registry.register('StepUpdate', stepUpdateSchema.openapi('StepUpdate'));
  registry.register('AssessmentInput', submitSchema.openapi('AssessmentInput'));
  const Pay = registry.register('PayRequest', paySchema.openapi('PayRequest'));

  const SessionCreated = z.object({
    token: z.string(),
    assessmentId: z.string().uuid(),
    currentStep: z.number().int(),
  });

  const Progress = z.object({
    assessmentId: z.string().uuid(),
    gender: z.string().nullable(),
    primary_goal: z.string().nullable(),
    age: z.number().nullable(),
    height_cm: z.number().nullable(),
    weight_kg: z.number().nullable(),
    target_weight_kg: z.number().nullable(),
    workout_frequency: z.string().nullable(),
    current_step: z.number().int(),
    status: z.enum(['in_progress', 'completed']),
  });

  const ResultView = z.object({
    member: z.boolean(),
    result: z.object({
      bmi: z.number(),
      bmi_category: z.string(),
      locked: z.boolean().optional(),
      message: z.string().optional(),
      daily_calorie_intake: z.number().optional(),
      target_date: z.string().optional(),
      algorithm_version: z.string().optional(),
    }),
  });

  registry.registerPath({
    method: 'post', path: '/assessments', tags: ['assessment'],
    summary: 'Start a new assessment and issue a session token',
    responses: { 201: { description: 'created', ...json(SessionCreated) } },
  });
  registry.registerPath({
    method: 'get', path: '/assessments/{id}', tags: ['assessment'], security: secured,
    summary: 'Recover saved progress',
    request: { params: z.object(idParam) },
    responses: { 200: { description: 'progress', ...json(Progress) }, 401: { description: 'unauthorized' }, 403: { description: 'forbidden' }, 404: { description: 'not found' } },
  });
  registry.registerPath({
    method: 'patch', path: '/assessments/{id}', tags: ['assessment'], security: secured,
    summary: 'Incrementally save a step',
    request: { params: z.object(idParam), body: json(StepUpdate) },
    responses: { 200: { description: 'progress', ...json(Progress) }, 400: { description: 'validation error' } },
  });
  registry.registerPath({
    method: 'post', path: '/assessments/{id}/submit', tags: ['assessment'], security: secured,
    summary: 'Finalize inputs and compute the result',
    request: { params: z.object(idParam) },
    responses: { 200: { description: 'completed' }, 400: { description: 'incomplete' } },
  });
  registry.registerPath({
    method: 'get', path: '/assessments/{id}/result', tags: ['assessment'], security: secured,
    summary: 'Fetch the result (masked for non-members)',
    request: { params: z.object(idParam) },
    responses: { 200: { description: 'result', ...json(ResultView) } },
  });
  registry.registerPath({
    method: 'delete', path: '/assessments/{id}', tags: ['assessment'], security: secured,
    summary: 'Permanently delete an assessment and its derived data (GDPR)',
    request: { params: z.object(idParam) },
    responses: { 204: { description: 'deleted' } },
  });
  registry.registerPath({
    method: 'post', path: '/pay', tags: ['subscription'], security: secured,
    summary: 'Mock payment callback — activates the subscription',
    request: { body: json(Pay) },
    responses: { 200: { description: 'active' }, 403: { description: 'not your assessment' } },
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: { title: 'BetterMe Assessment API', version: '1.0.0', description: 'Health-assessment funnel backend.' },
    servers: [{ url: '/api/v1' }],
  });
}

let cached: object | null = null;

/** Generates (once, lazily) the OpenAPI 3.1 document for the versioned API surface. */
export function getOpenApiDocument() {
  if (!cached) cached = buildDocument();
  return cached;
}
