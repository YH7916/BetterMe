import { useEffect, useState } from 'react';
import { api } from '../lib/api-client';
import { getUserId, getAssessmentId } from '../lib/session';
import { ResultView } from '../features/result/ResultView';
import { Paywall } from '../features/paywall/Paywall';
import type { ResultResponse } from '../features/result/types';

export function ResultPage() {
  const [state, setState] = useState<ResultResponse | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const id = getAssessmentId();

  async function load() {
    if (!id) return;
    setState(await api.getResult(id));
  }

  useEffect(() => {
    void load();
  }, []);

  async function pay() {
    const userId = getUserId();
    if (!id || !userId) return;
    setPaying(true);
    setPayError(null);
    try {
      await api.pay(userId, id);
      await load();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : '支付失败，请重试。');
    } finally {
      setPaying(false);
    }
  }

  if (!state) return <div className="container">加载中…</div>;

  return (
    <>
      <ResultView data={state} />
      {!state.member && <Paywall onPay={() => void pay()} loading={paying} />}
      {payError && <p style={{ color: 'red', textAlign: 'center' }}>{payError}</p>}
    </>
  );
}
