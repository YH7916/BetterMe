import type { StepUpdate } from '@betterme/shared';
import { getUserId } from './session';

async function req(path: string, init: RequestInit = {}) {
  const uid = getUserId();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(uid ? { 'x-user-id': uid } : {}), ...init.headers },
  });
  if (!res.ok) throw new Error((await res.json()).error?.message ?? 'request failed');
  return res.json();
}

export const api = {
  createAssessment: () => req('/assessments', { method: 'POST' }),
  getProgress: (id: string) => req(`/assessments/${id}`),
  saveStep: (id: string, data: StepUpdate) => req(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  submit: (id: string) => req(`/assessments/${id}/submit`, { method: 'POST' }),
  getResult: (id: string) => req(`/assessments/${id}/result`),
  pay: (userId: string, assessmentId: string) => req('/pay', { method: 'POST', body: JSON.stringify({ userId, assessmentId }) }),
};
