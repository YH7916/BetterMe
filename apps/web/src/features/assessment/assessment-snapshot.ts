import { calcBmi, bmiCategory } from '@betterme/shared';
import type { StepData } from '../../store/funnel';
import type { ResultResponse } from '../result/types';

const ASSESSMENT_SNAPSHOT_KEY = 'bm_assessment_snapshot';
const LOCKED_MESSAGE = '解锁完整报告查看每日建议摄入与目标达成日期';

export function saveAssessmentSnapshot(data: StepData) {
  sessionStorage.setItem(ASSESSMENT_SNAPSHOT_KEY, JSON.stringify(data));
}

export function clearAssessmentSnapshot() {
  sessionStorage.removeItem(ASSESSMENT_SNAPSHOT_KEY);
}

export function getMaskedResultPreview(): ResultResponse | null {
  const data = readSnapshot();
  if (!data) return null;
  if (typeof data.height_cm !== 'number' || typeof data.weight_kg !== 'number') return null;

  const bmi = calcBmi(data.weight_kg, data.height_cm);
  return {
    member: false,
    result: {
      bmi,
      bmi_category: bmiCategory(bmi),
      locked: true,
      message: LOCKED_MESSAGE,
    },
  };
}

function readSnapshot(): StepData | null {
  const raw = sessionStorage.getItem(ASSESSMENT_SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StepData;
  } catch {
    return null;
  }
}
