import type { AssessmentResult } from '@prisma/client';

export function serializeResult(r: AssessmentResult, isMember: boolean) {
  const base = {
    bmi: Number(r.bmi),
    bmi_category: r.bmiCategory,
  };
  if (!isMember) {
    return { ...base, locked: true as const, message: '升级会员查看每日建议摄入与目标达成日期' };
  }
  return {
    ...base,
    daily_calorie_intake: r.dailyCalorieIntake,
    target_date: r.targetDate.toISOString().slice(0, 10),
    algorithm_version: r.algorithmVersion,
  };
}
