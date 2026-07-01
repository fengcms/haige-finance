# 打包前计划

本文档记录 Electron 打包前需要确认的事项和当前打包配置状态。

## 1. 打包目标

第一版优先支持：

1. macOS 本机试用包
2. Windows 安装包

后续再考虑自动更新和签名。

## 2. 需要确认的信息

打包前需要确认：

1. 应用正式名称
2. 应用图标
3. macOS bundle id
4. Windows 应用名称
5. 是否需要代码签名
6. 是否需要自动更新
7. 是否只本地使用，还是分发给多台电脑

## 3. 数据库路径

开发模式数据库路径：

```text
data/haige-finance.sqlite
```

打包后数据库路径：

```text
app.getPath('userData')/haige-finance.sqlite
```

打包测试必须确认：

1. 首次启动能创建数据库。
2. 应用升级不会覆盖用户数据库。
3. 备份目录和导出目录在数据库同级目录下创建。
4. 备份和 Excel 导出在打包后仍可写入。

## 4. better-sqlite3 原生依赖

`better-sqlite3` 是原生依赖，打包时需要重点验证：

1. Electron ABI 是否匹配。
2. 打包后 native module 是否被正确包含。
3. macOS 和 Windows 是否分别 rebuild。
4. `pnpm rebuild:electron` 是否需要纳入打包流程。

## 5. 已选打包工具

当前已选择：

```text
electron-builder
```

原因：

1. 对 Electron 桌面应用支持成熟。
2. 支持 macOS 和 Windows 常见打包目标。
3. 可处理原生依赖 rebuild。
4. 适合当前 `better-sqlite3` 场景。

## 6. 当前打包脚本

```bash
pnpm pack:dir
pnpm pack:mac
pnpm dist:mac
pnpm dist:win
```

当前已验证：

```bash
pnpm pack:dir
pnpm pack:smoke-test
```

产物位置：

```text
release/mac-arm64/海哥财务管理.app
```

`pack:smoke-test` 会检查打包后的 `app.asar` 中是否包含主进程运行必需文件，例如：

```text
dist/shared/schemas/account.js
dist/shared/constants/enums.js
```

这些 shared 运行时代码必须进入包内，否则主进程会在启动时报 `ERR_MODULE_NOT_FOUND`。

`pack:smoke-test` 也会检查 renderer 入口文件不能使用绝对 `/assets/...` 路径。打包后的页面通过 `file://` 加载，Vite 必须设置：

```ts
base: './'
```

否则会出现白屏，并在控制台看到 `net::ERR_FILE_NOT_FOUND`。

## 7. 打包前检查命令

打包前必须先通过：

```bash
pnpm verify
```

如果 `pnpm verify` 未通过，不进入打包流程。

当前 `pack:*` 和 `dist:*` 脚本都会先执行 `pnpm verify`。

## 8. 当前已知限制

1. 目前使用默认 Electron 图标。
2. 当前 macOS 包未签名。
3. 尚未验证 dmg 安装包。
4. 尚未验证 Windows nsis 安装包。
5. 尚未做自动更新。

## 9. 暂缓事项

以下能力建议暂缓：

1. 自动更新
2. 数据库自动恢复
3. 云同步
4. 多账套迁移
5. 代码签名自动化

这些能力会扩大交付范围，建议在 MVP 稳定后再单独规划。
