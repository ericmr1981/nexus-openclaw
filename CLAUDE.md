# Nexus - AI Agent Session Monitor

## 用户启动方式（默认推荐）

**重要：当用户询问如何启动项目时，推荐使用以下方式：**

```bash
npm start
```

这是真正的用户启动方式：
- 一键启动前后端（生产模式）
- 单进程同时提供后端 API 和前端界面
- 访问 http://localhost:7878 即可使用
- 后台运行，适合日常使用

其他用户命令：
```bash
npm stop       # 停止服务
npm restart    # 重启服务
npm run status # 查看运行状态
```

## 开发者模式（仅用于开发调试）

**注意：`npm run dev:all` 是开发者模式，不是用户启动方式。**

仅在以下情况推荐使用：
- 需要修改前端代码并实时热重载
- 需要同时调试前后端
- 明确表示要进行开发调试

```bash
npm run dev:all
```

开发模式特点：
- 前后端分离运行
- 前端：http://localhost:5173（Vite 热重载）
- 后端：http://localhost:7878
- 前台运行，占用终端

## 项目架构

- 后端：Express + WebSocket（监控 Claude Code/Codex/OpenClaw 会话）
- 前端：React + Vite（实时展示会话流和用量统计）
- 生产模式：后端静态服务前端构建产物（`dist/`）
- 开发模式：前后端独立运行，支持热重载

## 监控目录

- Claude Code：`~/.claude/projects/`
- Codex：`~/.codex/sessions/`
- OpenClaw：`~/.openclaw/agents/`

## 关键文件

- `server/index.js` - 后端入口，生产模式启动点
- `scripts/nexusctl.sh` - 启动控制脚本
- `client/` - 前端源码
- `dist/` - 前端构建产物（生产模式使用）
