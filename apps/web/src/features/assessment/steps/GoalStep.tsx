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
    <div className="container">
      <h2>你的目标 / Your Goal</h2>
      {GOALS.map((g) => (
        <button
          key={g.value}
          aria-pressed={goal === g.value}
          onClick={() => setGoal(g.value)}
        >
          {g.label}
        </button>
      ))}
      <button disabled={!goal} onClick={() => onNext({ primary_goal: goal! })}>
        下一步 / next
      </button>
    </div>
  );
}
