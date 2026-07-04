# Funnel UI Redesign Design

## Goal

Redesign the web funnel so it feels like a low-pressure Pilates and body-shape assessment that guides users toward a paid report/action-plan unlock.

## Product Direction

- Start immediately with a question, not a landing page.
- Use five visible stages to reduce pressure.
- Use more choice-based screens, with choice answers advancing automatically.
- Keep numeric inputs only where the backend algorithm requires exact values.
- Present extra persuasion answers as UI/local context only; do not expand the backend schema in this pass.
- Position the paid offer as "完整报告与行动方案", not a demo membership or real AI coach promise.

## Five Stages

1. 兴趣切入: Pilates interest and desired improvement.
2. 当前状态: current body shape and priority area.
3. 期望结果: desired body outcome and expected pace.
4. 基础数据: gender, age, height, current weight, target weight.
5. 生活节奏与结果: workout frequency, main blocker, result preview, paid unlock.

## Visual Language

- Claude-like humane editorial minimalism.
- Source Han Serif/Noto Serif CJK first, then system serif fallback.
- Warm off-white background, charcoal text, muted clay/sage accent.
- Desktop-first horizontal layout with generous whitespace.
- Optional right-side feedback panel when useful.
- 8px radius controls, fine hairline borders, restrained hover/selected states.
- No "选择后自动继续" hint, no heavy gradients, no loud conversion copy.

## Implementation Scope

- Frontend only.
- Preserve existing API contract and result/pay flow.
- Continue saving backend-required fields and `current_step`.
- Result page still supports masked preview, `/pay`, full result refresh, restart, and existing error handling.

## Verification

- Add/update component tests for the Pilates-first screen and auto-advance behavior.
- Run focused web tests.
- Run web build.
- Start a dev server and inspect the redesigned page in a browser if feasible.
