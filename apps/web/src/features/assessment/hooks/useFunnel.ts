import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StepData } from '../../../store/funnel';
import { api } from '../../../lib/api-client';
import { getUserId, getAssessmentId } from '../../../lib/session';
import { ensureAssessmentSession } from '../assessment-session';
import { saveAssessmentSnapshot } from '../assessment-snapshot';

export function useFunnel() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initiated = useRef(false);
  const pendingSave = useRef<{ data: StepData; nextStep: number } | null>(null);
  const saveLoop = useRef<Promise<void> | null>(null);
  const nav = useNavigate();

  function ensureSession() {
    return ensureAssessmentSession()
      .catch((err) => {
        setError(err instanceof Error ? err.message : '初始化失败，请检查网络后重试。');
        throw err;
      });
  }

  function flushSaves() {
    if (saveLoop.current) return saveLoop.current;

    saveLoop.current = (async () => {
      const assessmentId = await ensureSession();
      while (pendingSave.current) {
        const nextSave = pendingSave.current;
        pendingSave.current = null;
        await api.saveStep(assessmentId, { ...nextSave.data, current_step: nextSave.nextStep });
      }
    })().finally(() => {
      saveLoop.current = null;
      if (pendingSave.current) return flushSaves();
      return undefined;
    });

    return saveLoop.current;
  }

  function enqueueSave(snapshot: StepData, nextStep: number) {
    const current = pendingSave.current;
    pendingSave.current = {
      data: { ...(current?.data ?? {}), ...snapshot },
      nextStep: Math.max(current?.nextStep ?? 0, nextStep),
    };

    return flushSaves();
  }

  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;
    void (async () => {
      try {
        const existing = getAssessmentId();
        if (existing) {
          const p = await api.getProgress(existing);
          const { assessmentId: _aid, userId: _uid, current_step, status: _st, ...stepFields } = p;
          if (_st === 'completed') {
            nav('/result');
            return;
          }
          setData({
            gender: stepFields.gender ?? undefined,
            primary_goal: stepFields.primary_goal ?? undefined,
            age: stepFields.age ?? undefined,
            height_cm: stepFields.height_cm ?? undefined,
            weight_kg: stepFields.weight_kg ?? undefined,
            target_weight_kg: stepFields.target_weight_kg ?? undefined,
            workout_frequency: stepFields.workout_frequency ?? undefined,
          });
          setStep(current_step);
        } else {
          setReady(true);
          void ensureSession().catch(() => undefined);
          return;
        }
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '初始化失败，请检查网络后重试。');
      }
    })();
  }, [nav]);

  async function next(patch: StepData = {}, options: { complete?: boolean } = {}) {
    const merged = { ...data, ...patch };
    setData(merged);
    saveAssessmentSnapshot(merged);
    const nextStep = step + 1;

    setSaveError(null);

    if (options.complete) {
      setStep(nextStep);
      nav('/result');
      void (async () => {
        await enqueueSave(merged, nextStep);
        const assessmentId = await ensureSession();
        await api.submit(assessmentId);
      })().catch((err) => {
        sessionStorage.setItem(
          'bm_result_generation_error',
          err instanceof Error ? err.message : '结果生成失败，请重试。',
        );
      });
    } else {
      setStep(nextStep);
      void enqueueSave(merged, nextStep).catch((err) => {
        setSaveError(err instanceof Error ? `保存失败：${err.message}` : '保存失败，请重试。');
      });
    }
  }

  return { step, data, ready, error, saveError, next, userId: getUserId() };
}
