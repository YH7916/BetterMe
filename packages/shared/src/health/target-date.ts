const SAFE_KG_PER_WEEK = 0.5;
const MS_PER_DAY = 86_400_000;

export function predictTargetDate(currentKg: number, targetKg: number, from: Date): Date {
  const delta = Math.abs(currentKg - targetKg);
  const weeks = delta / SAFE_KG_PER_WEEK;
  return new Date(from.getTime() + Math.round(weeks * 7) * MS_PER_DAY);
}
