import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StepData } from '../../../store/funnel';
import { api } from '../../../lib/api-client';
import { getUserId, setUserId, getAssessmentId, setAssessmentId } from '../../../lib/session';

export function useFunnel() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initiated = useRef(false);
  const nav = useNavigate();

  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;
    (async () => {
      try {
        const existing = getAssessmentId();
        if (existing) {
          const p = await api.getProgress(existing);
          setData(p);
          const currentStep = typeof p.current_step === 'number' ? p.current_step : 0;
          setStep(currentStep);
        } else {
          const s = await api.createAssessment();
          setUserId(s.userId);
          setAssessmentId(s.assessmentId);
        }
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '初始化失败，请检查网络后重试。');
      }
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

  return { step, data, ready, error, next, userId: getUserId() };
}
