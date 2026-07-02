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
    <div className="container">
      <h2>运动频率 / Workout Frequency</h2>
      {FREQUENCIES.map((f) => (
        <button
          key={f.value}
          aria-pressed={freq === f.value}
          onClick={() => setFreq(f.value)}
        >
          {f.label}
        </button>
      ))}
      <button disabled={!freq} onClick={() => onNext({ workout_frequency: freq! })}>
        下一步 / next / 完成
      </button>
    </div>
  );
}
