# AI 使用复盘 — BetterMe 健康测评

1. **借助 skill 先规划**：用 superpowers 的 brainstorming / 写计划等 skill，先把需求和边界聊清楚，产出一份实现计划，**先定代码结构再动手**（分层、模块边界、数据契约）。
2. **测试驱动开发（TDD）**：核心逻辑先写测试再写实现，红→绿→重构；让 AI 补边界用例。
3. **验收 AI 产出**。
4. **再打磨细节**：结构层面的优化，比如**路由与实现分离**（routes 只声明方法/路径/中间件，业务下沉到 service/repository）、**前后端分离**（monorepo + shared 包做单一契约）。
5. **先后端、后前端**，力求各模块完全解耦。
6. **部署走 CLI**：`railway up` 部署 API、`wrangler pages deploy` 部署前端，全流程命令行完成。

