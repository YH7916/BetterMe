import type { ResultResponse } from './types';

export function ResultView({ data }: { data: ResultResponse }) {
  return (
    <div className="container">
      <h2>你的健康测评结果</h2>
      <p>
        BMI：<b>{data.result.bmi.toFixed(1)}</b>（{data.result.bmi_category}）
      </p>
      {data.member && (
        <>
          <p>
            每日建议摄入：<b>{data.result.daily_calorie_intake}</b> kcal
          </p>
          <p>
            预计达成目标：<b>{data.result.target_date}</b>
          </p>
        </>
      )}
    </div>
  );
}
