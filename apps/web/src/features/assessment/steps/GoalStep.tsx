import { useState } from 'react';
import type { Goal } from '@betterme/shared';

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose_weight', label: '减脂 / lose weight' },
  { value: 'gain_muscle', label: '增肌 / gain muscle' },
  { value: 'maintain', label: '维持 / maintain' },
];

export function GoalStep({ onNext }: { onNext: (p: { primary_goal: Goal }) => void }) {
  const [goal, setGoal] = useState<Goal>();
  return (
    <section className="container step-card">
      <p className="eyebrow">Goal</p>
      <h1>你的主要目标</h1>
      <p className="supporting-copy">计划会根据目标调整热量范围和达成周期。</p>
      <div className="choice-grid">
      {GOALS.map((g) => (
        <button
          key={g.value}
          className="choice-button"
          aria-pressed={goal === g.value}
          onClick={() => setGoal(g.value)}
        >
          {g.label}
        </button>
      ))}
      </div>
      <button className="primary-button" disabled={!goal} onClick={() => onNext({ primary_goal: goal! })}>
        下一步 / next
      </button>
    </section>
  );
}
