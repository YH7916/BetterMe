# 健康测评系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个健康测评 quiz funnel 系统：前端引导用户分步填写 → 后端持久化/进度恢复 → 服务端健康算法计算 → 订阅鉴权差异化返回 + 模拟支付解锁，全流程有自动化测试覆盖。

**Architecture:** pnpm monorepo，前后端分离。`packages/shared` 存 Zod 契约 + 枚举 + 健康算法纯函数（前后端共用、Vitest 单测）。后端 `apps/api` 用 Hono 分层（routes→controllers→services→repositories），Prisma 连 Supabase Postgres，部署 Cloudflare Workers。前端 `apps/web` 用 Vite+React，部署 Cloudflare Pages。

**Tech Stack:** TypeScript · pnpm workspaces · Zod · Hono · Prisma · Supabase(PostgreSQL) · Vite + React · Vitest · Playwright · GitHub Actions · Cloudflare Pages/Workers

## Global Constraints

- 语言：全栈 **TypeScript**，`strict: true`
- 包管理：**pnpm** workspaces；Node ≥ 20
- 契约单一真源：所有请求/响应类型与枚举定义在 `@betterme/shared`，前后端只 import，不重复定义
- 数据访问：只有 `repositories/` 层可 import Prisma client；service/controller 不得直接碰 DB
- 算法：健康算法为 `packages/shared/src/health/` 下的**纯函数**，无副作用、无 I/O
- 统一错误体：`{ error: { code: string, message: string } }`；校验 400 / 归属 403 / 不存在 404
- 脱敏：受保护字段（`daily_calorie_intake`、`target_date`、预测曲线）只在 `lib/serializers.ts` 一处过滤
- 测试：每个核心逻辑改动走 TDD（先写失败测试）；一键 `pnpm test`
- 提交：每个 Task 末尾 commit，message 用 conventional commits（feat/test/chore/docs）

---

## 文件结构总览

```
betterme/
├── apps/
│   ├── web/                     # 前端 → Cloudflare Pages
│   └── api/                     # 后端 → Cloudflare Workers
├── packages/shared/             # 契约 + 算法
├── docs/{api,db,superpowers}
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
└── README.md
```

依赖顺序：**T1 脚手架 → T2 契约 → T3 算法 → T4 DB → T5 后端骨架 → T6 仓储 → T7 分步保存/恢复 → T8 提交计算 → T9 订阅/支付/脱敏 → T10 前端骨架 → T11 funnel → T12 结果/付费 → T13 E2E → T14 CI → T15 部署+文档**。

---

### Task 1: Monorepo 脚手架

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.nvmrc`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`

**Interfaces:**
- Produces: workspace `@betterme/shared` 可被 `apps/*` 引用

- [ ] **Step 1: 初始化 git 与根配置**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`package.json`（根）:
```json
{
  "name": "betterme",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true,
    "types": ["node"]
  }
}
```

`.gitignore`:
```
node_modules/
dist/
.env
.env.local
*.log
.wrangler/
coverage/
playwright-report/
test-results/
```

`.nvmrc`:
```
20
```

- [ ] **Step 2: 创建 shared 包骨架**

`packages/shared/package.json`:
```json
{
  "name": "@betterme/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { "zod": "^3.23.0" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^2.1.0" }
}
```

`packages/shared/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src", "tests"] }
```

`packages/shared/src/index.ts`:
```ts
export {};
```

- [ ] **Step 3: 安装依赖**

Run: `pnpm install`
Expected: 无报错，生成 `pnpm-lock.yaml`

- [ ] **Step 4: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold pnpm monorepo with shared package"
```

---

### Task 2: 共享契约（枚举 + Zod schema + DTO 类型）

**Files:**
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/schemas/assessment.schema.ts`
- Create: `packages/shared/src/schemas/payment.schema.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/schemas.spec.ts`

**Interfaces:**
- Produces:
  - `Gender = 'male'|'female'`, `Goal = 'lose_weight'|'gain_muscle'|'maintain'`, `WorkoutFrequency = 'sedentary'|'light'|'moderate'|'active'`, `BmiCategory = 'underweight'|'normal'|'overweight'|'obese'`
  - `stepUpdateSchema` (Zod, partial 各字段带范围校验), `submitSchema`, `paySchema`
  - 类型 `AssessmentInput`, `StepUpdate`, `PayRequest`

- [ ] **Step 1: 写枚举**

`packages/shared/src/enums.ts`:
```ts
export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

export const GOALS = ['lose_weight', 'gain_muscle', 'maintain'] as const;
export type Goal = (typeof GOALS)[number];

export const WORKOUT_FREQUENCIES = ['sedentary', 'light', 'moderate', 'active'] as const;
export type WorkoutFrequency = (typeof WORKOUT_FREQUENCIES)[number];

export const BMI_CATEGORIES = ['underweight', 'normal', 'overweight', 'obese'] as const;
export type BmiCategory = (typeof BMI_CATEGORIES)[number];
```

- [ ] **Step 2: 写失败测试（schema 范围校验）**

`packages/shared/tests/schemas.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { stepUpdateSchema, submitSchema } from '../src/index';

describe('stepUpdateSchema', () => {
  it('accepts a valid partial step', () => {
    const r = stepUpdateSchema.safeParse({ gender: 'male', age: 30 });
    expect(r.success).toBe(true);
  });
  it('rejects out-of-range height', () => {
    expect(stepUpdateSchema.safeParse({ height_cm: 10 }).success).toBe(false);
    expect(stepUpdateSchema.safeParse({ height_cm: 300 }).success).toBe(false);
  });
  it('rejects string masquerading as number', () => {
    expect(stepUpdateSchema.safeParse({ age: '30' as unknown as number }).success).toBe(false);
  });
  it('rejects unknown enum', () => {
    expect(stepUpdateSchema.safeParse({ gender: 'x' }).success).toBe(false);
  });
});

describe('submitSchema', () => {
  it('requires all fields', () => {
    expect(submitSchema.safeParse({ gender: 'male' }).success).toBe(false);
  });
  it('accepts a complete valid payload', () => {
    const r = submitSchema.safeParse({
      gender: 'female', primary_goal: 'lose_weight', age: 28,
      height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light',
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @betterme/shared test`
Expected: FAIL（`stepUpdateSchema` 未定义）

- [ ] **Step 4: 实现 schema**

`packages/shared/src/schemas/assessment.schema.ts`:
```ts
import { z } from 'zod';
import { GENDERS, GOALS, WORKOUT_FREQUENCIES } from '../enums';

const age = z.number().int().min(13).max(120);
const height_cm = z.number().min(50).max(260);
const weight_kg = z.number().min(20).max(500);
const target_weight_kg = z.number().min(20).max(500);

export const stepUpdateSchema = z
  .object({
    gender: z.enum(GENDERS),
    primary_goal: z.enum(GOALS),
    age,
    height_cm,
    weight_kg,
    target_weight_kg,
    workout_frequency: z.enum(WORKOUT_FREQUENCIES),
    current_step: z.number().int().min(0).max(10),
  })
  .partial()
  .strict();

export const submitSchema = z.object({
  gender: z.enum(GENDERS),
  primary_goal: z.enum(GOALS),
  age,
  height_cm,
  weight_kg,
  target_weight_kg,
  workout_frequency: z.enum(WORKOUT_FREQUENCIES),
});

export type StepUpdate = z.infer<typeof stepUpdateSchema>;
export type AssessmentInput = z.infer<typeof submitSchema>;
```

`packages/shared/src/schemas/payment.schema.ts`:
```ts
import { z } from 'zod';

export const paySchema = z.object({
  userId: z.string().uuid(),
  assessmentId: z.string().uuid(),
});
export type PayRequest = z.infer<typeof paySchema>;
```

`packages/shared/src/index.ts`:
```ts
export * from './enums';
export * from './schemas/assessment.schema';
export * from './schemas/payment.schema';
export * from './health';
```

> 注：`./health` 在 Task 3 创建；本 Task 先建空文件避免 import 报错。
`packages/shared/src/health/index.ts`（占位，Task 3 填充）:
```ts
export {};
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @betterme/shared test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add enums and zod contracts for assessment and payment"
```

---

### Task 3: 健康评估算法（纯函数 + 边界单测）

**Files:**
- Create: `packages/shared/src/health/bmi.ts`, `calorie.ts`, `target-date.ts`, `index.ts`
- Test: `packages/shared/tests/health.spec.ts`

**Interfaces:**
- Produces:
  - `calcBmi(weightKg: number, heightCm: number): number`
  - `bmiCategory(bmi: number): BmiCategory`
  - `calcDailyCalories(input: { gender: Gender; age: number; heightCm: number; weightKg: number; frequency: WorkoutFrequency; goal: Goal }): number`
  - `predictTargetDate(currentKg: number, targetKg: number, from: Date): Date`
  - `ALGORITHM_VERSION = 'v1'`

- [ ] **Step 1: 写失败测试（含边界）**

`packages/shared/tests/health.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { calcBmi, bmiCategory, calcDailyCalories, predictTargetDate } from '../src/health';

describe('calcBmi', () => {
  it('computes BMI', () => {
    expect(calcBmi(70, 175)).toBeCloseTo(22.86, 2);
  });
  it('throws on zero height', () => {
    expect(() => calcBmi(70, 0)).toThrow();
  });
});

describe('bmiCategory', () => {
  it.each([
    [17, 'underweight'],
    [22, 'normal'],
    [27, 'overweight'],
    [32, 'obese'],
  ] as const)('bmi %d -> %s', (bmi, cat) => {
    expect(bmiCategory(bmi)).toBe(cat);
  });
  it('boundary 18.5 is normal', () => expect(bmiCategory(18.5)).toBe('normal'));
  it('boundary 25 is overweight', () => expect(bmiCategory(25)).toBe('overweight'));
});

describe('calcDailyCalories', () => {
  it('lose_weight applies a deficit vs maintain', () => {
    const base = { gender: 'male', age: 30, heightCm: 180, weightKg: 80, frequency: 'moderate' } as const;
    const maintain = calcDailyCalories({ ...base, goal: 'maintain' });
    const lose = calcDailyCalories({ ...base, goal: 'lose_weight' });
    expect(lose).toBe(maintain - 500);
  });
  it('female BMR is lower than male at same metrics', () => {
    const m = calcDailyCalories({ gender: 'male', age: 30, heightCm: 170, weightKg: 70, frequency: 'light', goal: 'maintain' });
    const f = calcDailyCalories({ gender: 'female', age: 30, heightCm: 170, weightKg: 70, frequency: 'light', goal: 'maintain' });
    expect(f).toBeLessThan(m);
  });
});

describe('predictTargetDate', () => {
  const from = new Date('2026-01-01T00:00:00Z');
  it('5kg to lose at 0.5kg/week -> 10 weeks later', () => {
    const d = predictTargetDate(75, 70, from);
    expect(d.toISOString().slice(0, 10)).toBe('2026-03-12');
  });
  it('delta 0 returns from date', () => {
    expect(predictTargetDate(70, 70, from).getTime()).toBe(from.getTime());
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @betterme/shared test`
Expected: FAIL（函数未定义）

- [ ] **Step 3: 实现算法**

`packages/shared/src/health/bmi.ts`:
```ts
import type { BmiCategory } from '../enums';

export function calcBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) throw new Error('height must be positive');
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}
```

`packages/shared/src/health/calorie.ts`:
```ts
import type { Gender, Goal, WorkoutFrequency } from '../enums';

const ACTIVITY: Record<WorkoutFrequency, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
};
const GOAL_ADJUST: Record<Goal, number> = {
  lose_weight: -500, gain_muscle: 500, maintain: 0,
};

export function calcDailyCalories(input: {
  gender: Gender; age: number; heightCm: number; weightKg: number;
  frequency: WorkoutFrequency; goal: Goal;
}): number {
  const { gender, age, heightCm, weightKg, frequency, goal } = input;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY[frequency];
  return Math.round(tdee + GOAL_ADJUST[goal]);
}
```

`packages/shared/src/health/target-date.ts`:
```ts
const SAFE_KG_PER_WEEK = 0.5;
const MS_PER_DAY = 86_400_000;

export function predictTargetDate(currentKg: number, targetKg: number, from: Date): Date {
  const delta = Math.abs(currentKg - targetKg);
  const weeks = delta / SAFE_KG_PER_WEEK;
  return new Date(from.getTime() + Math.round(weeks * 7) * MS_PER_DAY);
}
```

`packages/shared/src/health/index.ts`:
```ts
export * from './bmi';
export * from './calorie';
export * from './target-date';
export const ALGORITHM_VERSION = 'v1';
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @betterme/shared test`
Expected: PASS（全部 health + schema 用例）

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): implement BMI, calorie and target-date algorithms with boundary tests"
```

---

### Task 4: 数据库 Schema、迁移与 Prisma

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/.env.example`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`

**Interfaces:**
- Produces: 四张表 `users/assessments/assessment_results/subscriptions`；Prisma client；seed 出的**预支付测试 user/assessment**（README 用）

- [ ] **Step 1: 创建 api 包配置**

`apps/api/package.json`:
```json
{
  "name": "@betterme/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@betterme/shared": "workspace:*",
    "@prisma/client": "^5.20.0",
    "hono": "^4.6.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@hono/node-server": "^1.13.0"
  }
}
```

`apps/api/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src", "tests", "prisma"] }
```

`apps/api/.env.example`:
```
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[password]@[host]:5432/postgres?schema=public"
```

- [ ] **Step 2: 写 Prisma schema**

`apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Gender { male female }
enum Goal { lose_weight gain_muscle maintain }
enum WorkoutFrequency { sedentary light moderate active }
enum BmiCategory { underweight normal overweight obese }
enum AssessmentStatus { in_progress completed }
enum SubscriptionStatus { inactive active }

model User {
  id            String        @id @default(uuid())
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  assessments   Assessment[]
  subscription  Subscription?
  @@map("users")
}

model Assessment {
  id                String            @id @default(uuid())
  userId            String            @map("user_id")
  user              User              @relation(fields: [userId], references: [id])
  gender            Gender?
  primaryGoal       Goal?             @map("primary_goal")
  age               Int?
  heightCm          Decimal?          @map("height_cm")
  weightKg          Decimal?          @map("weight_kg")
  targetWeightKg    Decimal?          @map("target_weight_kg")
  workoutFrequency  WorkoutFrequency? @map("workout_frequency")
  currentStep       Int               @default(0) @map("current_step")
  status            AssessmentStatus  @default(in_progress)
  result            AssessmentResult?
  createdAt         DateTime          @default(now()) @map("created_at")
  updatedAt         DateTime          @updatedAt @map("updated_at")
  @@index([userId])
  @@map("assessments")
}

model AssessmentResult {
  id                 String      @id @default(uuid())
  assessmentId       String      @unique @map("assessment_id")
  assessment         Assessment  @relation(fields: [assessmentId], references: [id])
  bmi                Decimal
  bmiCategory        BmiCategory @map("bmi_category")
  dailyCalorieIntake Int         @map("daily_calorie_intake")
  targetDate         DateTime    @map("target_date") @db.Date
  algorithmVersion   String      @map("algorithm_version")
  createdAt          DateTime    @default(now()) @map("created_at")
  @@map("assessment_results")
}

model Subscription {
  id          String             @id @default(uuid())
  userId      String             @unique @map("user_id")
  user        User               @relation(fields: [userId], references: [id])
  status      SubscriptionStatus @default(inactive)
  plan        String?
  activatedAt DateTime?          @map("activated_at")
  paymentRef  String?            @map("payment_ref")
  @@map("subscriptions")
}
```

- [ ] **Step 3: 生成首个迁移**

前置：在 Supabase 建项目，把连接串填入 `apps/api/.env`。
Run: `pnpm --filter @betterme/api prisma:migrate --name init`
Expected: 生成 `prisma/migrations/*/migration.sql`，四表创建成功

- [ ] **Step 4: 写 seed（含预支付测试数据）**

`apps/api/prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const paidUser = await prisma.user.create({
    data: {
      subscription: { create: { status: 'active', plan: 'pro', activatedAt: new Date(), paymentRef: 'seed-paid' } },
      assessments: {
        create: {
          gender: 'female', primaryGoal: 'lose_weight', age: 28,
          heightCm: 165, weightKg: 70, targetWeightKg: 60,
          workoutFrequency: 'light', currentStep: 4, status: 'completed',
          result: {
            create: {
              bmi: 25.71, bmiCategory: 'overweight', dailyCalorieIntake: 1680,
              targetDate: new Date('2026-06-01'), algorithmVersion: 'v1',
            },
          },
        },
      },
    },
    include: { assessments: true },
  });
  console.log('PAID_TEST_USER_ID=', paidUser.id);
  console.log('PAID_TEST_ASSESSMENT_ID=', paidUser.assessments[0].id);
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 5: 运行 seed**

Run: `pnpm --filter @betterme/api db:seed`
Expected: 打印 `PAID_TEST_USER_ID` 与 `PAID_TEST_ASSESSMENT_ID`（记入 README）

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/.env.example apps/api/prisma
git commit -m "feat(api): add prisma schema, init migration and seed with prepaid test data"
```

---

### Task 5: 后端骨架（Hono app、config、错误处理、Prisma client）

**Files:**
- Create: `apps/api/src/config/env.ts`, `apps/api/src/lib/prisma.ts`, `apps/api/src/lib/errors.ts`
- Create: `apps/api/src/middlewares/error-handler.ts`, `apps/api/src/middlewares/validate.ts`
- Create: `apps/api/src/app.ts`, `apps/api/src/server.ts`
- Test: `apps/api/tests/integration/health-check.spec.ts`

**Interfaces:**
- Produces:
  - `AppError`（`badRequest/forbidden/notFound` 工厂），`errorHandler` (Hono `onError`)
  - `validateBody(schema)` middleware，把解析结果放 `c.get('body')`
  - `createApp(): Hono`（可注入依赖，供测试）
  - `prisma` client 单例

- [ ] **Step 1: 写失败测试（健康检查端点）**

`apps/api/tests/integration/health-check.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const app = createApp();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @betterme/api test`
Expected: FAIL（`createApp` 未定义）

- [ ] **Step 3: 实现 config / errors / prisma / 中间件**

`apps/api/src/config/env.ts`:
```ts
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
});
export const env = schema.parse(process.env);
```

`apps/api/src/lib/errors.ts`:
```ts
export class AppError extends Error {
  constructor(public status: 400 | 403 | 404, public code: string, message: string) {
    super(message);
  }
  static badRequest(msg: string, code = 'BAD_REQUEST') { return new AppError(400, code, msg); }
  static forbidden(msg: string, code = 'FORBIDDEN') { return new AppError(403, code, msg); }
  static notFound(msg: string, code = 'NOT_FOUND') { return new AppError(404, code, msg); }
}
```

`apps/api/src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

`apps/api/src/middlewares/error-handler.ts`:
```ts
import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message ?? 'invalid' } }, 400);
  }
  return c.json({ error: { code: 'INTERNAL', message: 'internal error' } }, 500);
}
```

`apps/api/src/middlewares/validate.ts`:
```ts
import type { Context, Next } from 'hono';
import type { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    const raw = await c.req.json().catch(() => ({}));
    c.set('body', schema.parse(raw)); // throws ZodError -> errorHandler
    await next();
  };
}
```

`apps/api/src/app.ts`:
```ts
import { Hono } from 'hono';
import { errorHandler } from './middlewares/error-handler';

export function createApp(): Hono {
  const app = new Hono();
  app.onError(errorHandler);
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  return app;
}
```

`apps/api/src/server.ts`:
```ts
import { serve } from '@hono/node-server';
import { createApp } from './app';

serve({ fetch: createApp().fetch, port: 8787 });
console.log('API on http://localhost:8787');
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @betterme/api test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): add hono app skeleton with error handling and validation middleware"
```

---

### Task 6: 仓储层（Prisma 封装，唯一碰 DB 的层）

**Files:**
- Create: `apps/api/src/repositories/user.repository.ts`, `assessment.repository.ts`, `result.repository.ts`, `subscription.repository.ts`
- Test: `apps/api/tests/integration/repository.spec.ts`

**Interfaces:**
- Produces:
  - `userRepo.create(): Promise<{ id }>`
  - `assessmentRepo.create(userId): Promise<Assessment>`；`.findById(id)`；`.patch(id, data: StepUpdate)`；`.markCompleted(id)`
  - `resultRepo.upsert(assessmentId, data)`；`.findByAssessment(id)`
  - `subscriptionRepo.findByUser(userId)`；`.activate(userId, ref)`
  - 测试用：`resetDb()` 清表

- [ ] **Step 1: 写失败测试（创建+读取+patch 往返）**

`apps/api/tests/integration/repository.spec.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { userRepo } from '../../src/repositories/user.repository';
import { assessmentRepo } from '../../src/repositories/assessment.repository';

async function resetDb() {
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}

describe('assessmentRepo', () => {
  beforeEach(resetDb);
  it('creates and reads back an assessment', async () => {
    const user = await userRepo.create();
    const a = await assessmentRepo.create(user.id);
    const found = await assessmentRepo.findById(a.id);
    expect(found?.userId).toBe(user.id);
    expect(found?.currentStep).toBe(0);
  });
  it('patches incremental fields', async () => {
    const user = await userRepo.create();
    const a = await assessmentRepo.create(user.id);
    await assessmentRepo.patch(a.id, { gender: 'male', age: 30, current_step: 1 });
    const found = await assessmentRepo.findById(a.id);
    expect(found?.gender).toBe('male');
    expect(found?.currentStep).toBe(1);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @betterme/api test repository`
Expected: FAIL（repo 未定义）

- [ ] **Step 3: 实现仓储**

`apps/api/src/repositories/user.repository.ts`:
```ts
import { prisma } from '../lib/prisma';
export const userRepo = {
  create: () => prisma.user.create({ data: { subscription: { create: {} } } }),
};
```

`apps/api/src/repositories/assessment.repository.ts`:
```ts
import { prisma } from '../lib/prisma';
import type { StepUpdate } from '@betterme/shared';

function mapPatch(data: StepUpdate) {
  const { primary_goal, height_cm, weight_kg, target_weight_kg, workout_frequency, current_step, ...rest } = data;
  return {
    ...rest,
    ...(primary_goal !== undefined && { primaryGoal: primary_goal }),
    ...(height_cm !== undefined && { heightCm: height_cm }),
    ...(weight_kg !== undefined && { weightKg: weight_kg }),
    ...(target_weight_kg !== undefined && { targetWeightKg: target_weight_kg }),
    ...(workout_frequency !== undefined && { workoutFrequency: workout_frequency }),
    ...(current_step !== undefined && { currentStep: current_step }),
  };
}

export const assessmentRepo = {
  create: (userId: string) => prisma.assessment.create({ data: { userId } }),
  findById: (id: string) => prisma.assessment.findUnique({ where: { id }, include: { result: true, user: { include: { subscription: true } } } }),
  patch: (id: string, data: StepUpdate) => prisma.assessment.update({ where: { id }, data: mapPatch(data) }),
  markCompleted: (id: string) => prisma.assessment.update({ where: { id }, data: { status: 'completed' } }),
};
```

`apps/api/src/repositories/result.repository.ts`:
```ts
import { prisma } from '../lib/prisma';
import type { BmiCategory } from '@betterme/shared';

export interface ResultData {
  bmi: number; bmiCategory: BmiCategory; dailyCalorieIntake: number;
  targetDate: Date; algorithmVersion: string;
}
export const resultRepo = {
  upsert: (assessmentId: string, d: ResultData) =>
    prisma.assessmentResult.upsert({
      where: { assessmentId },
      create: { assessmentId, ...d },
      update: d,
    }),
  findByAssessment: (assessmentId: string) => prisma.assessmentResult.findUnique({ where: { assessmentId } }),
};
```

`apps/api/src/repositories/subscription.repository.ts`:
```ts
import { prisma } from '../lib/prisma';
export const subscriptionRepo = {
  findByUser: (userId: string) => prisma.subscription.findUnique({ where: { userId } }),
  activate: (userId: string, ref: string) =>
    prisma.subscription.update({
      where: { userId },
      data: { status: 'active', plan: 'pro', activatedAt: new Date(), paymentRef: ref },
    }),
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @betterme/api test repository`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/repositories apps/api/tests
git commit -m "feat(api): add repository layer over prisma"
```

---

### Task 7: 分步保存与进度恢复（service + controller + routes）

**Files:**
- Create: `apps/api/src/services/assessment.service.ts`
- Create: `apps/api/src/middlewares/ownership.ts`
- Create: `apps/api/src/controllers/assessment.controller.ts`
- Create: `apps/api/src/routes/assessment.routes.ts`, `apps/api/src/routes/index.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/integration/assessment-flow.spec.ts`

**Interfaces:**
- Consumes: `userRepo`, `assessmentRepo`（Task 6）
- Produces:
  - `assessmentService.start()`, `.getProgress(id)`, `.saveStep(id, StepUpdate)`
  - Routes: `POST /api/assessments`、`GET /api/assessments/:id`、`PATCH /api/assessments/:id`
  - `requireOwnership` middleware（校验 header `x-user-id` == 资源 userId → 否则 403）

- [ ] **Step 1: 写失败测试（创建→保存→恢复→乱序/重复/越权）**

`apps/api/tests/integration/assessment-flow.spec.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { createApp } from '../../src/app';

const app = createApp();
async function resetDb() {
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}
async function start() {
  const res = await app.request('/api/assessments', { method: 'POST' });
  return res.json() as Promise<{ userId: string; assessmentId: string; currentStep: number }>;
}
const h = (userId: string) => ({ 'x-user-id': userId, 'content-type': 'application/json' });

describe('assessment persistence & recovery', () => {
  beforeEach(resetDb);

  it('creates an assessment with step 0', async () => {
    const { assessmentId, currentStep } = await start();
    expect(assessmentId).toBeTruthy();
    expect(currentStep).toBe(0);
  });

  it('saves a step and recovers progress', async () => {
    const { userId, assessmentId } = await start();
    await app.request(`/api/assessments/${assessmentId}`, {
      method: 'PATCH', headers: h(userId),
      body: JSON.stringify({ gender: 'male', current_step: 1 }),
    });
    const res = await app.request(`/api/assessments/${assessmentId}`, { headers: h(userId) });
    const body = await res.json();
    expect(body.gender).toBe('male');
    expect(body.current_step).toBe(1);
  });

  it('handles out-of-order and duplicate submits idempotently', async () => {
    const { userId, assessmentId } = await start();
    const patch = (b: object) => app.request(`/api/assessments/${assessmentId}`, { method: 'PATCH', headers: h(userId), body: JSON.stringify(b) });
    await patch({ age: 30, current_step: 2 });
    await patch({ gender: 'female', current_step: 1 }); // out of order
    await patch({ age: 30, current_step: 2 }); // duplicate
    const res = await app.request(`/api/assessments/${assessmentId}`, { headers: h(userId) });
    const body = await res.json();
    expect(body.age).toBe(30);
    expect(body.gender).toBe('female');
  });

  it('rejects invalid values (400)', async () => {
    const { userId, assessmentId } = await start();
    const res = await app.request(`/api/assessments/${assessmentId}`, { method: 'PATCH', headers: h(userId), body: JSON.stringify({ height_cm: 10 }) });
    expect(res.status).toBe(400);
  });

  it('blocks cross-user access (403)', async () => {
    const { assessmentId } = await start();
    const res = await app.request(`/api/assessments/${assessmentId}`, { headers: h('00000000-0000-0000-0000-000000000000') });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @betterme/api test assessment-flow`
Expected: FAIL（路由不存在）

- [ ] **Step 3: 实现 service / ownership / controller / routes**

`apps/api/src/services/assessment.service.ts`:
```ts
import type { StepUpdate } from '@betterme/shared';
import { AppError } from '../lib/errors';
import { userRepo } from '../repositories/user.repository';
import { assessmentRepo } from '../repositories/assessment.repository';

export const assessmentService = {
  async start() {
    const user = await userRepo.create();
    const a = await assessmentRepo.create(user.id);
    return { userId: user.id, assessmentId: a.id, currentStep: a.currentStep };
  },
  async getProgress(id: string) {
    const a = await assessmentRepo.findById(id);
    if (!a) throw AppError.notFound('assessment not found');
    return a;
  },
  async saveStep(id: string, data: StepUpdate) {
    await assessmentRepo.patch(id, data);
    return assessmentRepo.findById(id);
  },
};
```

`apps/api/src/middlewares/ownership.ts`:
```ts
import type { Context, Next } from 'hono';
import { AppError } from '../lib/errors';
import { assessmentRepo } from '../repositories/assessment.repository';

export async function requireOwnership(c: Context, next: Next) {
  const id = c.req.param('id');
  const userId = c.req.header('x-user-id');
  const a = await assessmentRepo.findById(id);
  if (!a) throw AppError.notFound('assessment not found');
  if (!userId || a.userId !== userId) throw AppError.forbidden('not your assessment');
  c.set('assessment', a);
  await next();
}
```

`apps/api/src/controllers/assessment.controller.ts`:
```ts
import type { Context } from 'hono';
import type { StepUpdate } from '@betterme/shared';
import { assessmentService } from '../services/assessment.service';

function toProgressDTO(a: NonNullable<Awaited<ReturnType<typeof assessmentService.getProgress>>>) {
  return {
    assessmentId: a.id,
    gender: a.gender, primary_goal: a.primaryGoal, age: a.age,
    height_cm: a.heightCm ? Number(a.heightCm) : null,
    weight_kg: a.weightKg ? Number(a.weightKg) : null,
    target_weight_kg: a.targetWeightKg ? Number(a.targetWeightKg) : null,
    workout_frequency: a.workoutFrequency,
    current_step: a.currentStep, status: a.status,
  };
}

export const assessmentController = {
  async create(c: Context) {
    return c.json(await assessmentService.start(), 201);
  },
  async get(c: Context) {
    const a = await assessmentService.getProgress(c.req.param('id'));
    return c.json(toProgressDTO(a));
  },
  async patch(c: Context) {
    const body = c.get('body') as StepUpdate;
    const a = await assessmentService.saveStep(c.req.param('id'), body);
    return c.json(toProgressDTO(a!));
  },
};
```

`apps/api/src/routes/assessment.routes.ts`:
```ts
import { Hono } from 'hono';
import { stepUpdateSchema } from '@betterme/shared';
import { validateBody } from '../middlewares/validate';
import { requireOwnership } from '../middlewares/ownership';
import { assessmentController } from '../controllers/assessment.controller';

export const assessmentRoutes = new Hono();
assessmentRoutes.post('/', assessmentController.create);
assessmentRoutes.get('/:id', requireOwnership, assessmentController.get);
assessmentRoutes.patch('/:id', requireOwnership, validateBody(stepUpdateSchema), assessmentController.patch);
```

`apps/api/src/routes/index.ts`:
```ts
import { Hono } from 'hono';
import { assessmentRoutes } from './assessment.routes';

export const api = new Hono();
api.route('/assessments', assessmentRoutes);
```

Modify `apps/api/src/app.ts` — 挂载 `/api`:
```ts
import { Hono } from 'hono';
import { errorHandler } from './middlewares/error-handler';
import { api } from './routes';

export function createApp(): Hono {
  const app = new Hono();
  app.onError(errorHandler);
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  app.route('/api', api);
  return app;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @betterme/api test assessment-flow`
Expected: PASS（含乱序/重复/越权/非法值）

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "feat(api): step save and progress recovery with ownership guard"
```

---

### Task 8: 提交计算并持久化结果

**Files:**
- Modify: `apps/api/src/services/assessment.service.ts`
- Modify: `apps/api/src/controllers/assessment.controller.ts`, `apps/api/src/routes/assessment.routes.ts`
- Test: `apps/api/tests/integration/submit.spec.ts`

**Interfaces:**
- Consumes: `calcBmi/bmiCategory/calcDailyCalories/predictTargetDate/ALGORITHM_VERSION`（shared），`resultRepo`
- Produces: `assessmentService.submit(id): Promise<{ status:'completed' }>`；`POST /api/assessments/:id/submit`
  - 提交前用 `submitSchema` 校验完整数据；缺失字段 → 400

- [ ] **Step 1: 写失败测试**

`apps/api/tests/integration/submit.spec.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { createApp } from '../../src/app';

const app = createApp();
const h = (u: string) => ({ 'x-user-id': u, 'content-type': 'application/json' });
async function resetDb() {
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}
async function fullAssessment() {
  const { userId, assessmentId } = await (await app.request('/api/assessments', { method: 'POST' })).json();
  await app.request(`/api/assessments/${assessmentId}`, {
    method: 'PATCH', headers: h(userId),
    body: JSON.stringify({ gender: 'female', primary_goal: 'lose_weight', age: 28, height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light', current_step: 4 }),
  });
  return { userId, assessmentId };
}

describe('submit', () => {
  beforeEach(resetDb);
  it('computes and persists a result', async () => {
    const { userId, assessmentId } = await fullAssessment();
    const res = await app.request(`/api/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(userId) });
    expect(res.status).toBe(200);
    const stored = await prisma.assessmentResult.findUnique({ where: { assessmentId } });
    expect(stored).not.toBeNull();
    expect(Number(stored!.bmi)).toBeCloseTo(25.71, 1);
    expect(stored!.bmiCategory).toBe('overweight');
  });
  it('rejects submit with incomplete data (400)', async () => {
    const { userId, assessmentId } = await (async () => {
      const j = await (await app.request('/api/assessments', { method: 'POST' })).json();
      await app.request(`/api/assessments/${j.assessmentId}`, { method: 'PATCH', headers: h(j.userId), body: JSON.stringify({ gender: 'male', current_step: 1 }) });
      return j;
    })();
    const res = await app.request(`/api/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(userId) });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @betterme/api test submit`
Expected: FAIL

- [ ] **Step 3: 实现 submit**

在 `assessment.service.ts` 追加：
```ts
import { submitSchema, calcBmi, bmiCategory, calcDailyCalories, predictTargetDate, ALGORITHM_VERSION } from '@betterme/shared';
import { resultRepo } from '../repositories/result.repository';

// ... 内部 assessmentService 对象追加：
async submit(id: string) {
  const a = await assessmentRepo.findById(id);
  if (!a) throw AppError.notFound('assessment not found');
  const parsed = submitSchema.safeParse({
    gender: a.gender, primary_goal: a.primaryGoal, age: a.age,
    height_cm: a.heightCm ? Number(a.heightCm) : undefined,
    weight_kg: a.weightKg ? Number(a.weightKg) : undefined,
    target_weight_kg: a.targetWeightKg ? Number(a.targetWeightKg) : undefined,
    workout_frequency: a.workoutFrequency,
  });
  if (!parsed.success) throw AppError.badRequest('assessment data incomplete', 'INCOMPLETE');
  const d = parsed.data;
  const bmi = calcBmi(d.weight_kg, d.height_cm);
  await resultRepo.upsert(id, {
    bmi, bmiCategory: bmiCategory(bmi),
    dailyCalorieIntake: calcDailyCalories({ gender: d.gender, age: d.age, heightCm: d.height_cm, weightKg: d.weight_kg, frequency: d.workout_frequency, goal: d.primary_goal }),
    targetDate: predictTargetDate(d.weight_kg, d.target_weight_kg, new Date()),
    algorithmVersion: ALGORITHM_VERSION,
  });
  await assessmentRepo.markCompleted(id);
  return { status: 'completed' as const };
},
```

`assessment.controller.ts` 追加：
```ts
async submit(c: Context) {
  return c.json(await assessmentService.submit(c.req.param('id')));
},
```

`assessment.routes.ts` 追加：
```ts
assessmentRoutes.post('/:id/submit', requireOwnership, assessmentController.submit);
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @betterme/api test submit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "feat(api): submit endpoint computes and persists health result"
```

---

### Task 9: 订阅鉴权、差异化返回与模拟支付

**Files:**
- Create: `apps/api/src/lib/serializers.ts`
- Create: `apps/api/src/services/result.service.ts`, `apps/api/src/services/subscription.service.ts`
- Create: `apps/api/src/controllers/payment.controller.ts`
- Create: `apps/api/src/routes/payment.routes.ts`
- Modify: `apps/api/src/controllers/assessment.controller.ts`, `assessment.routes.ts`, `routes/index.ts`
- Test: `apps/api/tests/integration/auth-diff.spec.ts`

**Interfaces:**
- Consumes: `resultRepo`, `subscriptionRepo`, `assessmentRepo`
- Produces:
  - `serializeResult(result, isMember)` → 会员完整 / 非会员脱敏（隐藏 `daily_calorie_intake`/`target_date`，加 `locked:true`）
  - `resultService.getResult(assessmentId)` → `{ member: boolean, result }`
  - `subscriptionService.pay(userId): activate`
  - `GET /api/assessments/:id/result`、`POST /api/pay`

- [ ] **Step 1: 写失败测试（脱敏 vs 完整 + /pay 解锁）**

`apps/api/tests/integration/auth-diff.spec.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { createApp } from '../../src/app';

const app = createApp();
const h = (u: string) => ({ 'x-user-id': u, 'content-type': 'application/json' });
async function resetDb() {
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}
async function completed() {
  const { userId, assessmentId } = await (await app.request('/api/assessments', { method: 'POST' })).json();
  await app.request(`/api/assessments/${assessmentId}`, { method: 'PATCH', headers: h(userId), body: JSON.stringify({ gender: 'female', primary_goal: 'lose_weight', age: 28, height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light', current_step: 4 }) });
  await app.request(`/api/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(userId) });
  return { userId, assessmentId };
}

describe('differentiated result & pay unlock', () => {
  beforeEach(resetDb);

  it('non-member gets masked result (no protected fields)', async () => {
    const { userId, assessmentId } = await completed();
    const res = await app.request(`/api/assessments/${assessmentId}/result`, { headers: h(userId) });
    const body = await res.json();
    expect(body.member).toBe(false);
    expect(body.result.bmi).toBeDefined();
    expect(body.result.daily_calorie_intake).toBeUndefined();
    expect(body.result.target_date).toBeUndefined();
    expect(body.result.locked).toBe(true);
  });

  it('after /pay the same result becomes full', async () => {
    const { userId, assessmentId } = await completed();
    const pay = await app.request('/api/pay', { method: 'POST', headers: h(userId), body: JSON.stringify({ userId, assessmentId }) });
    expect(pay.status).toBe(200);
    const res = await app.request(`/api/assessments/${assessmentId}/result`, { headers: h(userId) });
    const body = await res.json();
    expect(body.member).toBe(true);
    expect(body.result.daily_calorie_intake).toBeGreaterThan(0);
    expect(body.result.target_date).toBeDefined();
    expect(body.result.locked).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @betterme/api test auth-diff`
Expected: FAIL

- [ ] **Step 3: 实现 serializer / services / payment**

`apps/api/src/lib/serializers.ts`:
```ts
import type { AssessmentResult } from '@prisma/client';

export function serializeResult(r: AssessmentResult, isMember: boolean) {
  const base = {
    bmi: Number(r.bmi),
    bmi_category: r.bmiCategory,
  };
  if (!isMember) {
    return { ...base, locked: true, message: '升级会员查看每日建议摄入与目标达成日期' };
  }
  return {
    ...base,
    daily_calorie_intake: r.dailyCalorieIntake,
    target_date: r.targetDate.toISOString().slice(0, 10),
    algorithm_version: r.algorithmVersion,
  };
}
```

`apps/api/src/services/subscription.service.ts`:
```ts
import { AppError } from '../lib/errors';
import { subscriptionRepo } from '../repositories/subscription.repository';

export const subscriptionService = {
  async isMember(userId: string) {
    const s = await subscriptionRepo.findByUser(userId);
    return s?.status === 'active';
  },
  async pay(userId: string) {
    const s = await subscriptionRepo.findByUser(userId);
    if (!s) throw AppError.notFound('subscription not found');
    await subscriptionRepo.activate(userId, `pay_${Date.now()}`);
    return { status: 'active' as const };
  },
};
```

`apps/api/src/services/result.service.ts`:
```ts
import { AppError } from '../lib/errors';
import { resultRepo } from '../repositories/result.repository';
import { subscriptionService } from './subscription.service';
import { serializeResult } from '../lib/serializers';

export const resultService = {
  async getResult(assessmentId: string, userId: string) {
    const r = await resultRepo.findByAssessment(assessmentId);
    if (!r) throw AppError.notFound('result not ready');
    const member = await subscriptionService.isMember(userId);
    return { member, result: serializeResult(r, member) };
  },
};
```

`apps/api/src/controllers/payment.controller.ts`:
```ts
import type { Context } from 'hono';
import type { PayRequest } from '@betterme/shared';
import { subscriptionService } from '../services/subscription.service';

export const paymentController = {
  async pay(c: Context) {
    const { userId } = c.get('body') as PayRequest;
    return c.json(await subscriptionService.pay(userId));
  },
};
```

`apps/api/src/routes/payment.routes.ts`:
```ts
import { Hono } from 'hono';
import { paySchema } from '@betterme/shared';
import { validateBody } from '../middlewares/validate';
import { paymentController } from '../controllers/payment.controller';

export const paymentRoutes = new Hono();
paymentRoutes.post('/', validateBody(paySchema), paymentController.pay);
```

`assessment.controller.ts` 追加 result handler：
```ts
import { resultService } from '../services/result.service';
// ...
async result(c: Context) {
  const userId = c.req.header('x-user-id')!;
  return c.json(await resultService.getResult(c.req.param('id'), userId));
},
```

`assessment.routes.ts` 追加：
```ts
assessmentRoutes.get('/:id/result', requireOwnership, assessmentController.result);
```

`routes/index.ts` 追加：
```ts
import { paymentRoutes } from './payment.routes';
api.route('/pay', paymentRoutes);
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @betterme/api test`
Expected: PASS（全部后端集成测试）

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "feat(api): subscription gating, masked/full result serialization and mock pay"
```

---

### Task 10: 前端骨架（Vite + React + 路由 + api-client + session）

**Files:**
- Create: `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/index.html`
- Create: `apps/web/src/main.tsx`, `apps/web/src/routes/index.tsx`
- Create: `apps/web/src/lib/session.ts`, `apps/web/src/lib/api-client.ts`
- Test: `apps/web/tests/session.spec.ts`

**Interfaces:**
- Produces:
  - `getUserId()/setUserId()`（localStorage），`getAssessmentId()/setAssessmentId()`
  - `api.createAssessment()`, `api.getProgress(id)`, `api.saveStep(id, data)`, `api.submit(id)`, `api.getResult(id)`, `api.pay(userId, assessmentId)`
  - 路由：`/`（funnel）、`/result`

- [ ] **Step 1: 创建前端包与配置**

`apps/web/package.json`:
```json
{
  "name": "@betterme/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@betterme/shared": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0",
    "@playwright/test": "^1.48.0",
    "typescript": "^5.6.0"
  }
}
```

`apps/web/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
```

`apps/web/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "jsx": "react-jsx", "types": ["node", "vite/client"] }, "include": ["src", "tests"] }
```

`apps/web/index.html`:
```html
<!doctype html>
<html lang="zh"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>BetterMe 健康测评</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```

- [ ] **Step 2: 写失败测试（session 往返）**

`apps/web/tests/session.spec.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getUserId, setUserId } from '../src/lib/session';

describe('session', () => {
  beforeEach(() => localStorage.clear());
  it('stores and reads user id', () => {
    expect(getUserId()).toBeNull();
    setUserId('u1');
    expect(getUserId()).toBe('u1');
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @betterme/web test`
Expected: FAIL

- [ ] **Step 4: 实现 session / api-client / 路由骨架**

`apps/web/src/lib/session.ts`:
```ts
const USER = 'bm_user_id';
const ASSESS = 'bm_assessment_id';
export const getUserId = () => localStorage.getItem(USER);
export const setUserId = (v: string) => localStorage.setItem(USER, v);
export const getAssessmentId = () => localStorage.getItem(ASSESS);
export const setAssessmentId = (v: string) => localStorage.setItem(ASSESS, v);
```

`apps/web/src/lib/api-client.ts`:
```ts
import type { StepUpdate } from '@betterme/shared';
import { getUserId } from './session';

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(getUserId() ? { 'x-user-id': getUserId()! } : {}), ...init.headers },
  });
  if (!res.ok) throw new Error((await res.json()).error?.message ?? 'request failed');
  return res.json();
}

export const api = {
  createAssessment: () => req('/assessments', { method: 'POST' }),
  getProgress: (id: string) => req(`/assessments/${id}`),
  saveStep: (id: string, data: StepUpdate) => req(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  submit: (id: string) => req(`/assessments/${id}/submit`, { method: 'POST' }),
  getResult: (id: string) => req(`/assessments/${id}/result`),
  pay: (userId: string, assessmentId: string) => req('/pay', { method: 'POST', body: JSON.stringify({ userId, assessmentId }) }),
};
```

`apps/web/src/routes/index.tsx`:
```tsx
import { createBrowserRouter } from 'react-router-dom';
import { FunnelPage } from '../pages/FunnelPage';
import { ResultPage } from '../pages/ResultPage';

export const router = createBrowserRouter([
  { path: '/', element: <FunnelPage /> },
  { path: '/result', element: <ResultPage /> },
]);
```

`apps/web/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>,
);
```

`apps/web/src/styles.css`:
```css
:root { font-family: system-ui, sans-serif; }
body { margin: 0; background: #f7f8fa; color: #1a1a1a; }
.container { max-width: 480px; margin: 0 auto; padding: 24px; }
button { cursor: pointer; }
```

> `FunnelPage`/`ResultPage` 在 T11/T12 实现；本步先建最小占位以让路由编译：
`apps/web/src/pages/FunnelPage.tsx` & `ResultPage.tsx`（占位）:
```tsx
export function FunnelPage() { return <div className="container">funnel</div>; }
```
```tsx
export function ResultPage() { return <div className="container">result</div>; }
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @betterme/web test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold vite react app with router, session and api client"
```

---

### Task 11: Funnel 多步表单 + 自动保存 + 进度恢复

**Files:**
- Create: `apps/web/src/store/funnel.ts`
- Create: `apps/web/src/features/assessment/steps/*` (Gender/Goal/Body/Frequency)
- Create: `apps/web/src/features/assessment/hooks/useFunnel.ts`
- Modify: `apps/web/src/pages/FunnelPage.tsx`
- Test: `apps/web/tests/funnel.spec.tsx`

**Interfaces:**
- Consumes: `api`（T10）
- Produces:
  - `FunnelPage`：进入时若有 `assessmentId` 则 `getProgress` 恢复到 `current_step`；否则 `createAssessment`
  - 每步"下一步"时 `saveStep`（含 `current_step`）；最后一步跳转 `/result` 前 `submit`

- [ ] **Step 1: 写失败测试（组件渲染首步 + 下一步保存）**

`apps/web/tests/funnel.spec.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FunnelPage } from '../src/pages/FunnelPage';
import * as client from '../src/lib/api-client';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(client.api, 'createAssessment').mockResolvedValue({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });
  vi.spyOn(client.api, 'saveStep').mockResolvedValue({} as never);
});

describe('FunnelPage', () => {
  it('renders the gender step first and saves on next', async () => {
    render(<MemoryRouter><FunnelPage /></MemoryRouter>);
    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    await waitFor(() => expect(client.api.saveStep).toHaveBeenCalled());
  });
});
```
> 需在 `apps/web/package.json` devDependencies 加 `@testing-library/react`、`@testing-library/dom`，并在 `vitest.config` 加 `setupFiles` 引 `@testing-library/jest-dom`（此步一并加）。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @betterme/web test funnel`
Expected: FAIL

- [ ] **Step 3: 实现 store / steps / hook / 页面**

`apps/web/src/store/funnel.ts`（最小 reducer 或 useState 皆可；此处用简单模块）:
```ts
import type { StepUpdate } from '@betterme/shared';
export const STEPS = ['gender', 'goal', 'body', 'frequency'] as const;
export type StepData = StepUpdate;
```

`useFunnel.ts` — 管理当前步、数据、创建/恢复/保存：
```ts
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StepData } from '../../../store/funnel';
import { api } from '../../../lib/api-client';
import { getUserId, setUserId, getAssessmentId, setAssessmentId } from '../../../lib/session';

export function useFunnel() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>({});
  const [ready, setReady] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const existing = getAssessmentId();
      if (existing) {
        const p = await api.getProgress(existing);
        setData(p); setStep(p.current_step ?? 0);
      } else {
        const s = await api.createAssessment();
        setUserId(s.userId); setAssessmentId(s.assessmentId);
      }
      setReady(true);
    })();
  }, []);

  async function next(patch: StepData) {
    const merged = { ...data, ...patch };
    setData(merged);
    const nextStep = step + 1;
    await api.saveStep(getAssessmentId()!, { ...patch, current_step: nextStep });
    if (nextStep >= 4) {
      await api.submit(getAssessmentId()!);
      nav('/result');
    } else {
      setStep(nextStep);
    }
  }
  return { step, data, ready, next, userId: getUserId() };
}
```

各 step 组件（示例 Gender，其余同构）`steps/GenderStep.tsx`:
```tsx
import { useState } from 'react';
export function GenderStep({ onNext }: { onNext: (p: { gender: 'male' | 'female' }) => void }) {
  const [g, setG] = useState<'male' | 'female'>();
  return (
    <div className="container">
      <h2>你的性别</h2>
      <button aria-pressed={g === 'female'} onClick={() => setG('female')}>女 / female</button>
      <button aria-pressed={g === 'male'} onClick={() => setG('male')}>男 / male</button>
      <button disabled={!g} onClick={() => onNext({ gender: g! })}>下一步 / next</button>
    </div>
  );
}
```
> Goal/Body/Frequency 步骤类比实现：Goal 选 `primary_goal`；Body 输入 `age/height_cm/weight_kg/target_weight_kg`（number input，前端用 `stepUpdateSchema` 预校验）；Frequency 选 `workout_frequency`。每步末调用 `onNext(patch)`。

`FunnelPage.tsx`:
```tsx
import { useFunnel } from '../features/assessment/hooks/useFunnel';
import { GenderStep } from '../features/assessment/steps/GenderStep';
import { GoalStep } from '../features/assessment/steps/GoalStep';
import { BodyStep } from '../features/assessment/steps/BodyStep';
import { FrequencyStep } from '../features/assessment/steps/FrequencyStep';

export function FunnelPage() {
  const { step, ready, next } = useFunnel();
  if (!ready) return <div className="container">加载中…</div>;
  return (
    <>
      <progress value={step + 1} max={4} style={{ width: '100%' }} />
      {step === 0 && <GenderStep onNext={next} />}
      {step === 1 && <GoalStep onNext={next} />}
      {step === 2 && <BodyStep onNext={next} />}
      {step === 3 && <FrequencyStep onNext={next} />}
    </>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @betterme/web test funnel`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): multi-step funnel with autosave and progress recovery"
```

---

### Task 12: 结果页 + 付费墙 + 模拟支付解锁

**Files:**
- Create: `apps/web/src/features/result/ResultView.tsx`, `apps/web/src/features/paywall/Paywall.tsx`
- Modify: `apps/web/src/pages/ResultPage.tsx`
- Test: `apps/web/tests/result.spec.tsx`

**Interfaces:**
- Consumes: `api.getResult`, `api.pay`
- Produces: `ResultPage`：加载 result；`member=false` 显示脱敏 + Paywall；点击支付 → `api.pay` → 重新拉取 → 显示完整

- [ ] **Step 1: 写失败测试（脱敏态点击支付后显示完整）**

`apps/web/tests/result.spec.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResultPage } from '../src/pages/ResultPage';
import * as client from '../src/lib/api-client';

beforeEach(() => {
  localStorage.setItem('bm_user_id', 'u1');
  localStorage.setItem('bm_assessment_id', 'a1');
  const getResult = vi.spyOn(client.api, 'getResult');
  getResult.mockResolvedValueOnce({ member: false, result: { bmi: 25.7, bmi_category: 'overweight', locked: true } });
  getResult.mockResolvedValueOnce({ member: true, result: { bmi: 25.7, bmi_category: 'overweight', daily_calorie_intake: 1680, target_date: '2026-06-01' } });
  vi.spyOn(client.api, 'pay').mockResolvedValue({ status: 'active' });
});

describe('ResultPage', () => {
  it('shows paywall then full result after pay', async () => {
    render(<MemoryRouter><ResultPage /></MemoryRouter>);
    await waitFor(() => screen.getByText(/升级|解锁|unlock/i));
    expect(screen.queryByText(/1680/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /支付|解锁|pay/i }));
    await waitFor(() => screen.getByText(/1680/));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @betterme/web test result`
Expected: FAIL

- [ ] **Step 3: 实现 ResultView / Paywall / ResultPage**

`apps/web/src/features/paywall/Paywall.tsx`:
```tsx
export function Paywall({ onPay, loading }: { onPay: () => void; loading: boolean }) {
  return (
    <div className="container" style={{ border: '1px solid #e2e4e8', borderRadius: 12, padding: 20 }}>
      <h3>解锁你的完整计划</h3>
      <p>升级会员查看每日建议摄入量与目标达成日期。</p>
      <button onClick={onPay} disabled={loading}>{loading ? '处理中…' : '立即解锁 / pay'}</button>
    </div>
  );
}
```

`apps/web/src/features/result/ResultView.tsx`:
```tsx
export function ResultView({ result, member }: { result: any; member: boolean }) {
  return (
    <div className="container">
      <h2>你的健康测评结果</h2>
      <p>BMI：<b>{result.bmi.toFixed(1)}</b>（{result.bmi_category}）</p>
      {member && (
        <>
          <p>每日建议摄入：<b>{result.daily_calorie_intake}</b> kcal</p>
          <p>预计达成目标：<b>{result.target_date}</b></p>
        </>
      )}
    </div>
  );
}
```

`apps/web/src/pages/ResultPage.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api-client';
import { getUserId, getAssessmentId } from '../lib/session';
import { ResultView } from '../features/result/ResultView';
import { Paywall } from '../features/paywall/Paywall';

export function ResultPage() {
  const [state, setState] = useState<{ member: boolean; result: any } | null>(null);
  const [paying, setPaying] = useState(false);
  const id = getAssessmentId();

  async function load() { setState(await api.getResult(id!)); }
  useEffect(() => { load(); }, []);

  async function pay() {
    setPaying(true);
    await api.pay(getUserId()!, id!);
    await load();
    setPaying(false);
  }
  if (!state) return <div className="container">加载中…</div>;
  return (
    <>
      <ResultView result={state.result} member={state.member} />
      {!state.member && <Paywall onPay={pay} loading={paying} />}
    </>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @betterme/web test result`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): result page with paywall and pay-to-unlock flow"
```

---

### Task 13: 端到端测试（Playwright，全链路解锁）

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/funnel.e2e.ts`

**Interfaces:**
- Consumes: 本地 `apps/api`（8787）+ `apps/web`（5173）同时运行
- Produces: 一条 E2E 覆盖 funnel 填写 → 结果脱敏 → 支付 → 完整

- [ ] **Step 1: 写 Playwright 配置**

`apps/web/playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: [
    { command: 'pnpm --filter @betterme/api dev', port: 8787, reuseExistingServer: true },
    { command: 'pnpm --filter @betterme/web dev', port: 5173, reuseExistingServer: true },
  ],
});
```

- [ ] **Step 2: 写 E2E 用例**

`apps/web/e2e/funnel.e2e.ts`:
```ts
import { test, expect } from '@playwright/test';

test('funnel to paywall to unlock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /女|female/i }).click();
  await page.getByRole('button', { name: /下一步|next/i }).click();
  // Goal
  await page.getByRole('button', { name: /减脂|lose/i }).click();
  await page.getByRole('button', { name: /下一步|next/i }).click();
  // Body
  await page.getByLabel(/年龄|age/i).fill('28');
  await page.getByLabel(/身高|height/i).fill('165');
  await page.getByLabel(/体重|weight/i).first().fill('70');
  await page.getByLabel(/目标体重|target/i).fill('60');
  await page.getByRole('button', { name: /下一步|next/i }).click();
  // Frequency
  await page.getByRole('button', { name: /轻度|light/i }).click();
  await page.getByRole('button', { name: /下一步|next|完成/i }).click();
  // Result masked
  await expect(page.getByText(/解锁|升级|unlock/i)).toBeVisible();
  await page.getByRole('button', { name: /支付|解锁|pay/i }).click();
  // Full
  await expect(page.getByText(/每日建议摄入|daily/i)).toBeVisible();
});
```

- [ ] **Step 3: 运行 E2E（需先配置好 DB）**

Run: `pnpm --filter @betterme/web e2e`
Expected: PASS（1 passed）

- [ ] **Step 4: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e
git commit -m "test(web): e2e funnel to paywall to unlock"
```

---

### Task 14: CI（GitHub Actions）

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: push/PR 触发 lint + typecheck + 单元/集成测试（用 CI 内置 Postgres service）

- [ ] **Step 1: 写 CI 工作流**

`.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test?schema=public
      DIRECT_URL: postgresql://postgres:postgres@localhost:5432/test?schema=public
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @betterme/api exec prisma migrate deploy
      - run: pnpm --filter @betterme/api exec prisma generate
      - run: pnpm typecheck
      - run: pnpm test
```

- [ ] **Step 2: 本地验证 workflow 语法**

Run: `pnpm dlx @action-validator/cli .github/workflows/ci.yml` （或人工核对缩进）
Expected: 无语法错误

- [ ] **Step 3: Commit + 推送触发 CI**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run typecheck and tests with postgres service"
```

> 推送后在 README 贴 `![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)`。

---

### Task 15: 部署 + 交付文档

**Files:**
- Create: `apps/api/wrangler.toml`, `apps/api/src/worker.ts`
- Create: `apps/web/wrangler.toml`（或 Pages 项目设置）
- Create: `README.md`, `docs/api/README.md`, `docs/db/schema.md`, `docs/AI-REVIEW.md`
- Modify: `apps/api/src/lib/prisma.ts`（Workers driver adapter）

**Interfaces:**
- Produces: 公网 URL（前端 Pages + 后端 Workers）、完整 README、Schema 图、AI 复盘

- [ ] **Step 1: Workers 入口与 Prisma driver adapter**

`apps/api/src/worker.ts`:
```ts
import { createApp } from './app';
export default { fetch: createApp().fetch };
```
`apps/api/wrangler.toml`:
```toml
name = "betterme-api"
main = "src/worker.ts"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]
```
> Prisma on Workers：`schema.prisma` 的 generator 加 `previewFeatures = ["driverAdapters"]`，`lib/prisma.ts` 用 `@prisma/adapter-pg` + Supabase 连接串（`DATABASE_URL` 走 Supabase pooler `:6543`）。若适配摩擦大，**回退方案**：后端部署 Render/Railway（Node 原生，Prisma 零改动），前端仍 Cloudflare Pages、DB 仍 Supabase——不影响任何评分项。

- [ ] **Step 2: 部署前端到 Cloudflare Pages**

Run: 连接 GitHub 仓库到 Cloudflare Pages，构建命令 `pnpm --filter @betterme/web build`，输出目录 `apps/web/dist`，环境变量 `VITE_API_BASE`（指向 Workers URL）。
Expected: 拿到公网前端 URL；funnel 可完整走通。

- [ ] **Step 3: 部署后端**

Run: `pnpm --filter @betterme/api exec wrangler deploy`（或 Render）。设置 `DATABASE_URL`/`DIRECT_URL` 为 Supabase 连接串。
Expected: 后端公网可达；`/api/health` 返回 ok。

- [ ] **Step 4: 写 README（交付物核心）**

`README.md` 必含：
- 项目简介 + 架构图 + 技术栈
- 本地启动：`pnpm install` → 配 `.env` → `prisma migrate dev` → `db:seed` → `pnpm --filter api dev` + `pnpm --filter web dev`
- 一键测试：`pnpm test`；E2E：`pnpm --filter web e2e`；CI 徽章
- **API 文档**（六个端点：方法/路径/请求/响应/错误码）
- **`/pay` 的 cURL**：
  ```bash
  curl -X POST "$API/api/pay" -H "content-type: application/json" \
    -H "x-user-id: <PAID_TEST_USER_ID>" \
    -d '{"userId":"<PAID_TEST_USER_ID>","assessmentId":"<PAID_TEST_ASSESSMENT_ID>"}'
  ```
- **已支付测试 sessionId**：贴 seed 打印的 `PAID_TEST_USER_ID` / `PAID_TEST_ASSESSMENT_ID`，说明如何对比付费前后差异
- 测试覆盖范围说明：覆盖了什么、为什么、哪些没覆盖及原因

- [ ] **Step 5: Schema 图与 AI 复盘**

`docs/db/schema.md`：用 Mermaid ER 图画四表关系：
```
erDiagram
  users ||--o{ assessments : has
  assessments ||--o| assessment_results : produces
  users ||--o| subscriptions : owns
```
`docs/AI-REVIEW.md`：写 AI 如何辅助建模/Mock/复杂逻辑/测试生成 + **一次否决 AI 方案的记录**（为什么否决）。

- [ ] **Step 6: 最终验证与 Commit**

Run: `pnpm test`（全绿）+ 线上跑一遍 funnel + `/pay`
```bash
git add -A
git commit -m "docs: add README, api docs, schema diagram, AI review; chore: deploy config"
```

---

## Self-Review

**Spec coverage：**
- §Persistence（分步保存/恢复）→ T7 ✓
- §Core Logic（算法+持久化）→ T3 + T8 ✓
- §Auth & Access（鉴权/差异化/`/pay`）→ T9 ✓
- §测试（单元/集成/E2E/CI）→ T3、T7-9、T13、T14 ✓
- §DB 建模（四表+迁移）→ T4 ✓
- §数据验证（非法/越界）→ T2（schema）+ T7 测试 ✓
- §前端 funnel → T10-12 ✓
- §交付物（URL/README/Schema图/AI复盘/预支付session）→ T4 seed + T15 ✓

**Placeholder scan：** 占位组件（FunnelPage/ResultPage/health/index）均标注"占位，Task N 填充"并给出后续实现，非计划漏洞。

**Type consistency：** `StepUpdate`/`AssessmentInput`（shared）贯穿 repo/service/controller；`serializeResult` 字段（`daily_calorie_intake`/`target_date`）与前端 `ResultView`、测试断言一致；`x-user-id` header 约定贯穿 ownership/api-client/E2E 一致。
