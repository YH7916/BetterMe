import type { StepUpdate } from '@betterme/shared';
import type { ProgressResponse } from '@betterme/shared';
import type { ResultResponse } from '../features/result/types';
import { getToken } from './session';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function req<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!res.ok) throw new Error(((await res.json()) as { error?: { message?: string } }).error?.message ?? 'request failed');
  return res.json() as Promise<T>;
}

export const api = {
  createAssessment: () => req<{ token: string; assessmentId: string; currentStep: number }>('/assessments', { method: 'POST' }),
  getProgress: (id: string) => req<ProgressResponse>(`/assessments/${id}`),
  saveStep: (id: string, data: StepUpdate) => req<Record<string, unknown>>(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  submit: (id: string) => req<{ status: string }>(`/assessments/${id}/submit`, { method: 'POST' }),
  getResult: (id: string) => req<ResultResponse>(`/assessments/${id}/result`),
  pay: (assessmentId: string) => req<{
    status: string;
    payment: {
      id: string;
      provider: string;
      provider_ref: string;
      status: string;
      amount_cents: number;
      currency: string;
    } | null;
  }>('/pay', { method: 'POST', body: JSON.stringify({ assessmentId }) }),
};
