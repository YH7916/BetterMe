import { Link } from 'react-router-dom';

export function Paywall() {
  return (
    <section className="container paywall-panel">
      <div>
        <p className="eyebrow">Complete plan</p>
        <h2>你的完整报告与行动方案已生成</h2>
        <p className="supporting-copy">解锁后查看每日建议摄入、目标达成时间和 28 天行动路径。</p>
      </div>
      <Link className="primary-button" to="/pay">解锁完整报告与行动方案</Link>
    </section>
  );
}
