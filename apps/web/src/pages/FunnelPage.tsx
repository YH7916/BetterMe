import { useFunnel } from '../features/assessment/hooks/useFunnel';
import { GenderStep } from '../features/assessment/steps/GenderStep';
import { GoalStep } from '../features/assessment/steps/GoalStep';
import { BodyStep } from '../features/assessment/steps/BodyStep';
import { FrequencyStep } from '../features/assessment/steps/FrequencyStep';

export function FunnelPage() {
  const { step, ready, error, next } = useFunnel();
  if (error) return (
    <div className="container">
      <p>加载失败：{error}</p>
      <button onClick={() => window.location.reload()}>重试 / Retry</button>
    </div>
  );
  if (!ready) return <div className="container">加载中…</div>;
  return (
    <>
      <progress value={step + 1} max={4} style={{ width: '100%' }} />
      {step === 0 && <GenderStep onNext={next} />}
      {step === 1 && <GoalStep onNext={next} />}
      {step === 2 && <BodyStep onNext={next} />}
      {step === 3 && <FrequencyStep onNext={next} />}
    </>
  );
}
