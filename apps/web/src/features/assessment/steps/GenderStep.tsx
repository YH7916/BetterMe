import { useState } from 'react';

export function GenderStep({ onNext }: { onNext: (p: { gender: 'male' | 'female' }) => void }) {
  const [g, setG] = useState<'male' | 'female'>();
  return (
    <section className="container step-card">
      <p className="eyebrow">Profile</p>
      <h1>你的性别</h1>
      <p className="supporting-copy">用于估算基础代谢和每日建议摄入。</p>
      <div className="choice-grid two-col">
        <button className="choice-button" aria-pressed={g === 'female'} onClick={() => setG('female')}>女 / female</button>
        <button className="choice-button" aria-pressed={g === 'male'} onClick={() => setG('male')}>男 / male</button>
      </div>
      <button className="primary-button" disabled={!g} onClick={() => onNext({ gender: g! })}>下一步 / next</button>
    </section>
  );
}
