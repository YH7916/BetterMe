import type { ResultResponse } from './types';

export function ResultView({ data }: { data: ResultResponse }) {
  return (
    <section className="container result-card">
      <p className="eyebrow">Result</p>
      <h1>你的健康测评结果</h1>
      <div className="metric-grid">
        <div className="metric">
          <span>BMI</span>
          <strong>{data.result.bmi.toFixed(1)}</strong>
          <small>{data.result.bmi_category}</small>
        </div>
      </div>
      {data.member && (
        <div className="metric-grid">
          <div className="metric accent">
            <span>每日建议摄入</span>
            <strong>{data.result.daily_calorie_intake}</strong>
            <small>kcal</small>
          </div>
          <div className="metric">
            <span>预计达成目标</span>
            <strong>{data.result.target_date}</strong>
            <small>algorithm {data.result.algorithm_version}</small>
          </div>
        </div>
      )}
      <p className="result-disclaimer">该结果仅供健康管理参考，不能替代医生或营养师的专业建议。</p>
    </section>
  );
}
