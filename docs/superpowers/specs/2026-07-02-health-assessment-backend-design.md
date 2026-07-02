# 健康测评系统 — 设计书

- **日期**: 2026-07-02
- **来源**: 【睿迄科技】全栈开发 3 天挑战（`docs/【睿迄科技】全栈开发3天挑战.docx`）
- **参考竞品**: BetterMe Quiz Funnel

## 1. 背景与目标

设计并实现一个健康测评系统，支撑 BetterMe 式的 quiz funnel。
交付需体现五个评分维度：**API 设计、DB 建模、逻辑闭环、测试质量、AI 协作**。

三阶段业务闭环：

1. **Persistence** — 分步保存 + 进度恢复
2. **Core Logic** — 服务端健康评估算法计算并持久化
3. **Auth & Access** — 订阅鉴权差异化返回 + `/pay` 支付回调

测试为基本盘（第四阶段），非加分项。

## 2. 技术栈与架构形态

**前后端分离的 pnpm monorepo**，前端与后端各自独立部署，通过共享契约包对齐类型。

| 层 | 选型 | 部署 |
|---|---|---|
| 前端 | Vite + React + TypeScript | Cloudflare Pages |
| 后端 | Node.js + TypeScript + **Hono**（分层 API） | Cloudflare Workers |
| 数据库 | PostgreSQL（Supabase 托管）+ **Prisma** ORM | Supabase |
| 共享 | Zod 契约 + 枚举 + 健康算法纯函数 | `packages/shared` |
| 测试 | Vitest（单元/集成）+ Playwright（E2E） | — |
| CI | GitHub Actions | — |

**选型理由**：
- Node.js + TypeScript 满足课题 Core 硬要求，并最能展示分层功底（按"后端功底"评分）。
- Hono 同一套代码可跑 Cloudflare Workers 与普通 Node host，部署进退自如，且与前端同在 Cloudflare。
- Prisma 的 schema/migration 直接对应"DB 建模 / 迁移脚本"评分项与"AI 生成迁移"复盘点。
- `packages/shared` 让前端、后端共用同一套 Zod 契约与算法，契约不漂移；核心算法为框架无关纯函数，便于 Vitest 密集单测。

## 3. 数据模型

原始输入与计算结果分表，换取扩展性（可重算、算法可版本化）。

### users — 匿名用户/会话身份
- `id` uuid PK
- `created_at`, `updated_at`

### assessments — 分步测评数据 + 进度状态
- `id` uuid PK
- `user_id` uuid FK → users
- `gender` enum(male/female)
- `primary_goal` enum(lose_weight/gain_muscle/maintain)
- `age` int
- `height_cm` numeric
- `weight_kg` numeric
- `target_weight_kg` numeric
- `workout_frequency` enum(sedentary/light/moderate/active)
- `current_step` int（进度恢复用）
- `status` enum(in_progress/completed)
- `created_at`, `updated_at`

### assessment_results — 服务端计算结果（与 assessment 1:1）
- `id` uuid PK
- `assessment_id` uuid FK → assessments（unique）
- `bmi` numeric
- `bmi_category` enum(underweight/normal/overweight/obese)
- `daily_calorie_intake` int
- `target_date` date
- `algorithm_version` text
- `created_at`

### subscriptions — 订阅状态
- `id` uuid PK
- `user_id` uuid FK → users
- `status` enum(inactive/active)
- `plan` text（nullable）
- `activated_at` timestamp（nullable）
- `payment_ref` text（nullable）

### 关系图（概念）
```
users 1───* assessments 1───1 assessment_results
users 1───1 subscriptions
```

### 身份机制
首次 `POST /api/assessments` 创建 user，返回 `userId`；前端存 localStorage，后续请求携带。受保护接口以 `userId` 做归属校验，防止越权读取他人数据。

## 4. API 设计（RESTful）

| 方法 & 路径 | 作用 | 鉴权 |
|---|---|---|
| `POST /api/assessments` | 创建 user + assessment，返回 `userId`、`assessmentId`、`currentStep` | 无 |
| `GET /api/assessments/:id` | 进度恢复：返回已填字段 + `current_step` | 归属校验 |
| `PATCH /api/assessments/:id` | 分步增量保存（body 为局部字段），逐字段 Zod 校验，更新 `current_step` | 归属校验 |
| `POST /api/assessments/:id/submit` | 触发健康算法计算、持久化结果、置 `completed` | 归属校验 |
| `GET /api/assessments/:id/result` | 结果页：非会员脱敏 / 会员完整 | 订阅校验 |
| `POST /api/pay` | 模拟支付回调，将订阅置 `active` | 归属校验 |

### 差异化返回
- **非会员**: 隐藏 `daily_calorie_intake` 精确值、`target_date`、预测曲线数据；仅返回 BMI 概览 + 付费提示。protected 字段在后端序列化层（`lib/serializers.ts`）过滤，绝不下发。
- **会员**: 返回完整结果对象。

### 错误约定
统一 JSON 错误体 `{ error: { code, message } }`；校验失败 400、归属失败 403、资源不存在 404。

## 5. 健康评估算法（核心逻辑）

纯函数、无副作用，位于 `packages/shared/src/health/`，便于 Vitest 单测。

- **BMI** = `weight_kg / (height_m)²`
  - 分级：偏瘦 <18.5 / 正常 18.5–24.9 / 超重 25–29.9 / 肥胖 ≥30
- **每日建议摄入**:
  - BMR（Mifflin-St Jeor）: 男 `10·kg + 6.25·cm − 5·age + 5`；女 `−161`
  - TDEE = BMR × 运动系数（sedentary 1.2 / light 1.375 / moderate 1.55 / active 1.725）
  - 按目标调整：减脂 −500，增肌 +500，维持 0
- **目标预测日期**:
  - `delta = |current_weight − target_weight|`
  - 安全速率 0.5 kg/周 → `weeks = delta / 0.5`
  - `target_date = today + weeks × 7 天`（维持目标或 delta=0 时返回 today）

### 边界处理
- 身高 50–260 cm、体重 20–500 kg、年龄 13–120
- 目标体重合理性（不得为 0、不得偏离当前体重过大）
- 除零保护（身高为 0）
- 缺失/非法/极端值：显式拒绝（校验层）或钳制（算法层），行为明确且有测试

## 6. 数据验证

- 每个 step 和 submit 对应独立 Zod schema（`packages/shared/src/schemas/`），做类型 + 范围校验
- 挡住非法数值注入、越界、类型混淆（字符串冒充数字等）
- 校验层与业务层解耦，可独立测试；前后端共用同一套 schema

## 7. 项目文件结构（企业级分层，路由 ⇄ 实现分离）

### Monorepo 顶层
```
betterme/
├── apps/
│   ├── web/            # 前端 (Vite+React+TS) → Cloudflare Pages
│   └── api/            # 后端 (Node.js+Hono+TS) → Cloudflare Workers
├── packages/
│   └── shared/         # Zod 契约 + 枚举 + 健康算法纯函数
├── docs/
│   ├── superpowers/specs/
│   ├── api/            # API 文档 (OpenAPI/Markdown)
│   └── db/             # Schema 图
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── README.md
```

### 后端 `apps/api/`
```
apps/api/
├── prisma/
│   ├── schema.prisma            # 四张表
│   ├── migrations/              # 迁移脚本
│   └── seed.ts                  # Mock 数据 + 预支付测试 session
├── src/
│   ├── routes/                  # ① 路由层：只声明 method+path+中间件+绑定 controller
│   │   ├── index.ts
│   │   ├── assessment.routes.ts
│   │   └── payment.routes.ts
│   ├── controllers/             # ② 控制器（薄）：解析请求 → 调 service → 组织响应
│   │   ├── assessment.controller.ts
│   │   └── payment.controller.ts
│   ├── services/                # ③ 业务逻辑（可测）
│   │   ├── assessment.service.ts
│   │   ├── subscription.service.ts
│   │   └── result.service.ts
│   ├── repositories/            # ④ 数据访问：唯一碰 DB 的层（Prisma 封装）
│   │   ├── assessment.repository.ts
│   │   ├── result.repository.ts
│   │   ├── user.repository.ts
│   │   └── subscription.repository.ts
│   ├── middlewares/             # error-handler / validate / ownership / require-subscription
│   ├── lib/                     # prisma / errors / serializers
│   ├── config/env.ts
│   ├── app.ts                   # Hono app 装配
│   └── server.ts                # Node 入口（Workers 用 worker 适配）
├── tests/
│   ├── integration/             # 分步保存+恢复 / 乱序 / 重复 / 并发 / 脱敏vs完整
│   └── e2e/                     # /pay → 结果页 脱敏→完整
├── vitest.config.ts
├── wrangler.toml
└── package.json
```

一条请求流向：`routes → middlewares(validate/ownership/subscription) → controller → service → repository → Prisma`。每层单一职责、可独立测试；service 不依赖 Hono，可纯逻辑测试；repository 是唯一触碰 DB 的层。

### 前端 `apps/web/`
```
apps/web/
├── src/
│   ├── routes/         # 路由声明（React Router：path → 页面）+ guards
│   ├── pages/          # 页面装配（薄，组合 features）
│   ├── features/       # assessment（步骤+hooks+api）/ result / paywall
│   ├── components/ui/  # 通用展示组件
│   ├── lib/            # api-client / session(localStorage userId)
│   ├── store/          # funnel 进度状态
│   └── main.tsx
├── wrangler.toml       # Cloudflare Pages
├── vite.config.ts
└── package.json
```

### 共享 `packages/shared/`
```
packages/shared/
├── src/
│   ├── schemas/        # Zod：step / submit / pay 请求·响应契约
│   ├── types/          # z.infer 推导的 DTO
│   ├── enums.ts        # Gender / Goal / Frequency / BmiCategory
│   ├── health/         # ★ 算法纯函数：bmi / calorie / target-date
│   └── index.ts
├── tests/              # Vitest 单元：算法边界
└── package.json
```

## 8. 测试策略（第四阶段）

| 类型 | 位置 | 覆盖 |
|---|---|---|
| 单元 | `packages/shared/tests` | 算法 BMI/摄入/目标日期，含极端/缺失/非法/目标体重不合理边界 |
| 集成 | `apps/api/tests/integration` | 分步保存+恢复：中断恢复、乱序、重复、并发更新；脱敏 vs 完整 |
| E2E | `apps/api/tests/e2e` + `apps/web/e2e` | `/pay` 后订阅变更 + 结果页脱敏→完整全链路 |

- 集成/E2E 使用独立测试数据库（Supabase 分支或本地 Postgres）
- CI：GitHub Actions 跑 `pnpm test`，README 贴通过徽章
- README 说明：覆盖了哪些场景、为什么、哪些未覆盖及原因

## 9. 前端（funnel）

多步向导，视觉整洁、有信任感文案，不追求像素级还原：

性别 → 目标 → 身体数据（年龄/身高/体重/目标体重）→ 运动频率 → 计算 loading → 结果页（脱敏 + 付费 CTA）→ 支付后完整结果。

## 10. 部署与交付物

- 前端 → Cloudflare Pages；后端 → Cloudflare Workers；数据库 → Supabase Postgres。公网可访问 URL。
- GitHub 仓库 + README（启动方式、API 文档、`/pay` cURL、已支付测试 sessionId、测试一键运行与覆盖范围）
- 数据库 Schema 图（四张表关系）
- AI 使用复盘（建模/Mock 数据/复杂逻辑/测试用例生成 + 一次否决 AI 方案的记录）

## 11. 范围外（YAGNI）

- 真实支付集成（仅模拟回调）
- 真实用户注册/登录体系（匿名 session 即可）
- 像素级 UI 还原、复杂动效
- 多语言、多测评类型（保留 schema 扩展性即可，不实现）
