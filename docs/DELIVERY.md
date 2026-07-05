# 全栈挑战交付 — 健康测评后端

一个支撑测评类订阅产品的核心后端骨架：从数据建模、接口契约、鉴权到支付闭环，均有自动化测试覆盖，并已真实部署上线。

## 技术栈

| 层 | 选型 |
|---|---|
| 工程 | pnpm workspaces 单仓 + TypeScript 5（`strict`）|
| 共享契约 | Zod 3 schema + 枚举 + 纯函数健康算法（前后端 / 文档单一事实源）|
| 后端 | Hono 4 + Node.js 22 + TypeScript；分层 routes → middlewares → controllers → services → repositories |
| ORM / 数据库 | Prisma 5 + PostgreSQL（Supabase，pooled 运行 / direct 迁移）|
| 前端 | Vite 5 + React 18 + React Router 6 |
| 测试 | Vitest 2（单元 + 集成）、Playwright（E2E）、React Testing Library |
| API 文档 | OpenAPI 3.1（由 Zod 生成）+ Swagger UI |
| CI | GitHub Actions（lint / typecheck / build / 测试 / 覆盖率门禁）|
| 部署 | Railway（Node API）+ Cloudflare Pages（前端）|

---

## 1. 线上演示

| 项 | 链接 |
|---|---|
| 前端（可从头走一遍 funnel）| https://betterme.yesterhaze.codes |
| API 控制台 | https://api.betterme.yesterhaze.codes |
| API 文档（Swagger）| https://api.betterme.yesterhaze.codes/api/v1/docs |

## 2. 付费前后差异 + /pay 可重放

已支付测试会话（作为 `Authorization: Bearer` 令牌传入即可看到完整结果）：

- `TOKEN = seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000`
- `ASSESSMENT_ID = ef0e9e76-0322-45af-89cc-f4b785c7b264`

```bash
# 会员完整结果（含 daily_calorie_intake + target_date）
curl "https://api.betterme.yesterhaze.codes/api/v1/assessments/ef0e9e76-0322-45af-89cc-f4b785c7b264/result" \
  -H "authorization: Bearer seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000"

# /pay 重放（幂等，重复调用返回同一支付、不重复扣费）
curl -X POST "https://api.betterme.yesterhaze.codes/api/v1/pay" \
  -H "content-type: application/json" \
  -H "authorization: Bearer seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000" \
  -d '{"assessmentId":"ef0e9e76-0322-45af-89cc-f4b785c7b264","idempotencyKey":"eval-replay"}'
```

完整的「新建会话 → 脱敏 → 支付 → 完整」对比脚本见 README 的 *Prepaid Test Session* 一节。

## 3. 代码仓库

https://github.com/YH7916/BetterMe

README 含：启动方式、完整 API 文档、测试覆盖说明、部署说明。

## 4. 自动化测试 + CI

- 一键运行：`pnpm install && pnpm test`（shared 36 + web 36 + api 34，共 106 项）
- CI：https://github.com/YH7916/BetterMe/actions/workflows/ci.yml
- 覆盖范围与「未覆盖及原因」见 README 的 *Test Coverage* 一节。

覆盖重点：健康算法边界（极端 / 缺失 / 非法输入）、分步保存与进度恢复（中断 / 乱序 / 并发 / 不回退）、鉴权差异化（非会员脱敏 vs 会员完整）、/pay 后脱敏→完整的端到端验证。

## 5. 数据库 Schema 图

https://github.com/YH7916/BetterMe/blob/main/docs/db/schema.md

users / assessments / assessment_results / subscriptions / payments 的关系图 + 字段与索引理由。核心建模：**原始录入（assessments）与算法派生结果（assessment_results）分表**，结果带 `algorithm_version`，支持算法升级后重算而不污染用户原始数据。

## 6. AI 使用复盘

https://github.com/YH7916/BetterMe/blob/main/docs/AI-REVIEW.md

如何用 AI 进行建模 / 生成 mock 数据 / 编写复杂逻辑 / 生成测试用例，以及「有没有一次 AI 的方案被我否决、为什么」。
