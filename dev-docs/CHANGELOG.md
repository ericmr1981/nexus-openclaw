# Nexus 变更日志

## [Unreleased]

### 2026-03-17 - 启动说明

#### 记录 (Notes)
- 启动 Nexus + Bit Office 供本地验证展示（由用户自行查看页面效果）。
- Bit Office 前端仅展示 OpenClaw agents（隐藏本地/其他外部 agent）。
- Agent 信息窗口隐藏工具调用内容（tool call 过滤）。
- Agent 消息中将 `workspace` 显示为 `said`，移除所有方括号内容与 `tool_output` 行。

### 2026-03-16 - OpenClaw lifecycle + 活动摘要

#### 修改 (Changed)
- Bit Office 顶部 Agent 条加入最近活动摘要（基于 LOG_APPEND / 结果摘要）。
- 通过 OpenClaw Proxy 日志补充 lifecycle（start/end/error）精确状态与摘要提示。

#### 限制 (Limitations)
- 依赖 OpenClaw Proxy 正在运行并产生日志；未运行时仍仅能用 active/idle/cooling 近似。

### 2026-03-16 - OpenClaw → Bit Office（方案1）限制记录

#### 记录 (Notes)
- 方案1仅桥接 Nexus 现有数据源，不引入额外 OpenClaw 网关事件或代理。
- 当前无法在 Bit Office 页面完整呈现的内容：
- 单个 agent 实时 Token 使用（缺少 per-agent/per-session TOKEN_UPDATE）。
- 任务级事件与结果（TASK_STARTED / TASK_DONE / TASK_FAILED / APPROVAL_NEEDED / 预览信息 / diff 等）。
- 团队与角色语义（TEAM_PHASE / TEAM_CHAT / AGENT_DEFS 等）。
- 真实 PID 与工作目录（OpenClaw agent 非本地子进程，Nexus 无 PID；workspace 信息不稳定）。

### 2026-02-16 - 文档全量同步（与当前实现对齐）

#### 修改 (Changed)
- 全面更新用户文档：
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/API.md`
  - `docs/CONTRIBUTING.md`
  - `docs/TROUBLESHOOTING.md`
- 更新 `client/README.md`，替换 Vite 默认模板说明为项目实际前端说明。
- 为 `dev-docs` 历史文档补充“当前实现对齐说明”，避免将历史阶段性内容误读为现状。

#### 文档口径
- 当前实现以 `server/index.js` 为主流程来源。
- 当前支持工具：`claude-code` / `codex` / `openclaw`。
- 当前 WebSocket 核心消息：`init` / `session_init` / `message_add` / `state_change` / `session_remove` / `usage_totals`。

### 2026-02-15 - 后端架构重构

**提交**: 065f4c7

#### 重构 (Refactor)
- 将单体 `server.js` (475行) 重构为模块化架构 (6个模块)
- 创建 `server/` 目录，按功能职责拆分代码
- 提取 WebSocket 通信层 (`server/websocket.js`)
- 提取会话管理模块 (`server/session-manager.js`)
- 提取文件监听模块 (`server/monitors/file-monitor.js`)
- 提取进程监控模块 (`server/monitors/process-monitor.js`)
- 提取 Claude Code 解析器 (`server/parsers/claude-code.js`)

#### 改进
- 提升代码可维护性：模块职责清晰，易于理解和修改
- 增强可扩展性：添加新工具支持只需创建新 parser
- 改善可测试性：模块独立，便于单元测试
- 代码组织更清晰：按功能分层，降低耦合度

#### 测试
- ✅ 所有功能测试通过
- ✅ Phase 1 官方验证通过 (3/3)
- ✅ 前端构建成功
- ✅ 前后端集成测试通过

#### 文档
- 更新 `docs/ARCHITECTURE.md` - 反映新的模块化架构
- 创建 `dev-docs/REFACTORING-2026-02-15.md` - 详细记录重构过程
- 更新 `README.md` - 更新项目结构说明

#### 配置
- 更新 `package.json` - main 字段指向 `server/index.js`
- 更新 `start.sh` - 启动路径改为 `server/index.js`

---

## [1.0.0] - 2026-02-15 - Phase 1 完成

### 新增 (Added)
- 实时监控 Claude Code sessions
- 文件监听 + 增量读取
- 进程扫描 + 状态机
- React 前端 + 动画效果
- WebSocket 实时通信
- 动态冷却时间算法

### 测试
- E2E 测试 13/13 通过
- Phase 1 验收测试通过

### 文档
- 完整的用户文档（docs/）
- 完整的开发文档（dev-docs/）
- 架构设计文档
- API 文档
- 故障排查指南

---

## 版本说明

版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

变更类型：
- **新增 (Added)**：新功能
- **修改 (Changed)**：现有功能的变更
- **弃用 (Deprecated)**：即将移除的功能
- **移除 (Removed)**：已移除的功能
- **修复 (Fixed)**：Bug 修复
- **安全 (Security)**：安全相关的修复
- **重构 (Refactor)**：代码重构（不改变功能）
