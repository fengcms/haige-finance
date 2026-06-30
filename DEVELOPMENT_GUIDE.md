# 开发运行与验证说明

本文档记录项目开发、启动、验证和常见注意事项。需求原文保留在 `README.md`。

## 环境要求

1. 使用 `pnpm`，不要使用 `npm` 安装依赖。
2. 当前项目使用 Electron、React、TypeScript、Vite、Ant Design、SQLite、better-sqlite3、Drizzle ORM。
3. 本地数据库开发模式默认位于：

```text
data/haige-finance.sqlite
```

## 安装依赖

```bash
pnpm install
```

## 启动开发环境

```bash
pnpm dev
```

开发环境会同时启动：

1. Vite renderer dev server
2. TypeScript main watch
3. Electron 窗口

如果新增或修改了 preload API，需要完全停止 `pnpm dev` 后重新启动。React 页面可以热更新，但 Electron preload 不会热更新。

开发日志中应看到类似输出：

```text
[preload] haige api ready: true, version: 0.8.0
```

## 常用验证命令

单独验证：

```bash
pnpm typecheck
pnpm build
pnpm db:init-test
pnpm crud:smoke-test
pnpm transaction:smoke-test
pnpm project-stats:smoke-test
pnpm report:smoke-test
pnpm backup:smoke-test
pnpm export:smoke-test
```

完整验证：

```bash
pnpm verify
```

`pnpm verify` 会串行执行类型检查、构建、数据库初始化测试和所有 smoke test。

## 数据备份与导出

进入“系统设置”页面可以：

1. 查看数据库文件路径。
2. 查看备份目录。
3. 查看导出目录。
4. 手动备份 SQLite 数据库。
5. 导出 Excel 文件。

当前版本不支持自动恢复数据库。恢复数据库需要关闭连接、替换文件、重启应用，后续会单独设计安全流程。

## 重要架构约定

调用方向必须保持：

```text
React 页面层
↓
renderer/api 前端 API 调用层
↓
preload 安全桥接
↓
Electron IPC 层
↓
Service 业务逻辑层
↓
Repository 数据访问层
↓
SQLite 数据库
```

约束：

1. React 页面不能直接操作 SQLite。
2. 数据库访问必须放在 repository 层。
3. 业务规则、金额计算和统计口径必须放在 service 层。
4. Electron IPC 只负责桥接。
5. shared 目录放共享类型、枚举、zod schema 和工具。
6. 所有金额入库使用整数分，页面和 Excel 展示为元。
7. 财务流水不得物理删除，只能作废或软删除。
8. 作废流水和软删除流水不得参与报表统计。
