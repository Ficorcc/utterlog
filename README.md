<div align="center">

<img src="https://utterlog.io/icon.svg" width="80" height="80" alt="Utterlog" />

# Utterlog

**自托管个人内容平台 — 文章、说说、相册、足迹、AI 工具，一个 Bun 进程全部搞定**

*A self-hosted personal content platform for independent writers — posts, moments, albums, footprints and AI tools, served by a single Bun process.*

[![CI](https://img.shields.io/github/actions/workflow/status/utterlog/utterlog/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/utterlog/utterlog/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/utterlog/utterlog?style=flat-square)](https://github.com/utterlog/utterlog/releases)
[![License](https://img.shields.io/github/license/utterlog/utterlog?style=flat-square)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.4-black?style=flat-square&logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)

[官网](https://utterlog.io) · [安装指南](INSTALL.md) · [部署文档](deploy/README.md) · [更新日志](CHANGELOG.md)

</div>

## 这是什么

Utterlog 面向独立作者和个人站长，把博客运营需要的东西收进一个系统：文章、页面、说说、评论、媒体、相册、足迹、友链、订阅、统计与 AI 工具。数据、数据库和附件全部托管在你自己的服务器上，不依赖第三方 SaaS。

前台、后台和全部 API 由 **TanStack Start Server Routes** 提供，跑在同一个 Bun 进程里——没有微服务，没有容器编排，一个 systemd 单元就是全部运维负担。

## 功能

**内容管理**
- 文章、页面、说说、评论、媒体库
- 相册、足迹、友链、音乐与内容收藏
- WordPress / Typecho 数据导入，PostgreSQL 备份

**发布与触达**
- 服务端渲染、固定链接、SEO、RSS 与站点地图
- 公开页面 CDN 友好缓存，减少重复回源
- 5 套内置主题（Utterlog / Azure / Flux / Nebula / Renascent）、深色模式、后台可视化设置

**安全**
- Passkey 无密码登录、双因素认证
- 访问统计防刷：同页去重、行为限速、身份轮换保护

**AI 工具**
- 可配置 AI Provider（支持自定义服务地址与模型）
- 文章摘要、自动标签、AI 配图、文章 AI 伴读助手

## 技术栈

| 层 | 技术 |
|---|---|
| 全栈框架 | TanStack Start（SSR + Server Routes） |
| UI | React 19、Tailwind CSS 4 |
| 路由与数据 | TanStack Router、TanStack Query |
| 运行时 | Bun 1.4 |
| 语言与构建 | TypeScript、Vite |
| 数据库 | PostgreSQL 18 + pgvector |
| 存储 | 本地磁盘或 S3 / Cloudflare R2 |
| 部署 | Bun + systemd，Nginx / Caddy / 1Panel / 宝塔反代 |

## 快速开始

一行安装（64 位 Linux + systemd，脚本自动补齐 Bun、PostgreSQL 18 + pgvector）：

```bash
curl -fsSL https://raw.githubusercontent.com/utterlog/utterlog/main/install.sh | sudo bash
```

指定域名并启用自动 HTTPS：

```bash
curl -fsSL https://raw.githubusercontent.com/utterlog/utterlog/main/install.sh | sudo DOMAIN=blog.example.com bash
```

默认监听 `127.0.0.1:9260`，生产环境用 Nginx、Caddy、1Panel 或宝塔反向代理。详见 [INSTALL.md](INSTALL.md)。

## 本地开发

需要 Bun 1.4 和可用的 PostgreSQL：

```bash
bun install
bun run dev
```

常用命令：

```bash
bun run check          # 类型检查（服务端 + TanStack Start）
bun run build          # 构建后台 + 前台
bun run test:server    # 服务端测试
bun run verify         # 检查 + 构建 + 测试 + API 覆盖审计
```

## 部署与更新

```bash
make deploy   # 部署
make update   # 更新
make logs     # 查看日志
```

后台也支持一键升级：触发受限的 systemd 更新任务，自动拉取源码、校验构建、重启服务并健康检查。详见 [deploy/README.md](deploy/README.md)。

## 文档

- [INSTALL.md](INSTALL.md) — 安装指南
- [DEVELOPMENT.md](DEVELOPMENT.md) — 开发说明
- [deploy/](deploy/README.md) — 反代与 systemd 模板
- [CHANGELOG.md](CHANGELOG.md) — 更新日志
- [RELEASE_HISTORY.md](RELEASE_HISTORY.md) — 历史版本

## 维护者

[Utterlog contributors](https://github.com/utterlog/utterlog/graphs/contributors)

## License

[MIT](LICENSE)
