# Funnel UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the frontend funnel as a five-stage, choice-heavy, warm Pilates assessment that leads to a paid report/action-plan unlock.

**Architecture:** Keep the existing Vite React feature structure. Replace the four hard-coded questionnaire step components with a data-driven funnel page that still writes the existing backend fields and preserves current result/pay behavior.

**Tech Stack:** React 18, TypeScript, React Router, Vitest, Testing Library, Vite.

---

### Task 1: Tests

**Files:**
- Modify: `apps/web/tests/funnel.spec.tsx`
- Modify: `apps/web/tests/result.spec.tsx`

- [ ] Add coverage for the new first Pilates question.
- [ ] Add coverage that selecting a choice auto-advances.
- [ ] Update full-flow tests to use the new screen sequence.
- [ ] Update paywall copy tests away from demo membership language.

### Task 2: Funnel

**Files:**
- Modify: `apps/web/src/pages/FunnelPage.tsx`
- Modify: `apps/web/src/features/assessment/hooks/useFunnel.ts`

- [ ] Define a data-driven step list grouped into five stages.
- [ ] Let choice steps call `next()` immediately after click.
- [ ] Let local-only steps advance with `current_step` but no new backend fields.
- [ ] Keep exact numeric inputs for age, height, weight, and target weight.
- [ ] Submit only after all required backend fields exist.

### Task 3: Result And Paywall Copy

**Files:**
- Modify: `apps/web/src/features/result/ResultView.tsx`
- Modify: `apps/web/src/features/paywall/Paywall.tsx`
- Modify: `apps/web/src/pages/ResultPage.tsx`

- [ ] Reframe masked result as a preview.
- [ ] Reframe paid unlock as complete report plus 28-day action plan.
- [ ] Preserve disclaimer and restart behavior.

### Task 4: Styling

**Files:**
- Modify: `apps/web/src/styles.css`

- [ ] Apply Source Han Serif / Noto Serif CJK font stack.
- [ ] Build a desktop-first two-column questionnaire layout.
- [ ] Use warm off-white, charcoal, clay, and sage tokens.
- [ ] Keep controls simple, elegant, and low pressure.

### Task 5: Verification

- [ ] Run `pnpm --filter @betterme/web test`.
- [ ] Run `pnpm --filter @betterme/web build`.
- [ ] Start local web server and capture/inspect the redesigned page.
