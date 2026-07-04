import { useEffect, useRef, useState } from 'react';
import { stepUpdateSchema } from '@betterme/shared';
import type { StepData } from '../store/funnel';
import { useFunnel } from '../features/assessment/hooks/useFunnel';

const AUTO_ADVANCE_MS = 260;

type FunnelStage = 1 | 2 | 3 | 4 | 5;

interface BaseQuestion {
  stage: FunnelStage;
  stageLabel: string;
  eyebrow: string;
  title: string;
  supportingCopy: string;
  complete?: boolean;
}

interface ChoiceOption {
  label: string;
  detail: string;
  patch?: StepData;
}

interface ChoiceQuestion extends BaseQuestion {
  kind: 'choice';
  options: ChoiceOption[];
}

interface NumberQuestion extends BaseQuestion {
  kind: 'number';
  field: 'age' | 'height_cm' | 'weight_kg' | 'target_weight_kg';
  label: string;
  placeholder: string;
  min: number;
  max: number;
}

type FunnelQuestion = ChoiceQuestion | NumberQuestion;

const QUESTIONS: FunnelQuestion[] = [
  {
    kind: 'choice',
    stage: 1,
    stageLabel: '兴趣切入',
    eyebrow: 'Pilates',
    title: '你平时喜欢普拉提吗？',
    supportingCopy: '先从一个很轻的问题开始。选择最接近你现在状态的一项就好。',
    options: [
      { label: '喜欢，想坚持下去', detail: '已经感受到它对体态和线条的帮助。' },
      { label: '有兴趣，还没开始', detail: '想先看看它是否适合自己。' },
      { label: '试过，但没坚持住', detail: '希望这次能有更清晰的路径。' },
      { label: '想看看适不适合', detail: '还在了解阶段，不想给自己太大压力。' },
    ],
  },
  {
    kind: 'choice',
    stage: 1,
    stageLabel: '兴趣切入',
    eyebrow: 'Direction',
    title: '你更希望通过普拉提改善什么？',
    supportingCopy: '你的答案会影响后面结果里的目标判断和建议方向。',
    options: [
      { label: '瘦下来', detail: '先减轻身体负担，看起来更轻盈。', patch: { primary_goal: 'lose_weight' } },
      { label: '体态更好', detail: '改善圆肩、含胸和日常姿态。', patch: { primary_goal: 'maintain' } },
      { label: '腰腹更紧致', detail: '更关注核心力量和线条感。', patch: { primary_goal: 'lose_weight' } },
      { label: '腿臀线条更明显', detail: '希望身体更有支撑和轮廓。', patch: { primary_goal: 'gain_muscle' } },
    ],
  },
  {
    kind: 'choice',
    stage: 2,
    stageLabel: '当前状态',
    eyebrow: 'Current',
    title: '你觉得自己现在的身材更接近哪一种？',
    supportingCopy: '这里没有标准答案。真实一点，后面的判断才会更贴合你。',
    options: [
      { label: '整体偏胖', detail: '希望先看到体重和围度变化。' },
      { label: '腰腹容易囤肉', detail: '最在意小腹、腰线和核心状态。' },
      { label: '下半身偏粗', detail: '更关注腿臀比例和轻盈感。' },
      { label: '体重还好，但线条不明显', detail: '想让身体更紧致、有型。' },
      { label: '偏瘦，想更有型', detail: '希望增加力量感和身体支撑。' },
    ],
  },
  {
    kind: 'choice',
    stage: 2,
    stageLabel: '当前状态',
    eyebrow: 'Focus',
    title: '你最想先改善哪个部位？',
    supportingCopy: '先抓住一个最在意的地方，计划会更容易开始。',
    options: [
      { label: '小腹', detail: '希望腹部更平坦、更轻松。' },
      { label: '腰线', detail: '想让比例看起来更清楚。' },
      { label: '臀腿', detail: '希望下半身更紧致、更有线条。' },
      { label: '手臂', detail: '想改善松弛感和上身轮廓。' },
      { label: '整体体态', detail: '希望站姿、气质和状态一起变好。' },
    ],
  },
  {
    kind: 'choice',
    stage: 3,
    stageLabel: '期望结果',
    eyebrow: 'Outcome',
    title: '你期待自己的身材更接近哪种状态？',
    supportingCopy: '我们会把这个期待转成后续结果里的目标路径。',
    options: [
      { label: '轻盈显瘦', detail: '整体看起来更轻、更利落。' },
      { label: '腰腹紧致', detail: '核心更稳定，穿衣更有安全感。' },
      { label: '腿臀有线条', detail: '下半身比例更清楚。' },
      { label: '体态挺拔', detail: '日常状态更舒展、有气质。' },
      { label: '整体更有气质', detail: '希望体重、线条和状态一起改善。' },
    ],
  },
  {
    kind: 'choice',
    stage: 3,
    stageLabel: '期望结果',
    eyebrow: 'Pace',
    title: '你希望多久看到变化？',
    supportingCopy: '节奏不用激进。能持续，才更容易真的改变。',
    options: [
      { label: '7 天先有感觉', detail: '希望先建立一点正反馈。' },
      { label: '14 天看到一点变化', detail: '想要短期内看到方向。' },
      { label: '28 天形成明显改善', detail: '愿意给自己一个完整周期。' },
      { label: '慢慢来，能坚持最重要', detail: '优先选择稳定和不反弹。' },
    ],
  },
  {
    kind: 'choice',
    stage: 4,
    stageLabel: '基础数据',
    eyebrow: 'Profile',
    title: '你的性别是？',
    supportingCopy: '这会用于估算基础代谢和每日建议摄入。',
    options: [
      { label: '女性', detail: '按女性基础代谢模型估算。', patch: { gender: 'female' } },
      { label: '男性', detail: '按男性基础代谢模型估算。', patch: { gender: 'male' } },
    ],
  },
  {
    kind: 'number',
    stage: 4,
    stageLabel: '基础数据',
    eyebrow: 'Age',
    title: '你的年龄是？',
    supportingCopy: '年龄会影响基础代谢估算。这里仅用于本次测评结果。',
    field: 'age',
    label: '年龄',
    placeholder: '例如 28',
    min: 13,
    max: 120,
  },
  {
    kind: 'number',
    stage: 4,
    stageLabel: '基础数据',
    eyebrow: 'Height',
    title: '你的身高是？',
    supportingCopy: '身高会和体重一起用于计算 BMI 和基础身体状态。',
    field: 'height_cm',
    label: '身高 cm',
    placeholder: '例如 165',
    min: 50,
    max: 260,
  },
  {
    kind: 'number',
    stage: 4,
    stageLabel: '基础数据',
    eyebrow: 'Weight',
    title: '你现在的体重是多少？',
    supportingCopy: '写下当前真实状态就好，它只是生成建议的起点。',
    field: 'weight_kg',
    label: '当前体重 kg',
    placeholder: '例如 70',
    min: 20,
    max: 500,
  },
  {
    kind: 'number',
    stage: 4,
    stageLabel: '基础数据',
    eyebrow: 'Target',
    title: '你的目标体重是多少？',
    supportingCopy: '可以比现在更低、更高或接近现在，按你期待的状态填写就好。',
    field: 'target_weight_kg',
    label: '目标体重 kg',
    placeholder: '例如 60',
    min: 20,
    max: 500,
  },
  {
    kind: 'choice',
    stage: 5,
    stageLabel: '生活节奏',
    eyebrow: 'Rhythm',
    title: '你现在每周运动几次？',
    supportingCopy: '选择最近两周最接近的状态，不需要假装很自律。',
    options: [
      { label: '几乎不运动', detail: '想先从很低压力的动作开始。', patch: { workout_frequency: 'sedentary' } },
      { label: '1-2 次', detail: '偶尔会运动，但还不稳定。', patch: { workout_frequency: 'light' } },
      { label: '3-4 次', detail: '已经有一定习惯，想提高效果。', patch: { workout_frequency: 'moderate' } },
      { label: '5 次以上', detail: '运动频率较高，希望更系统。', patch: { workout_frequency: 'active' } },
    ],
  },
  {
    kind: 'choice',
    stage: 5,
    stageLabel: '生活节奏',
    eyebrow: 'Blocker',
    title: '你最容易卡在哪一步？',
    supportingCopy: '最后一个问题。它会帮助我们判断完整方案最需要解决什么。',
    complete: true,
    options: [
      { label: '不知道怎么练', detail: '需要更清楚的每日动作安排。' },
      { label: '坚持不下来', detail: '需要更轻的起步和持续反馈。' },
      { label: '饮食控制不好', detail: '需要知道每天摄入该怎么把握。' },
      { label: '练了但变化不明显', detail: '需要重新匹配目标和节奏。' },
      { label: '时间太碎片化', detail: '需要更短、更容易嵌入日常的计划。' },
    ],
  },
];

export function FunnelPage() {
  const { step, data, ready, error, saveError, next } = useFunnel();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQuestion = QUESTIONS[step];

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  function handleChoice(question: ChoiceQuestion, option: ChoiceOption) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setSelectedLabel(option.label);
    feedbackTimer.current = setTimeout(() => {
      setSelectedLabel(null);
      void next(option.patch ?? {}, { complete: question.complete });
    }, AUTO_ADVANCE_MS);
  }

  if (error) return (
    <main className="app-shell assessment-shell">
      <div className="container status-card">
        <p className="error-banner">加载失败：{error}</p>
        <button className="primary-button" onClick={() => window.location.reload()}>重试</button>
      </div>
    </main>
  );

  if (!ready) {
    return (
      <main className="app-shell assessment-shell">
        <div className="container status-card">正在准备测评…</div>
      </main>
    );
  }

  if (!activeQuestion) {
    return (
      <main className="app-shell assessment-shell">
        <div className="container status-card">
          <h2>正在生成结果…</h2>
          <p>正在分析你的目标、身体数据和生活节奏。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell assessment-shell">
      <div className="assessment-frame">
        <header className="assessment-topbar">
          <span>身体状态测评</span>
          <span>{activeQuestion.stage} / 5 · {activeQuestion.stageLabel}</span>
        </header>

        <div className="progress-shell assessment-progress" aria-label="测评进度">
          <progress value={activeQuestion.stage} max={5} />
        </div>

        {saveError && (
          <div className="error-banner" role="alert">
            {saveError}
          </div>
        )}

        <div className="assessment-layout">
          <section className="question-panel">
            <p className="eyebrow">{activeQuestion.eyebrow}</p>
            <h1>{activeQuestion.title}</h1>
            <p className="supporting-copy">{activeQuestion.supportingCopy}</p>

            {activeQuestion.kind === 'choice' ? (
              <ChoiceQuestionView
                question={activeQuestion}
                selectedLabel={selectedLabel}
                onSelect={handleChoice}
              />
            ) : (
              <NumberQuestionView
                question={activeQuestion}
                data={data}
                onNext={(patch) => void next(patch)}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ChoiceQuestionView({
  question,
  selectedLabel,
  onSelect,
}: {
  question: ChoiceQuestion;
  selectedLabel: string | null;
  onSelect: (question: ChoiceQuestion, option: ChoiceOption) => void;
}) {
  return (
    <div className="choice-grid assessment-choice-grid">
      {question.options.map((option, index) => {
        const selected = selectedLabel === option.label;
        return (
          <button
            key={option.label}
            type="button"
            className="choice-button assessment-choice"
            aria-pressed={selected}
            onClick={() => onSelect(question, option)}
          >
            <span className="choice-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="choice-copy">
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </span>
            <span className="choice-check" aria-hidden="true">✓</span>
          </button>
        );
      })}
    </div>
  );
}

function NumberQuestionView({
  question,
  data,
  onNext,
}: {
  question: NumberQuestion;
  data: StepData;
  onNext: (patch: StepData) => void;
}) {
  const [value, setValue] = useState(data[question.field]?.toString() ?? '');
  const [error, setError] = useState('');

  function handleNext() {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      setError('请填写有效数字。');
      return;
    }

    const candidate = { [question.field]: numericValue } as StepData;
    const result = stepUpdateSchema.safeParse({ ...data, ...candidate });
    if (!result.success) {
      setError(friendlyNumberError(question.field));
      return;
    }

    setError('');
    onNext(candidate);
  }

  const isValid = value.trim() !== '';

  return (
    <div className="number-form">
      {error && <p className="error-banner" role="alert">{error}</p>}

      <div className="field single-field">
        <label htmlFor={question.field}>{question.label}</label>
        <input
          id={question.field}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min={question.min}
          max={question.max}
          placeholder={question.placeholder}
          autoFocus
        />
      </div>

      <button className="primary-button form-submit" disabled={!isValid} onClick={handleNext}>
        继续
      </button>
    </div>
  );
}

function friendlyNumberError(field: NumberQuestion['field']) {
  switch (field) {
    case 'age':
      return '年龄请填写 13 到 120 之间的整数。';
    case 'height_cm':
      return '身高请填写 50 到 260 cm 之间。';
    case 'weight_kg':
      return '当前体重请填写 20 到 500 kg 之间。';
    case 'target_weight_kg':
      return '目标体重请填写 20 到 500 kg 之间。';
  }
}
