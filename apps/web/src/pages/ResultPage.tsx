import { useEffect, useState } from 'react';
import { api } from '../lib/api-client';
import { getUserId, getAssessmentId } from '../lib/session';
import { ResultView } from '../features/result/ResultView';
import { Paywall } from '../features/paywall/Paywall';
import type { ResultResponse } from '../features/result/types';

export function ResultPage() {
  const [state, setState] = useState<ResultResponse | null>(null);
  const [paying, setPaying] = useState(false);
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
    await api.pay(userId, id);
    await load();
    setPaying(false);
  }

  if (!state) return <div className="container">加载中…</div>;

  return (
    <>
      <ResultView data={state} />
      {!state.member && <Paywall onPay={() => void pay()} loading={paying} />}
    </>
  );
}
