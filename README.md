# Nexus

实时监控本地 AI Agent 会话（Claude Code / Codex / OpenClaw），并在前端实时展示会话流与聚合 Token / USD 用量。

## 快速启动

```bash
npm start
```

访问 **http://localhost:7878** 即可使用。

其他命令：

```bash
npm stop           # 停止服务
npm restart        # 重启服务
npm run status     # 查看运行状态
```

---

## 开发者模式

前后端分离运行，支持热重载：

```bash
npm run dev:all
```

- 前端：http://localhost:5173
- 后端：http://localhost:7878

## 当前后端行为（以 `server/index.js` 为准）

### 1) 会话发现与持续更新

- 服务启动后会先初始化价格/外部用量服务，再初始化 WebSocket，然后进行首次进程扫描并开始目录监听。
- 进程扫描周期：每 `15s`（`checkProcesses`）。
- 空闲检测周期：每 `30s`（`checkIdleSessions`）。
- 日志读取为增量模式（只处理新增 JSONL 行）。
- 对已识别的活跃文件会进行兜底轮询处理，避免漏掉未触发 watcher 的更新。

### 2) 多工具发现策略

- **Claude Code**：优先使用 `lsof` 映射到正在打开的 `.jsonl`，并结合最近修改文件兜底。
  - 最近修改保活窗口：`30 分钟`
  - 每目录最多保留：`5` 个最近会话文件
- **Codex**：基于 `lsof` 活跃文件 + 最近修改文件发现。
  - 最近修改发现窗口：`30 分钟`
  - 最多发现：`12` 个最近会话文件
- **OpenClaw**：结合 `.jsonl.lock` 与最近修改文件发现。
  - 最近修改发现窗口：`6 小时`
  - 每 agent 最多：`3` 个
  - 总上限：`12` 个

### 3) 会话状态机

- 会话状态：`active` / `idle` / `cooling` / `gone`
- `active -> idle`：2 分钟无新消息
- 进程消失后：进入 `cooling`
- `cooling` 时长：活跃时长的 10%，并限制在 `3s ~ 5min`
- `cooling` 到期后：进入 `gone` 并从内存移除

### 4) 用量与成本统计

- 启动后会在后台执行一次全量历史回扫（Claude/Codex/OpenClaw 日志）。
- 实时增量 + 历史回扫共同构成 `all_history` 口径统计。
- 运行中 Agent 计数口径：`state in {active, idle}`。
- 模型价格服务：
  - 启动时初始化
  - 每 `1h` 后台刷新价格缓存
- 外部用量同步：
  - 每 `5min` 刷新一次外部用量覆盖
  - 覆盖发生变化时广播最新聚合数据

### 5) WebSocket 事件

- 首次连接：`init`（包含当前 `sessions` 与 `usageTotals`）
- 增量事件：`session_init`、`message_add`、`state_change`、`session_remove`、`usage_totals`

### 6) OA (Operational Analytics) 服务集成

Nexus 支持自动管理 OA (Operational Analytics) 仪表盘服务：

- **启动行为**：
  - Nexus 启动时检测 OA 进程是否运行（通过 `.nexus-runtime/oa.json` PID 文件）
  - 如果是 Nexus 启动的 OA，状态会记录并在日志中显示
- **关闭行为**：
  - Nexus 收到 SIGTERM/SIGINT 时，会自动停止由 Nexus 启动的 OA 进程
  - 仅停止 `startedByNexus=true` 的进程，避免误杀外部启动的 OA
- **端口管理**：
  - 默认端口：3460
  - 如果端口冲突，自动向上扫描最多 10 个端口

## OA 服务 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/oa/status` | GET | 获取 OA 服务状态 |
| `/api/oa/start` | POST | 启动 OA 服务 |
| `/api/oa/stop` | POST | 停止 OA 服务 |
| `/api/oa/logs` | GET | 获取 OA 日志位置 |

### 启动 OA

```bash
# 使用默认配置
curl -X POST http://localhost:7878/api/oa/start

# 指定自定义配置路径
curl -X POST http://localhost:7878/api/oa/start \
  -H "Content-Type: application/json" \
  -d '{"configPath": "/path/to/oa/config.yaml"}'
```

### 获取状态

```bash
curl http://localhost:7878/api/oa/status
# 返回: {running: true, port: 3460, pid: 12345, url: "http://127.0.0.1:3460", startedByNexus: true}
```

## 监控目录

- Claude Code：`~/.claude/projects/`
- Codex：`~/.codex/sessions/`
- OpenClaw：`~/.openclaw/agents/`

## 项目结构

```text
Nexus/
├── server/
│   ├── index.js
│   ├── websocket.js
│   ├── session-manager.js
│   ├── parsers/
│   │   ├── claude-code.js
│   │   ├── codex.js
│   │   └── openclaw.js
│   ├── monitors/
│   │   ├── file-monitor.js
│   │   └── process-monitor.js
│   └── usage/
│       ├── usage-manager.js
│       └── pricing-service.js
├── client/
├── tests/
├── docs/
└── dev-docs/
```

## 测试

```bash
npm test
npm run test:codex
npm run test:usage-parsers
npm run test:usage-manager
```

## 文档

- [README.md](./README.md) - 快速开始（本文件）
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - 架构设计与核心机制
- [docs/API.md](./docs/API.md) - WebSocket API 文档
- [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) - 如何添加新工具支持
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - 故障排查指南
- [dev-docs/00-technical-spec.md](./dev-docs/00-technical-spec.md) - 完整技术规格
- [dev-docs/00-requirements.md](./dev-docs/00-requirements.md) - 需求文档
- [dev-docs/00-vision.md](./dev-docs/00-vision.md) - 产品愿景
- [dev-docs/05-phase2-implementation.md](./dev-docs/05-phase2-implementation.md) - Phase 2 实施记录
- [dev-docs/REFACTORING-2026-02-15.md](./dev-docs/REFACTORING-2026-02-15.md) - 重构记录
- [dev-docs/CHANGELOG.md](./dev-docs/CHANGELOG.md) - 变更日志

## 许可证

MIT
