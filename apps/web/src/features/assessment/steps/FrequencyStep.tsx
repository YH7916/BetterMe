import { useState } from 'react';
import type { WorkoutFrequency } from '@betterme/shared';

const FREQUENCIES: { value: WorkoutFrequency; label: string }[] = [
  { value: 'sedentary', label: '久坐 / sedentary' },
  { value: 'light', label: '轻度 / light' },
  { value: 'moderate', label: '中度 / moderate' },
  { value: 'active', label: '积极 / active' },
];

export function FrequencyStep({
  onNext,
}: {
  onNext: (p: { workout_frequency: WorkoutFrequency }) => void;
}) {
  const [freq, setFreq] = useState<WorkoutFrequency>();
  return (
    <section className="container step-card">
      <p className="eyebrow">Activity</p>
      <h1>运动频率</h1>
      <p className="supporting-copy">选择最接近你最近两周状态的一项。</p>
      <div className="choice-grid">
      {FREQUENCIES.map((f) => (
        <button
          key={f.value}
          className="choice-button"
          aria-pressed={freq === f.value}
          onClick={() => setFreq(f.value)}
        >
          {f.label}
        </button>
      ))}
      </div>
      <button className="primary-button" disabled={!freq} onClick={() => onNext({ workout_frequency: freq! })}>
        下一步 / next / 完成
      </button>
    </section>
  );
}
