import { useState } from 'react';
import { stepUpdateSchema } from '@betterme/shared';

interface BodyData {
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
}

export function BodyStep({ onNext }: { onNext: (p: BodyData) => void }) {
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [error, setError] = useState('');

  function handleNext() {
    const candidate = {
      age: Number(age),
      height_cm: Number(height),
      weight_kg: Number(weight),
      target_weight_kg: Number(targetWeight),
    };

    const result = stepUpdateSchema.safeParse(candidate);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '请检查输入');
      return;
    }

    setError('');
    onNext(candidate);
  }

  const isValid =
    age.trim() !== '' &&
    height.trim() !== '' &&
    weight.trim() !== '' &&
    targetWeight.trim() !== '';

  return (
    <section className="container step-card">
      <p className="eyebrow">Body</p>
      <h1>你的身体数据</h1>
      <p className="supporting-copy">这些数据只用于生成当前测评计划。</p>
      {error && <p className="error-banner" role="alert">{error}</p>}

      <div className="field-grid">
      <div className="field">
        <label htmlFor="age">年龄 / Age</label>
        <input
          id="age"
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          min={13}
          max={120}
          placeholder="岁"
        />
      </div>

      <div className="field">
        <label htmlFor="height">身高 / Height (cm)</label>
        <input
          id="height"
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          min={50}
          max={260}
          placeholder="cm"
        />
      </div>

      <div className="field">
        <label htmlFor="weight">体重 / Weight (kg)</label>
        <input
          id="weight"
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          min={20}
          max={500}
          placeholder="kg"
        />
      </div>

      <div className="field">
        <label htmlFor="target_weight">目标体重 / Target Weight (kg)</label>
        <input
          id="target_weight"
          type="number"
          value={targetWeight}
          onChange={(e) => setTargetWeight(e.target.value)}
          min={20}
          max={500}
          placeholder="kg"
        />
      </div>
      </div>

      <button className="primary-button" disabled={!isValid} onClick={handleNext}>
        下一步 / next
      </button>
    </section>
  );
}
