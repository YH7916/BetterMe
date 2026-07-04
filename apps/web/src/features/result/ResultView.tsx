import type { ResultResponse } from './types';

export function ResultView({ data }: { data: ResultResponse }) {
  if (data.member) {
    return (
      <section className="container result-card full-result-card">
        <div className="unlock-banner">
          <span>会员已解锁</span>
          <small>完整报告与行动方案已开放</small>
        </div>

        <p className="eyebrow">Complete result</p>
        <h1>你的完整身体状态报告</h1>
        <p className="supporting-copy">
          下面是根据你的身体数据、目标体重和运动频率生成的完整行动参考。
        </p>

        <div className="metric-grid full-metric-grid">
          <div className="metric">
            <span>BMI</span>
            <strong>{data.result.bmi.toFixed(1)}</strong>
            <small>{data.result.bmi_category}</small>
          </div>
          <div className="metric accent">
            <span>每日建议摄入</span>
            <strong>{data.result.daily_calorie_intake}</strong>
            <small>kcal / day</small>
          </div>
          <div className="metric">
            <span>预计达成目标</span>
            <strong>{data.result.target_date}</strong>
            <small>algorithm {data.result.algorithm_version}</small>
          </div>
        </div>

        <div className="result-detail-section">
          <div>
            <p className="eyebrow">Action path</p>
            <h2>28 天行动路径</h2>
          </div>
          <ol className="result-timeline">
            <li>
              <strong>第 1-7 天</strong>
              <span>建立低压力习惯，优先完成基础核心与拉伸动作。</span>
            </li>
            <li>
              <strong>第 8-21 天</strong>
              <span>提高训练稳定性，逐步加入臀腿、腰腹和体态组合。</span>
            </li>
            <li>
              <strong>第 22-28 天</strong>
              <span>复盘身体反馈，调整摄入节奏，形成下一周期计划。</span>
            </li>
          </ol>
        </div>

        <div className="result-detail-section">
          <div>
            <p className="eyebrow">Daily focus</p>
            <h2>每日执行重点</h2>
          </div>
          <div className="result-focus-grid">
            <div>
              <strong>饮食</strong>
              <span>围绕建议摄入做轻量记录，不用极端节食。</span>
            </div>
            <div>
              <strong>训练</strong>
              <span>每次 15-25 分钟，从可坚持的动作开始。</span>
            </div>
            <div>
              <strong>反馈</strong>
              <span>每周观察围度、精神状态和动作完成度。</span>
            </div>
          </div>
        </div>

        <p className="result-disclaimer">该结果仅供健康管理参考，不能替代医生或营养师的专业建议。</p>
      </section>
    );
  }

  return (
    <section className="container result-card">
      <p className="eyebrow">Preview</p>
      <h1>你的身体状态预览</h1>
      <p className="supporting-copy">你已经完成基础诊断。完整方案会继续给出每日建议、目标时间和行动路径。</p>
      <div className="metric-grid">
        <div className="metric">
          <span>BMI</span>
          <strong>{data.result.bmi.toFixed(1)}</strong>
          <small>{data.result.bmi_category}</small>
        </div>
      </div>
      <p className="result-disclaimer">该结果仅供健康管理参考，不能替代医生或营养师的专业建议。</p>
    </section>
  );
}
