export function Paywall({ onPay, loading }: { onPay: () => void; loading: boolean }) {
  return (
    <div
      className="container"
      style={{ border: '1px solid #e2e4e8', borderRadius: 12, padding: 20 }}
    >
      <h3>解锁你的完整计划</h3>
      <p>升级会员查看每日建议摄入量与目标达成日期。</p>
      <button onClick={onPay} disabled={loading}>
        {loading ? '处理中…' : '立即解锁 / pay'}
      </button>
    </div>
  );
}
