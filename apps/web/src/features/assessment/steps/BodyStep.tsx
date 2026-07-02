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
    <div className="container">
      <h2>你的身体数据 / Body Info</h2>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      <div>
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

      <div>
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

      <div>
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

      <div>
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

      <button disabled={!isValid} onClick={handleNext}>
        下一步 / next
      </button>
    </div>
  );
}
