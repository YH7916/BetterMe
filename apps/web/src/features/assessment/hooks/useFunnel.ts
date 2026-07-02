import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StepData } from '../../../store/funnel';
import { api } from '../../../lib/api-client';
import { getUserId, setUserId, getAssessmentId, setAssessmentId } from '../../../lib/session';

export function useFunnel() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>({});
  const [ready, setReady] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const existing = getAssessmentId();
      if (existing) {
        const p = await api.getProgress(existing);
        setData(p);
        setStep(p.current_step ?? 0);
      } else {
        const s = await api.createAssessment();
        setUserId(s.userId);
        setAssessmentId(s.assessmentId);
      }
      setReady(true);
    })();
  }, []);

  async function next(patch: StepData) {
    const merged = { ...data, ...patch };
    setData(merged);
    const nextStep = step + 1;
    await api.saveStep(getAssessmentId()!, { ...patch, current_step: nextStep });
    if (nextStep >= 4) {
      await api.submit(getAssessmentId()!);
      nav('/result');
    } else {
      setStep(nextStep);
    }
  }

  return { step, data, ready, next, userId: getUserId() };
}
