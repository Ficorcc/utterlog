# TanStack Start 全栈迁移（已完成）

Utterlog 已统一为 **TanStack Start + React 19 + TanStack Router + Bun 1.4**。

## 请求链路

```text
浏览器 -> Bun/Hono 安全与静态文件外壳 -> TanStack Start
                                      |- 页面 SSR
                                      |- Admin 入口
                                      `- /api/* Server Routes
```

Hono 不再注册业务 API，也不存在旧 API 回退。前台页面继续复用现有主题和内容组件，样式、主题变量与数据库结构保持兼容。

## 运行方式

容器默认使用：

```bash
UTTERLOG_FRONTEND=start
WEB_RENDERER=start
```

生产镜像固定到官方 `oven/bun:canary` 的已验证摘要；该镜像运行 `bun --version` 返回 `1.4.0`。

## 验证

```bash
bun run server:check
bun run start:build
bun run start:check
bun test
```

API 与页面响应应包含 `x-utterlog-renderer: tanstack-start`，未知 API 应返回 JSON `404`。
