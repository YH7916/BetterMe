import type { StepUpdate } from '@betterme/shared';
import type { ResultResponse } from '../features/result/types';
import { getUserId } from './session';

async function req<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const uid = getUserId();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(uid ? { 'x-user-id': uid } : {}), ...init.headers },
  });
  if (!res.ok) throw new Error(((await res.json()) as { error?: { message?: string } }).error?.message ?? 'request failed');
  return res.json() as Promise<T>;
}

export const api = {
  createAssessment: () => req<{ userId: string; assessmentId: string; currentStep: number }>('/assessments', { method: 'POST' }),
  getProgress: (id: string) => req<Record<string, unknown>>(`/assessments/${id}`),
  saveStep: (id: string, data: StepUpdate) => req<Record<string, unknown>>(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  submit: (id: string) => req<{ status: string }>(`/assessments/${id}/submit`, { method: 'POST' }),
  getResult: (id: string) => req<ResultResponse>(`/assessments/${id}/result`),
  pay: (userId: string, assessmentId: string) => req<{ status: string }>('/pay', { method: 'POST', body: JSON.stringify({ userId, assessmentId }) }),
};
