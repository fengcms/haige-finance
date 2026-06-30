# 打包前计划

本文档记录 Electron 打包前需要确认的事项。当前阶段先做评估，不直接引入打包工具。

## 1. 打包目标

第一版建议优先支持：

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

## 5. 候选打包工具

后续可以评估：

1. `electron-builder`
2. `electron-forge`

当前项目没有引入打包工具，避免阶段八范围扩大。

## 6. 打包前检查命令

打包前必须先通过：

```bash
pnpm verify
```

如果 `pnpm verify` 未通过，不进入打包流程。

## 7. 暂缓事项

以下能力建议暂缓：

1. 自动更新
2. 数据库自动恢复
3. 云同步
4. 多账套迁移
5. 代码签名自动化

这些能力会扩大交付范围，建议在 MVP 稳定后再单独规划。
