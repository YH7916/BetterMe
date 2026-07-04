export function Paywall({ onPay, loading }: { onPay: () => void; loading: boolean }) {
  return (
    <section className="container paywall-panel">
      <div>
        <p className="eyebrow">Membership</p>
        <h2>解锁你的完整计划</h2>
        <p className="supporting-copy">演示环境会立即开通完整计划，展示每日建议摄入量、目标达成日期和算法版本。</p>
      </div>
      <button className="primary-button" onClick={onPay} disabled={loading}>
        {loading ? '模拟解锁中…' : '模拟解锁会员 / Demo unlock'}
      </button>
    </section>
  );
}
