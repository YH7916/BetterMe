import { useState } from 'react';

export function GenderStep({ onNext }: { onNext: (p: { gender: 'male' | 'female' }) => void }) {
  const [g, setG] = useState<'male' | 'female'>();
  return (
    <div className="container">
      <h2>你的性别 / Your Gender</h2>
      <button aria-pressed={g === 'female'} onClick={() => setG('female')}>女 / female</button>
      <button aria-pressed={g === 'male'} onClick={() => setG('male')}>男 / male</button>
      <button disabled={!g} onClick={() => onNext({ gender: g! })}>下一步 / next</button>
    </div>
  );
}
