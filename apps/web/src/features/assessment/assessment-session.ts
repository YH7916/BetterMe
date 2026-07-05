import { api } from '../../lib/api-client';
import { getAssessmentId, setAssessmentId, setToken } from '../../lib/session';

let assessmentSessionPromise: Promise<string> | null = null;

export function getPendingAssessmentSession() {
  return assessmentSessionPromise;
}

export function clearPendingAssessmentSession() {
  assessmentSessionPromise = null;
}

export function ensureAssessmentSession() {
  const existing = getAssessmentId();
  if (existing) return Promise.resolve(existing);
  if (assessmentSessionPromise) return assessmentSessionPromise;

  assessmentSessionPromise = api.createAssessment()
    .then((session) => {
      setToken(session.token);
      setAssessmentId(session.assessmentId);
      return session.assessmentId;
    })
    .finally(() => {
      assessmentSessionPromise = null;
    });

  return assessmentSessionPromise;
}
