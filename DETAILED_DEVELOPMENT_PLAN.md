# 小公司本地账务管理系统详细开发计划

## 1. 计划说明

本文档是对现有 `DEVELOPMENT_PLAN.md` 的补充和优化版本，不直接覆盖原文档，便于对比。

现有计划和需求总体匹配，技术栈、分层架构、核心模块方向都是正确的。需要强化的地方主要有三点：

1. 先把“资金性质”和“项目利润口径”定义清楚，再做流水录入，否则后续报表容易返工。
2. 数据库 schema 阶段应同时设计枚举、zod schema、软删除、作废、审计字段和默认基础数据。
3. MVP 应按业务闭环推进：基础资料 -> 流水 -> 项目统计 -> 报表 -> 备份导出。

## 2. 当前阶段一复核

阶段一目标是完成 Electron + React + TypeScript + SQLite 的基础项目骨架。

当前已完成：

1. Electron 主进程、preload、renderer 基础结构。
2. React + TypeScript + Vite 渲染进程。
3. Ant Design 全局配置和后台型 Layout。
4. 左侧菜单和九个占位页面。
5. `app:ping` IPC 测试链路。
6. Service、Repository、IPC、renderer API 的最小示例链路。
7. SQLite 数据库文件创建、测试表初始化、简单读写测试。
8. better-sqlite3 与 Electron ABI rebuild 脚本。
9. Drizzle ORM 基础 schema 与 drizzle-kit 配置。
10. `@/` 前端路径别名。

阶段一仍建议后续补强：

1. 增加统一错误响应结构，例如 `{ success, data, error }`。
2. 增加主进程日志文件输出。
3. 增加基础空状态、错误状态、加载状态组件。
4. 后续如果主进程也要使用 `@/` 别名，应引入构建器或路径重写方案，否则 Node 运行编译后代码时无法识别该别名。

## 3. 架构约定

系统坚持以下调用方向：

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

约定：

1. 页面组件不得直接访问 IPC，更不得访问数据库。
2. `renderer/api` 只封装前端可调用方法和结果校验。
3. `ipc` 只负责参数校验、调用 service、返回结果。
4. `service` 负责业务规则、金额计算、报表口径。
5. `repository` 只负责数据库读写。
6. `shared` 放类型、枚举、zod schema、金额工具。
7. 所有金额字段使用整数分，例如 `amountCents`。
8. 财务流水禁止物理删除，只允许作废或软删除。
9. 作废流水不得参与任何报表、余额、利润、应收统计。

## 4. 推荐数据口径

### 4.1 资金流水关键字段

每一笔流水至少需要表达：

1. 收入或支出：`direction`
2. 金额：`amountCents`
3. 发生日期：`occurredDate`
4. 所属账户：`accountId`
5. 是否进入公司账户：`isCompanyFund`
6. 资金性质：`fundType`
7. 收支分类：`categoryId`
8. 关联客户：`customerId`
9. 关联项目：`projectId`
10. 关联员工：`employeeId`
11. 是否影响合同应收：`affectsReceivable`
12. 是否影响项目利润：`affectsProjectProfit`
13. 状态：`status`

### 4.2 建议枚举

流水方向：

```text
income
expense
```

流水状态：

```text
normal
voided
deleted
```

资金性质：

```text
customer_payment
project_expense
salary
company_expense
shareholder_investment
shareholder_collection
shareholder_payment
loan_in
loan_out
transfer
other_income
other_expense
```

账户类型：

```text
cash
bank
wechat
alipay
shareholder
other
```

## 5. 阶段二：数据库 Schema 与基础数据

目标：建立 MVP 的数据底座。

必须完成：

1. `customers`
2. `projects`
3. `contracts`
4. `employees`
5. `accounts`
6. `categories`
7. `transactions`
8. `operation_logs`
9. shared 枚举、类型、zod schema
10. seed 默认账户和默认分类

验收标准：

1. `pnpm db:generate` 可以生成迁移。
2. 启动应用可以自动迁移数据库。
3. `pnpm db:init-test` 可以验证核心表存在。
4. 金额字段全部使用整数分。
5. `transactions` 有 `voidedAt`、`deletedAt` 或等价状态字段。

## 6. 阶段三：基础资料 CRUD

目标：先让系统能录入业务对象。

模块顺序：

1. 客户管理
2. 客户项目
3. 合同管理
4. 员工管理
5. 账户管理
6. 收支分类管理

每个模块统一交付：

1. Repository
2. Service
3. IPC
4. renderer API
5. 列表页
6. 新增/编辑表单
7. 软删除或状态停用
8. zod 校验

验收标准：

1. 能新增、编辑、查询、停用或软删除。
2. 页面刷新后数据仍存在。
3. 表单错误提示清晰。
4. React 页面没有直接调用数据库。

## 7. 阶段四：财务流水管理

目标：完成系统核心录账能力。

必须完成：

1. 收入录入。
2. 支出录入。
3. 股东注资、代收、代付、借款等资金性质录入。
4. 关联客户、项目、员工、账户、分类。
5. 流水列表搜索筛选。
6. 流水详情。
7. 流水作废。
8. 禁止物理删除。
9. 账户余额基础计算。
10. 流水创建、编辑、作废、软删除 smoke test。

验收标准：

1. 收入流水增加账户余额，支出流水减少账户余额。
2. 编辑流水后，账户余额按差额重新计算。
3. 作废流水后，账户余额恢复到未发生该笔流水的状态。
4. 软删除流水不得物理删除。
5. 作废和软删除流水不参与后续报表、余额、利润、应收统计。
6. 股东代收不默认计入公司账户余额，除非后续有入账动作。

## 8. 阶段五：合同与项目统计

目标：建立客户项目的合同金额、收款、支出、应收和利润口径。

必须完成：

1. 项目详情页。
2. 项目合同金额合计。
3. 项目已收款、已支出、应收款、当前毛利、预计毛利。
4. 合同已收齐、未收齐、超收状态识别。
5. 统计 service 和测试。

统计公式：

```text
项目合同金额 = 项目下有效合同金额之和
项目已收款 = 项目下 normal 且未软删除且 fundType 为 customer_payment 的收入之和
项目已支出 = 项目下 normal 且未软删除且 affectsProjectProfit 为 true 的支出之和
项目应收款 = 项目合同金额 - 项目已收款
项目当前毛利 = 项目已收款 - 项目已支出
项目预计毛利 = 项目合同金额 - 项目已支出
```

验收标准：

1. 作废流水不参与统计。
2. 软删除流水不参与统计。
3. 已软删除项目不参与默认列表和报表。
4. 统计逻辑集中在 service 层。

## 9. 阶段六：报表与对账

目标：让老板能看懂经营状况。

报表优先级：

1. 首页仪表盘：本月收入、本月支出、账户余额、应收款、项目毛利。
2. 项目利润表。
3. 客户应收表。
4. 月度收支表。
5. 账户余额表。
6. 股东代收代付明细表。
7. 员工工资支出表。

验收标准：

1. 所有报表排除作废流水。
2. 报表金额显示元，存储仍为分。
3. 报表 service 可单独测试。

## 10. 阶段七：备份、导出与系统设置

目标：降低本地软件的数据风险。

必须完成：

1. 手动备份 SQLite 数据库。
2. 恢复前安全提示和二次确认。
3. 导出客户、项目、合同、流水、报表到 Excel。
4. 数据库文件路径展示。
5. 基础系统设置，例如电话是否必填。

验收标准：

1. 备份文件可恢复。
2. Excel 导出金额格式正确。
3. 恢复动作有明确风险提示。

## 11. 阶段八：质量加固

目标：让 MVP 稳定可用。

建议完成：

1. Service 层单元测试。
2. 金额转换测试。
3. 关键报表测试。
4. 数据库迁移测试。
5. IPC 参数校验测试。
6. 打包前检查脚本。

验收标准：

1. 核心财务计算有测试覆盖。
2. 应用重启后数据正常。
3. 打包前 `typecheck`、`build`、`db:init-test` 全部通过。

## 12. MVP 范围建议

第一版建议必须做：

1. 客户、项目、合同、员工、账户、分类基础维护。
2. 财务流水录入和作废。
3. 项目收支、应收、利润统计。
4. 月度收支、账户余额、客户应收报表。
5. Excel 导出。
6. 手动备份。

第一版建议暂缓：

1. 合同附件管理。
2. 复杂权限系统。
3. 多账套。
4. 云同步。
5. 自动 OCR 票据识别。
6. 复杂工资规则。

原因：这些功能会扩大第一版范围，但不影响先把本地账务闭环跑通。
