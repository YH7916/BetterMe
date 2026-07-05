import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import { getAssessmentId } from '../lib/session';
import { getPendingAssessmentSession } from '../features/assessment/assessment-session';
import { getMaskedResultPreview } from '../features/assessment/assessment-snapshot';

function messageOf(err: unknown) {
  return err instanceof Error ? err.message : '支付失败，请稍后重试。';
}

async function resolveAssessmentIdForPay() {
  const existing = getAssessmentId();
  if (existing) return existing;

  const pending = getPendingAssessmentSession();
  if (!pending) return null;

  return pending;
}

export function PayPage() {
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPaySession = Boolean(getAssessmentId() || getPendingAssessmentSession());
  const preview = getMaskedResultPreview();

  async function confirmPay() {
    setPaying(true);
    setError(null);
    try {
      const assessmentId = await resolveAssessmentIdForPay();
      if (!assessmentId) throw new Error('支付信息还未准备好，请先完成测评。');

      await api.pay(assessmentId);
      const result = await api.getResult(assessmentId);
      navigate('/result', { state: { result } });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPaying(false);
    }
  }

  if (!hasPaySession) {
    return (
      <main className="app-shell checkout-shell">
        <section className="container status-card">
          <p className="error-banner">请先完成测评。</p>
          <Link className="primary-button" to="/">开始测评</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell checkout-shell">
      <section className="checkout-frame">
        <div className="checkout-copy">
          <p className="eyebrow">Secure checkout</p>
          <h1>完整报告付费确认</h1>
          <p className="supporting-copy">
            你的身体状态预览已经生成。解锁后会看到更具体的每日建议、目标时间和 28 天行动路径。
          </p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-card">
            <div className="checkout-plan-head">
              <div>
                <p className="eyebrow">BetterMe AI Coach</p>
                <h2>完整报告与行动方案</h2>
              </div>
              <div className="checkout-price">
                <span>¥</span>
                <strong>19</strong>
              </div>
            </div>

            <ul className="checkout-list">
              <li>每日建议摄入与目标达成时间</li>
              <li>基于 BMI、目标和运动频率的行动建议</li>
              <li>适合低压力起步的 28 天训练路径</li>
            </ul>

            {preview && (
              <div className="checkout-preview">
                <span>当前预览 BMI</span>
                <strong>{preview.result.bmi.toFixed(1)}</strong>
              </div>
            )}

            {error && <p className="error-banner" role="alert">{error}</p>}

            <button className="primary-button" type="button" disabled={paying} onClick={() => void confirmPay()}>
              {paying ? '正在确认支付…' : '确认支付，立即解锁'}
            </button>
            <Link className="secondary-button" to="/result">返回结果预览</Link>
          </section>

          <aside className="checkout-note">
            <h3>本次为模拟支付</h3>
            <p>点击确认后会调用文档要求的 /pay 回调，把当前用户会员状态设为有效。</p>
            <p>完成后结果页会从脱敏预览切换为完整数据。</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
