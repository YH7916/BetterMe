export type MaskedResult = {
  bmi: number;
  bmi_category: string;
  locked: true;
  message: string;
};

export type FullResult = {
  bmi: number;
  bmi_category: string;
  daily_calorie_intake: number;
  target_date: string;
  algorithm_version: string;
};

export type ResultResponse =
  | { member: false; result: MaskedResult }
  | { member: true; result: FullResult };
