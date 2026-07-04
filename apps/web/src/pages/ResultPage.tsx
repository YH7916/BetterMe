import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import { clearSession, getUserId, getAssessmentId } from '../lib/session';
import { ResultView } from '../features/result/ResultView';
import { Paywall } from '../features/paywall/Paywall';
import type { ResultResponse } from '../features/result/types';
import { clearPendingAssessmentSession, getPendingAssessmentSession } from '../features/assessment/assessment-session';
import { clearAssessmentSnapshot, getFullResultPreview, getMaskedResultPreview } from '../features/assessment/assessment-snapshot';

const RESULT_POLL_MS = 1000;
const GENERATION_ERROR_KEY = 'bm_result_generation_error';

function messageOf(err: unknown) {
  return err instanceof Error ? err.message : '请求失败，请重试。';
}

function isResultPending(err: unknown) {
  return /result not ready|assessment data incomplete/i.test(messageOf(err));
}

export function ResultPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ResultResponse | null>(() => (
    getAssessmentId() || getPendingAssessmentSession() ? getMaskedResultPreview() : null
  ));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function resolveAssessmentId() {
    const existing = getAssessmentId();
    if (existing) return existing;

    const pendingSession = getPendingAssessmentSession();
    if (!pendingSession) return null;

    setGenerating(true);
    return pendingSession;
  }

  async function prepareResult(assessmentId: string) {
    const queuedError = sessionStorage.getItem(GENERATION_ERROR_KEY);
    if (queuedError) throw new Error(queuedError);

    const progress = await api.getProgress(assessmentId);
    if (progress.current_step >= 4 && progress.status !== 'completed') {
      await api.submit(assessmentId);
    }
  }

  async function load({ preserveExisting = false }: { preserveExisting?: boolean } = {}) {
    let id: string | null = null;
    let prepared = false;
    try {
      id = await resolveAssessmentId();
      if (!id) {
        setLoadError('请先完成测评 / Start assessment first');
        return 'failed' as const;
      }

      setLoadError(null);
      await prepareResult(id);
      prepared = true;
      const result = await api.getResult(id);
      setState(result);
      setGenerating(false);
      return 'loaded' as const;
    } catch (err) {
      if (isResultPending(err)) {
        setGenerating(true);
        try {
          if (!id) return 'pending' as const;
          if (!prepared) {
            await prepareResult(id);
          }
          const result = await api.getResult(id);
          sessionStorage.removeItem(GENERATION_ERROR_KEY);
          setState(result);
          setGenerating(false);
          return 'loaded' as const;
        } catch (pendingErr) {
          if (isResultPending(pendingErr)) return 'pending' as const;
          const message = messageOf(pendingErr);
          if (preserveExisting || state) {
            setPayError(`刷新失败：${message}`);
            return 'failed' as const;
          }
          setGenerating(false);
          setLoadError(message);
          return 'failed' as const;
        }
      }

      const message = messageOf(err);
      if (preserveExisting || state) {
        setPayError(`刷新失败：${message}`);
        return 'failed' as const;
      }
      setLoadError(message);
      return 'failed' as const;
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      const status = await load();
      if (!cancelled && status === 'pending') {
        timer = setTimeout(() => void tick(), RESULT_POLL_MS);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Polling is intentionally started once; adding load would restart timers after every result state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay() {
    const previousState = state;
    const optimisticFullPreview = getFullResultPreview();
    setPaying(true);
    setPayError(null);
    if (optimisticFullPreview) setState(optimisticFullPreview);
    try {
      const id = await resolveAssessmentId();
      const userId = getUserId();
      if (!id || !userId) throw new Error('支付信息还未准备好，请重试。');
      await api.pay(userId, id);
      const fullPreview = getFullResultPreview();
      if (fullPreview) {
        setState(fullPreview);
        setPaying(false);
        void load({ preserveExisting: true }).then((status) => {
          if (status === 'pending') {
            setPayError('会员已开通，完整结果正在同步，请稍后重试。');
          }
        });
        return;
      }
      const status = await load({ preserveExisting: true });
      if (status === 'pending') {
        setPayError('会员已开通，完整结果正在同步，请稍后重试。');
      }
    } catch (err) {
      if (optimisticFullPreview) setState(previousState);
      setPayError(messageOf(err));
    } finally {
      setPaying(false);
    }
  }

  function restartDemo() {
    clearSession();
    clearAssessmentSnapshot();
    clearPendingAssessmentSession();
    sessionStorage.removeItem(GENERATION_ERROR_KEY);
    navigate('/');
  }

  if (loadError && !state) {
    return (
      <main className="app-shell">
      <div className="container step-card">
        <p className="error-banner">加载失败：{loadError}</p>
        <a href="/">重新开始 / Start assessment</a>
      </div>
      </main>
    );
  }

  if (generating && !state) {
    return (
      <main className="app-shell">
      <div className="container status-card">
        <h2>正在生成结果…</h2>
        <p>我们正在保存你的最后一步并生成计划，完成后会自动显示。</p>
      </div>
      </main>
    );
  }

  if (!state) return <main className="app-shell"><div className="container status-card">加载中…</div></main>;

  return (
    <main className="app-shell">
      <ResultView data={state} />
      {!state.member && <Paywall onPay={() => void pay()} loading={paying} />}
      {payError && <p className="container error-banner" role="alert">{payError}</p>}
      <div className="container result-actions">
        <button className="secondary-button" type="button" onClick={restartDemo}>
          重新开始 / Restart demo
        </button>
      </div>
    </main>
  );
}
