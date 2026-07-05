const frontendUrl = 'https://betterme.yesterhaze.codes';
const githubUrl = 'https://github.com/YH7916/BetterMe';
const paidToken = 'seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000';
const paidAssessmentId = 'ef0e9e76-0322-45af-89cc-f4b785c7b264';

export function renderApiDashboard() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BetterMe API Control</title>
  <style>
    :root {
      color: #1f1f1f;
      background: #fbfaf7;
      font-family: "Source Han Serif SC", "Noto Serif CJK SC", "Source Han Serif CN", "Songti SC", SimSun, serif;
      --surface: #fbfaf7;
      --surface-raised: #fffefd;
      --ink: #1f1f1f;
      --muted: #706a63;
      --hairline: #e8e1d8;
      --hairline-strong: #d8cfc3;
      --clay: #a95f45;
      --clay-soft: #f3e5dd;
      --sage: #788b73;
      --sage-soft: #edf2ea;
      --shadow: 0 24px 70px rgba(63, 50, 39, 0.08);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-width: 320px;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(255, 254, 252, 0.88), rgba(247, 242, 235, 0.72)),
        var(--surface);
      color: var(--ink);
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .shell {
      width: 100%;
      min-height: 100vh;
      padding: clamp(24px, 4vw, 56px);
    }

    .frame {
      width: min(100%, 1120px);
      margin: 0 auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 18px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 500;
    }

    .brand {
      color: var(--ink);
      font-weight: 700;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
      gap: 18px;
      align-items: stretch;
    }

    .panel,
    .status-card,
    .endpoint-row,
    .session-row {
      border: 1px solid var(--hairline);
      border-radius: 8px;
      background: rgba(255, 254, 253, 0.84);
      box-shadow: var(--shadow);
    }

    .panel {
      padding: clamp(24px, 4vw, 42px);
    }

    .eyebrow {
      margin: 0 0 18px;
      color: var(--clay);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1,
    h2,
    p {
      margin: 0;
      overflow-wrap: anywhere;
    }

    h1 {
      max-width: 720px;
      color: var(--ink);
      font-size: clamp(40px, 5vw, 64px);
      font-weight: 600;
      line-height: 1.08;
      letter-spacing: 0;
    }

    h2 {
      color: var(--ink);
      font-size: 22px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: 0;
    }

    .supporting-copy {
      max-width: 680px;
      margin-top: 18px;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.8;
    }

    .actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 30px;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      border-radius: 8px;
      border: 1px solid var(--hairline);
      background: rgba(255, 254, 253, 0.86);
      color: var(--ink);
      padding: 13px 16px;
      text-align: center;
      font-weight: 700;
      transition:
        transform 160ms ease,
        border-color 160ms ease,
        background 160ms ease,
        color 160ms ease;
    }

    .button.primary {
      border-color: var(--ink);
      background: var(--ink);
      color: #fffefd;
    }

    .button:hover {
      transform: translateY(-1px);
      border-color: var(--hairline-strong);
      background: var(--surface-raised);
    }

    .button.primary:hover {
      background: #2c2825;
      color: #fffefd;
    }

    .status-grid {
      display: grid;
      gap: 12px;
    }

    .status-card {
      min-height: 126px;
      padding: 18px;
    }

    .status-card span,
    .endpoint-row span,
    .session-row span {
      display: block;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
    }

    .status-card strong {
      display: block;
      margin-top: 10px;
      color: var(--ink);
      font-size: 30px;
      font-weight: 600;
      line-height: 1.08;
    }

    .status-card small {
      display: block;
      margin-top: 8px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .status-card[data-state="ok"] {
      background: var(--sage-soft);
      border-color: #ccd9c8;
    }

    .status-card[data-state="error"] {
      background: #fff1ec;
      border-color: #e8b4a4;
    }

    .section {
      margin-top: 18px;
    }

    .section-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }

    .section-head p {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }

    .endpoint-list,
    .session-list {
      display: grid;
      gap: 10px;
    }

    .endpoint-row,
    .session-row {
      display: grid;
      grid-template-columns: 110px minmax(0, 1fr) minmax(180px, 0.6fr);
      gap: 14px;
      align-items: center;
      min-height: 64px;
      padding: 14px 16px;
      box-shadow: none;
    }

    .method {
      width: fit-content;
      min-width: 64px;
      border-radius: 999px;
      background: var(--clay-soft);
      color: var(--clay);
      padding: 7px 10px;
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    code {
      color: var(--ink);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .session-row {
      grid-template-columns: 190px minmax(0, 1fr);
    }

    .footer {
      margin-top: 20px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }

    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
      }

      .endpoint-row {
        grid-template-columns: 88px minmax(0, 1fr);
      }

      .endpoint-row span:last-child {
        grid-column: 2;
      }
    }

    @media (max-width: 560px) {
      .shell {
        padding: 18px 12px 40px;
      }

      h1 {
        font-size: 34px;
      }

      .actions,
      .endpoint-row,
      .session-row {
        grid-template-columns: 1fr;
      }

      .endpoint-row span:last-child {
        grid-column: auto;
      }

      .topbar {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="frame">
      <header class="topbar">
        <span class="brand">BetterMe API</span>
        <span>Production control · api.betterme.yesterhaze.codes</span>
      </header>

      <section class="hero">
        <div class="panel">
          <p class="eyebrow">Control Dashboard</p>
          <h1>API 服务控制看板</h1>
          <p class="supporting-copy">线上健康测评 API、数据库就绪状态、演示入口和核心接口都在这里。</p>
          <div class="actions">
            <a class="button primary" href="${frontendUrl}">打开前端演示</a>
            <a class="button" href="${githubUrl}">查看 GitHub</a>
          </div>
        </div>

        <div class="status-grid" aria-live="polite">
          <div class="status-card" id="health-card" data-state="loading">
            <span>API health</span>
            <strong id="health-state">Checking</strong>
            <small id="health-detail">GET /api/health</small>
          </div>
          <div class="status-card" id="ready-card" data-state="loading">
            <span>Database readiness</span>
            <strong id="ready-state">Checking</strong>
            <small id="ready-detail">GET /api/ready</small>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Core API</h2>
          <p>所有业务接口统一挂在 <code>/api</code> 下。</p>
        </div>
        <div class="endpoint-list">
          <a class="endpoint-row" href="/api/health">
            <span class="method">GET</span>
            <code>/api/health</code>
            <span>服务存活检查</span>
          </a>
          <a class="endpoint-row" href="/api/ready">
            <span class="method">GET</span>
            <code>/api/ready</code>
            <span>数据库就绪检查</span>
          </a>
          <div class="endpoint-row">
            <span class="method">POST</span>
            <code>/api/v1/assessments</code>
            <span>创建匿名测评会话（返回 token）</span>
          </div>
          <div class="endpoint-row">
            <span class="method">PATCH</span>
            <code>/api/v1/assessments/:id</code>
            <span>分步保存测评进度</span>
          </div>
          <div class="endpoint-row">
            <span class="method">POST</span>
            <code>/api/v1/assessments/:id/submit</code>
            <span>计算并持久化结果</span>
          </div>
          <div class="endpoint-row">
            <span class="method">GET</span>
            <code>/api/v1/assessments/:id/result</code>
            <span>脱敏或完整结果</span>
          </div>
          <div class="endpoint-row">
            <span class="method">DELETE</span>
            <code>/api/v1/assessments/:id</code>
            <span>删除测评及派生数据（GDPR）</span>
          </div>
          <div class="endpoint-row">
            <span class="method">POST</span>
            <code>/api/v1/pay</code>
            <span>模拟支付解锁</span>
          </div>
          <div class="endpoint-row">
            <span class="method">GET</span>
            <code>/api/v1/docs</code>
            <span>OpenAPI / Swagger UI</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Paid Demo Session</h2>
          <p>用于直接验证会员完整结果返回（作为 <code>Authorization: Bearer &lt;token&gt;</code> 传入）。</p>
        </div>
        <div class="session-list">
          <div class="session-row">
            <span>PAID_TEST_TOKEN</span>
            <code>${paidToken}</code>
          </div>
          <div class="session-row">
            <span>PAID_TEST_ASSESSMENT_ID</span>
            <code>${paidAssessmentId}</code>
          </div>
        </div>
      </section>

      <p class="footer">BetterMe health assessment API · mock payment flow · Supabase Postgres readiness.</p>
    </div>
  </main>

  <script>
    async function check(id, url, label) {
      const card = document.getElementById(id + '-card');
      const state = document.getElementById(id + '-state');
      const detail = document.getElementById(id + '-detail');
      const started = performance.now();
      try {
        const response = await fetch(url, { cache: 'no-store' });
        const elapsed = Math.round(performance.now() - started);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.status === 'error') throw new Error('HTTP ' + response.status);
        card.dataset.state = 'ok';
        state.textContent = 'OK';
        detail.textContent = label + ' · ' + elapsed + ' ms';
      } catch (error) {
        card.dataset.state = 'error';
        state.textContent = 'Error';
        detail.textContent = label + ' · ' + (error instanceof Error ? error.message : 'failed');
      }
    }

    void check('health', '/api/health', 'GET /api/health');
    void check('ready', '/api/ready', 'GET /api/ready');
  </script>
</body>
</html>`;
}
