import { useFunnel } from '../features/assessment/hooks/useFunnel';
import { GenderStep } from '../features/assessment/steps/GenderStep';
import { GoalStep } from '../features/assessment/steps/GoalStep';
import { BodyStep } from '../features/assessment/steps/BodyStep';
import { FrequencyStep } from '../features/assessment/steps/FrequencyStep';

export function FunnelPage() {
  const { step, ready, error, saveError, next } = useFunnel();
  if (error) return (
    <div className="app-shell">
      <div className="container step-card">
        <p className="error-banner">加载失败：{error}</p>
        <button className="primary-button" onClick={() => window.location.reload()}>重试 / Retry</button>
      </div>
    </div>
  );
  if (!ready) return <div className="app-shell"><div className="container status-card">加载中…</div></div>;
  return (
    <main className="app-shell">
      <div className="progress-shell">
        <div className="progress-meta">
          <span>BetterMe Assessment</span>
          <span>{Math.min(step + 1, 4)} / 4</span>
        </div>
        <progress value={Math.min(step + 1, 4)} max={4} />
      </div>
      {saveError && (
        <div className="container error-banner" role="alert">
          {saveError}
        </div>
      )}
      {step === 0 && <GenderStep onNext={next} />}
      {step === 1 && <GoalStep onNext={next} />}
      {step === 2 && <BodyStep onNext={next} />}
      {step === 3 && <FrequencyStep onNext={next} />}
      {step >= 4 && <div className="container status-card">正在生成结果…</div>}
    </main>
  );
}
