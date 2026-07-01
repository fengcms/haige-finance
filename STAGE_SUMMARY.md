# 阶段开发总结

本文档用于记录每个开发阶段完成了什么、改动了哪些关键文件、如何验证，以及留给后续阶段的注意事项。

后续每完成一个阶段，都应继续在本文档中追加对应阶段总结，方便回顾上下文。

---

## 阶段一：项目初始化

### 阶段目标

完成本地桌面账务系统的基础项目骨架，确保 Electron、React、TypeScript、Vite、Ant Design、SQLite、better-sqlite3、Drizzle ORM 的基础链路可运行。

### 已完成内容

1. 初始化 Electron + React + TypeScript + Vite 项目结构。
2. 配置 pnpm 作为包管理器。
3. 配置 Ant Design 和中文 locale。
4. 配置 Electron 主进程、preload、renderer 三端结构。
5. 建立推荐目录结构：
   - `src/main`
   - `src/preload`
   - `src/renderer`
   - `src/shared`
6. 建立分层调用链路：
   - React 页面层
   - renderer API 调用层
   - Electron preload / IPC 层
   - Service 层
   - Repository 层
   - SQLite 数据库
7. 创建基础 Layout：
   - 左侧菜单
   - 顶部标题
   - 内容区域
8. 创建占位页面：
   - 首页仪表盘
   - 客户管理
   - 客户项目
   - 合同管理
   - 员工管理
   - 财务管理
   - 账户管理
   - 报表对账
   - 系统设置
9. 创建 IPC 测试接口：
   - `app:ping`
10. 首页增加“测试 IPC 与数据库”按钮。
11. 配置 SQLite 数据库文件创建。
12. 配置 better-sqlite3 与 Electron ABI rebuild。
13. 配置 Drizzle ORM 基础结构。
14. 配置 `@/` 路径别名，指向 `src/`。
15. 修复 Electron preload ESM 注入问题，改为稳定的 CommonJS preload：
   - `src/preload/index.cjs`
16. 新增 preload 复制脚本：
   - `scripts/copy-preload.cjs`

### 关键文件

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
vite.config.ts
tsconfig.json
tsconfig.main.json
drizzle.config.ts
index.html

src/main/main.ts
src/main/ipc/appIpc.ts
src/main/services/appService.ts
src/main/repositories/appRepository.ts
src/main/db/index.ts
src/main/db/migrate.ts
src/main/db/schema.ts
src/main/db/seed.ts

src/preload/index.cjs

src/renderer/main.tsx
src/renderer/App.tsx
src/renderer/layouts/AppLayout.tsx
src/renderer/api/appApi.ts
src/renderer/pages/DashboardPage.tsx
src/renderer/pages/*.tsx

src/shared/types/app.ts
src/shared/types/global.d.ts
src/shared/schemas/app.ts
src/shared/constants/routes.ts
src/shared/utils/money.ts

scripts/copy-preload.cjs
scripts/db-init-test.mjs
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
pnpm db:init-test
pnpm dev
```

### 验证结果

1. TypeScript 类型检查通过。
2. renderer 和 main 构建通过。
3. SQLite 数据库文件可以创建。
4. `db:init-test` 可以执行简单数据库读写。
5. Electron 窗口可以打开。
6. preload 注入已验证成功，开发日志中应出现：

```text
[preload] haige api ready: true
```

7. 首页按钮可以通过 IPC 调用主进程，并返回 SQLite 状态。

### 注意事项

1. preload 使用 `.cjs` 文件，不走 TypeScript 编译，原因是 Electron preload 在当前 ESM 项目下使用 CommonJS 更稳定。
2. 主进程仍使用相对路径 import。虽然 renderer 可以使用 `@/`，但主进程编译后由 Node/Electron 直接运行，暂不使用 `@/main/...`，避免运行时路径解析问题。
3. `pnpm dev` 会先执行 `pnpm prepare:preload` 和 `pnpm rebuild:electron`，用于保证 preload 文件和 better-sqlite3 ABI 正常。

---

## 阶段二：数据库 Schema 与基础数据

### 阶段目标

完成 MVP 所需的数据底座，包括核心数据库表、共享枚举、共享类型、zod schema、默认账户、默认分类、Drizzle 迁移文件和数据库初始化验证。

本阶段不做完整页面 CRUD，不做财务流水录入页面，不做报表统计页面。

### 已完成内容

1. 新增核心业务表：
   - `customers`
   - `projects`
   - `contracts`
   - `employees`
   - `accounts`
   - `categories`
   - `transactions`
   - `operation_logs`
2. 保留并继续使用 `app_meta` 表。
3. 扩展 Drizzle schema，覆盖 9 张表。
4. 扩展实际启动时执行的 SQL migration。
5. 新增 shared 枚举：
   - 客户状态
   - 项目状态
   - 项目类型
   - 合同状态
   - 员工状态
   - 账户类型
   - 账户状态
   - 分类类型
   - 分类状态
   - 流水方向
   - 流水状态
   - 资金性质
   - 操作日志动作
6. 新增 shared 类型：
   - `Customer`
   - `CustomerProject`
   - `Contract`
   - `Employee`
   - `Account`
   - `Category`
   - `Transaction`
   - `OperationLog`
7. 新增 zod schema：
   - `customerSchema`
   - `projectSchema`
   - `contractSchema`
   - `employeeSchema`
   - `accountSchema`
   - `categorySchema`
   - `transactionSchema`
   - `operationLogSchema`
8. 金额字段采用整数分：
   - `contracts.amount_cents`
   - `accounts.opening_balance_cents`
   - `transactions.amount_cents`
9. 财务流水表预留作废和软删除能力：
   - `transactions.status`
   - `transactions.voided_at`
   - `transactions.void_reason`
   - `transactions.deleted_at`
10. 新增默认账户 5 个：
   - 现金账户
   - 微信账户
   - 支付宝账户
   - 银行卡账户
   - 股东代收账户
11. 新增默认分类 10 个：
   - 客户收款
   - 股东注资
   - 借款收入
   - 其他收入
   - 项目材料
   - 人工工资
   - 公司费用
   - 股东代付
   - 借款支出
   - 其他支出
12. 增强 `pnpm db:init-test`：
   - 验证核心表存在
   - 验证默认账户存在
   - 验证默认分类存在
   - 验证金额字段为 INTEGER
   - 验证流水作废和软删除字段存在
13. 生成 Drizzle 迁移文件。
14. 调整 `.gitignore`，允许提交 `drizzle/` 迁移文件。

### 关键文件

```text
src/main/db/schema.ts
src/main/db/migrations.ts
src/main/db/migrate.ts
src/main/db/seed.ts
src/main/db/seedData.ts

src/shared/constants/enums.ts

src/shared/types/common.ts
src/shared/types/customer.ts
src/shared/types/project.ts
src/shared/types/contract.ts
src/shared/types/employee.ts
src/shared/types/account.ts
src/shared/types/category.ts
src/shared/types/transaction.ts
src/shared/types/operationLog.ts

src/shared/schemas/common.ts
src/shared/schemas/customer.ts
src/shared/schemas/project.ts
src/shared/schemas/contract.ts
src/shared/schemas/employee.ts
src/shared/schemas/account.ts
src/shared/schemas/category.ts
src/shared/schemas/transaction.ts
src/shared/schemas/operationLog.ts

scripts/db-init-test.mjs

drizzle/0000_zippy_professor_monster.sql
drizzle/meta/0000_snapshot.json
drizzle/meta/_journal.json
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
pnpm db:init-test
pnpm db:generate
```

### 验证结果

`pnpm db:init-test` 已验证：

```text
SQLite init test passed: /Users/fungleo/Sites/MeiGeZhuangXiu/haige-finance/data/haige-finance.sqlite
Verified tables: app_meta, customers, projects, contracts, employees, accounts, categories, transactions, operation_logs
Verified default accounts: 5
Verified default categories: 10
```

`pnpm db:generate` 已识别 9 张表：

```text
accounts
app_meta
categories
contracts
customers
employees
operation_logs
projects
transactions
```

### 数据口径说明

1. 所有金额以整数分存储，页面后续展示时再转换为元。
2. `transactions.status = 'voided'` 的流水后续不得参与任何报表统计。
3. 财务流水后续不得物理删除，只能作废或软删除。
4. `fund_type` 用于区分客户收款、项目支出、股东注资、股东代收、股东代付、借款等资金性质。
5. `affects_receivable` 用于判断是否影响项目/合同应收。
6. `affects_project_profit` 用于判断是否影响项目利润。

### 注意事项

1. 当前阶段只完成数据结构和基础 seed，尚未实现 CRUD 页面和 IPC 业务接口。
2. 现阶段 migration 使用手写 SQL 作为应用启动时的真实迁移来源，Drizzle schema 和生成文件用于类型化查询与迁移参考。
3. 如果后续继续修改 schema，需要同步维护：
   - Drizzle schema
   - 手写 migration SQL
   - zod schema
   - shared 类型
   - `db:init-test`

## 阶段三：基础资料 CRUD

### 阶段目标

完成基础资料维护能力，让系统可以录入和维护客户、客户项目、合同、员工、账户和收支分类。

本阶段仍不实现财务流水录入、项目利润统计、报表统计和 Excel 导出。

### 已完成内容

1. 新增统一 IPC 返回结构：
   - `ApiResult<T>`
   - `ListQuery`
   - `ListResult<T>`
2. preload 暴露基础资料 CRUD API：
   - `window.haige.customers`
   - `window.haige.projects`
   - `window.haige.contracts`
   - `window.haige.employees`
   - `window.haige.accounts`
   - `window.haige.categories`
3. 新增 IPC helper，统一捕获错误并返回标准结构。
4. 新增通用基础资料 Repository：
   - 列表查询
   - 关键字搜索
   - 新增
   - 编辑
   - 软删除
   - 关联存在性校验
5. 新增通用基础资料 Service：
   - 使用 zod 校验入参
   - 自动生成 `id`
   - 自动维护 `createdAt` / `updatedAt`
   - 软删除写入 `deletedAt`
   - 项目必须关联有效客户
   - 合同必须关联有效客户和项目
   - 合同所选项目必须属于所选客户
6. 新增基础资料 IPC 注册：
   - `customers:list/create/update/delete`
   - `projects:list/create/update/delete`
   - `contracts:list/create/update/delete`
   - `employees:list/create/update/delete`
   - `accounts:list/create/update/delete`
   - `categories:list/create/update/delete`
7. 新增 renderer API：
   - `customerApi`
   - `projectApi`
   - `contractApi`
   - `employeeApi`
   - `accountApi`
   - `categoryApi`
8. 新增可复用基础资料页面组件：
   - 搜索
   - 刷新
   - 新增
   - 编辑
   - 删除确认
   - Ant Design Table
   - Ant Design Modal Form
9. 客户管理页面已可维护：
   - 客户姓名
   - 联系电话
   - 地址
   - 小区
   - 房号
   - 状态
   - 备注
10. 客户项目页面已可维护：
   - 所属客户
   - 项目名称
   - 小区
   - 施工地址
   - 项目类型
   - 项目状态
   - 备注
11. 合同管理页面已可维护：
   - 所属客户
   - 所属项目
   - 合同名称
   - 合同编号
   - 合同金额
   - 签约日期
   - 合同状态
   - 备注
12. 合同金额页面输入元，保存时转换为整数分。
13. 合同列表显示金额为元。
14. 员工管理页面已可维护：
   - 员工姓名
   - 电话
   - 岗位
   - 入职日期
   - 状态
   - 备注
15. 账户管理页面已可维护：
   - 默认账户展示
   - 新增账户
   - 编辑账户
   - 软删除账户
   - 初始余额页面输入元，保存为整数分
16. 系统设置页面中加入收支分类维护：
   - 默认分类展示
   - 新增分类
   - 编辑分类
   - 软删除分类
   - 配置资金性质
   - 配置是否影响应收
   - 配置是否影响项目利润
17. 新增 CRUD 冒烟测试脚本，验证 6 类基础资料可以创建、编辑和软删除。

### 关键文件

```text
src/shared/types/api.ts
src/shared/types/app.ts

src/main/ipc/helpers.ts
src/main/ipc/masterDataIpc.ts
src/main/main.ts
src/main/repositories/masterDataRepository.ts
src/main/services/masterDataService.ts

src/preload/index.cjs

src/renderer/api/client.ts
src/renderer/api/masterDataApi.ts
src/renderer/components/MasterDataPage.tsx
src/renderer/pages/CustomersPage.tsx
src/renderer/pages/ProjectsPage.tsx
src/renderer/pages/ContractsPage.tsx
src/renderer/pages/EmployeesPage.tsx
src/renderer/pages/AccountsPage.tsx
src/renderer/pages/SettingsPage.tsx
src/renderer/utils/labels.ts
src/renderer/utils/money.ts

scripts/crud-smoke-test.mjs
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
pnpm db:init-test
pnpm crud:smoke-test
```

### 验证结果

1. TypeScript 类型检查通过。
2. renderer 和 main 构建通过。
3. 数据库初始化测试通过。
4. CRUD 冒烟测试通过。
5. 冒烟测试覆盖：
   - 客户创建、编辑、软删除
   - 项目创建、软删除
   - 合同创建、金额分校验、软删除
   - 员工创建、软删除
   - 账户创建、软删除
   - 分类创建、软删除

### 数据口径说明

1. 页面上的金额输入使用元。
2. 入库金额继续使用整数分。
3. 删除操作都是软删除，写入 `deleted_at`。
4. 列表默认只展示 `deleted_at IS NULL` 的数据。
5. 合同必须绑定客户和项目。
6. 合同项目必须属于合同客户。

### 注意事项

1. 本阶段表单使用 Ant Design Form，没有引入额外表单 resolver。
2. 当前列表分页固定取前 100 条，后续数据量变大时再完善分页。
3. 合同页面目前不会根据所选客户动态过滤项目，后端已经做了强校验；后续可以优化前端联动体验。
4. 分类管理暂时放在“系统设置”页面中，未单独增加左侧菜单。
5. CRUD 冒烟测试直接验证 SQLite 数据行为，不通过 Electron UI 自动化。

---

## 阶段四：财务流水管理

### 阶段目标

完成系统核心录账能力，让财务管理页面可以录入、查询、编辑、作废和软删除收支流水。

本阶段仍不实现项目详情统计、完整报表、Excel 导出和备份恢复。

### 已完成内容

1. 调整 `DETAILED_DEVELOPMENT_PLAN.md`：
   - 将“财务流水管理”提前为阶段四。
   - 将“合同与项目统计”后移为阶段五。
   - 明确项目统计依赖真实流水数据。
2. 扩展交易流水 shared 类型：
   - `TransactionListItem`
   - `TransactionListQuery`
   - `AccountBalance`
3. 扩展交易流水 zod schema：
   - `updateTransactionSchema`
   - `transactionListQuerySchema`
   - `voidTransactionSchema`
4. 新增交易流水 Repository：
   - 流水列表查询
   - 关键字搜索
   - 日期筛选
   - 方向、状态、账户、分类、客户、项目、员工、资金性质筛选
   - 新增
   - 编辑
   - 作废
   - 软删除
   - 账户余额计算
5. 新增交易流水 Service：
   - 使用 zod 校验入参
   - 自动生成 `id`
   - 自动维护 `createdAt` / `updatedAt`
   - 校验账户、分类、客户、项目、员工是否存在
   - 校验项目是否属于所选客户
   - 作废原因必填
6. 新增交易流水 IPC：
   - `transactions:list`
   - `transactions:create`
   - `transactions:update`
   - `transactions:void`
   - `transactions:delete`
   - `transactions:account-balances`
7. preload 暴露交易流水 API：
   - `window.haige.transactions`
8. 新增 renderer API：
   - `transactionApi`
9. 财务管理页面从占位页改为真实流水页面：
   - 账户余额概览
   - 流水列表
   - 关键字搜索
   - 方向筛选
   - 状态筛选
   - 日期范围筛选
   - 新增流水
   - 编辑流水
   - 作废流水
   - 软删除流水
10. 流水表单支持关联：
   - 账户
   - 收支分类
   - 客户
   - 项目
   - 员工
11. 选择收支分类时自动带出：
   - 方向
   - 资金性质
   - 是否影响应收
   - 是否影响项目利润
12. 页面金额输入使用元，保存时转换为整数分。
13. 列表金额显示为元。
14. 新增交易流水冒烟测试脚本。
15. 新增 pnpm script：
   - `pnpm transaction:smoke-test`

### 关键文件

```text
DETAILED_DEVELOPMENT_PLAN.md
STAGE_SUMMARY.md
package.json

src/shared/schemas/transaction.ts
src/shared/types/app.ts
src/shared/types/transaction.ts

src/main/ipc/transactionIpc.ts
src/main/main.ts
src/main/repositories/transactionRepository.ts
src/main/services/transactionService.ts

src/preload/index.cjs

src/renderer/api/transactionApi.ts
src/renderer/pages/FinancePage.tsx
src/renderer/utils/labels.ts

scripts/transaction-smoke-test.mjs
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
pnpm db:init-test
pnpm transaction:smoke-test
```

### 验证结果

1. TypeScript 类型检查通过。
2. renderer 和 main 构建通过。
3. 数据库初始化测试通过。
4. 交易流水冒烟测试通过。
5. 冒烟测试覆盖：
   - 收入流水创建
   - 流水金额编辑
   - 支出流水创建
   - 流水作废
   - 流水软删除
   - 作废流水不参与账户余额计算
   - 软删除流水不参与账户余额计算

### 数据口径说明

1. 页面金额输入使用元。
2. 入库金额继续使用整数分。
3. 流水不得物理删除。
4. 作废流水写入：
   - `status = 'voided'`
   - `voided_at`
   - `void_reason`
5. 软删除流水写入：
   - `status = 'deleted'`
   - `deleted_at`
6. 账户余额当前不做冗余存储，按以下规则实时计算：

```text
账户余额 = 期初余额 + normal 且未软删除且进入公司账户的收入 - normal 且未软删除且进入公司账户的支出
```

7. `is_company_fund = false` 的流水不参与账户余额计算。
8. 作废流水和软删除流水不参与账户余额计算。

### 注意事项

1. 当前财务列表分页仍固定取前 100 条，后续需要做完整分页。
2. 当前页面支持基础筛选，尚未做按账户、分类、客户、项目、员工的高级筛选面板。
3. 当前账户余额为实时计算值，没有写回账户表，避免编辑和作废造成余额不一致。
4. 当前 UI 已能录入流水，但尚未做项目详情统计和报表汇总。
5. 交易流水冒烟测试直接验证 SQLite 数据行为，不通过 Electron UI 自动化。

---

## 阶段五：合同与项目统计

### 阶段目标

基于合同和真实财务流水，建立客户项目的合同金额、已收款、已支出、应收款、当前毛利和预计毛利统计。

本阶段仍不实现完整报表、首页经营仪表盘、Excel 导出和备份恢复。

### 已完成内容

1. 新增项目统计 shared 类型：
   - `ProjectStats`
   - `ProjectStatsListItem`
   - `ProjectStatsDetail`
   - `ProjectReceiptStatus`
2. 新增项目统计 Repository：
   - 查询项目基础信息
   - 聚合有效合同金额
   - 聚合有效收款
   - 聚合有效项目支出
   - 查询项目详情所需合同列表
   - 查询项目详情所需相关流水
3. 新增项目统计 Service：
   - 计算项目合同金额
   - 计算项目已收款
   - 计算项目已支出
   - 计算项目应收款
   - 计算当前毛利
   - 计算预计毛利
   - 识别收款状态
4. 新增项目统计 IPC：
   - `project-stats:list`
   - `project-stats:detail`
5. preload 暴露项目统计 API：
   - `window.haige.projectStats`
6. 新增 renderer API：
   - `projectStatsApi`
7. 扩展 `MasterDataPage`：
   - 支持自定义行操作按钮
8. 增强客户项目页面：
   - 项目列表显示合同金额
   - 项目列表显示已收款
   - 项目列表显示已支出
   - 项目列表显示应收款
   - 项目列表显示当前毛利
   - 项目列表显示预计毛利
   - 项目列表显示收款状态
   - 增加项目统计详情弹窗
9. 项目统计详情弹窗包含：
   - 项目基础信息
   - 统计汇总
   - 合同列表
   - 相关流水列表
10. 新增项目统计冒烟测试脚本。
11. 新增 pnpm script：
   - `pnpm project-stats:smoke-test`

### 关键文件

```text
package.json

src/shared/types/app.ts
src/shared/types/projectStats.ts

src/main/ipc/projectStatsIpc.ts
src/main/main.ts
src/main/repositories/projectStatsRepository.ts
src/main/services/projectStatsService.ts

src/preload/index.cjs

src/renderer/api/projectStatsApi.ts
src/renderer/components/MasterDataPage.tsx
src/renderer/pages/ProjectsPage.tsx
src/renderer/utils/labels.ts

scripts/project-stats-smoke-test.mjs
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
```

### 验证结果

1. TypeScript 类型检查通过。
2. renderer 和 main 构建通过。
3. Vite 仍有包体积提示，不影响运行。

### 本轮未完成验证

以下命令已新增，但本轮执行时 Electron / better-sqlite3 类 smoke test 的提升权限被系统用量限制拦截，未能实际跑完：

```bash
pnpm db:init-test
pnpm project-stats:smoke-test
```

建议后续本地手动执行以上两条命令，验证 SQLite 初始化和项目统计数据口径。

### 数据口径说明

1. 有效合同金额：
   - `contracts.deleted_at IS NULL`
   - `contracts.status <> 'voided'`
2. 项目已收款：
   - `transactions.status = 'normal'`
   - `transactions.deleted_at IS NULL`
   - `transactions.direction = 'income'`
   - `transactions.fund_type = 'customer_payment'`
3. 项目已支出：
   - `transactions.status = 'normal'`
   - `transactions.deleted_at IS NULL`
   - `transactions.direction = 'expense'`
   - `transactions.affects_project_profit = 1`
4. 项目应收款：

```text
项目应收款 = 项目合同金额 - 项目已收款
```

5. 当前毛利：

```text
当前毛利 = 项目已收款 - 项目已支出
```

6. 预计毛利：

```text
预计毛利 = 项目合同金额 - 项目已支出
```

7. 作废流水和软删除流水不参与项目统计。

### 注意事项

1. 项目统计列表当前仍跟随项目列表固定取前 100 条，后续需要完善分页。
2. 项目详情弹窗展示相关流水时包含作废流水，但统计汇总不包含作废流水；这是为了方便追溯历史。
3. 项目统计目前集中在客户项目页面，尚未进入报表模块。
4. 合同收款状态目前按项目维度识别，尚未做到单份合同级别的收款分摊。

---

## 阶段六：报表与对账

### 阶段目标

基于基础资料、财务流水和项目统计，完成第一版经营概览与核心报表。

本阶段不做 Excel 导出、备份恢复和图表化展示，优先保证表格报表口径准确。

### 已完成内容

1. 新增报表 shared 类型：
   - `ReportQuery`
   - `DashboardReport`
   - `MonthlyIncomeExpenseItem`
   - `ProjectProfitReportItem`
   - `CustomerReceivableReportItem`
   - `AccountBalanceReportItem`
   - `ReportBundle`
2. 新增报表 Repository：
   - 月度收支聚合
   - 项目利润聚合
   - 客户应收聚合
   - 账户余额聚合
3. 新增报表 Service：
   - 计算月度收入
   - 计算月度支出
   - 计算月度收支差额
   - 计算项目应收
   - 计算项目当前毛利
   - 计算项目预计毛利
   - 计算客户应收
   - 计算账户余额
   - 计算首页仪表盘汇总
4. 新增报表 IPC：
   - `reports:get`
5. preload 暴露报表 API：
   - `window.haige.reports`
6. 新增 renderer API：
   - `reportApi`
7. 首页仪表盘改为真实经营概览：
   - 本月收入
   - 本月支出
   - 本月收支差额
   - 账户总余额
   - 项目应收合计
   - 项目预计毛利合计
   - 本地数据库状态
8. 报表对账页面改为真实报表页：
   - 月份筛选
   - 月度收支表
   - 项目利润表
   - 客户应收表
   - 账户余额表
9. 新增报表冒烟测试脚本。
10. 新增 pnpm script：
   - `pnpm report:smoke-test`

### 关键文件

```text
package.json

src/shared/types/app.ts
src/shared/types/report.ts

src/main/ipc/reportIpc.ts
src/main/main.ts
src/main/repositories/reportRepository.ts
src/main/services/reportService.ts

src/preload/index.cjs

src/renderer/api/reportApi.ts
src/renderer/pages/DashboardPage.tsx
src/renderer/pages/ReportsPage.tsx

scripts/report-smoke-test.mjs
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
pnpm report:smoke-test
```

### 验证结果

1. TypeScript 类型检查通过。
2. renderer 和 main 构建通过。
3. 报表冒烟测试通过。
4. 冒烟测试覆盖：
   - 正常收入进入月度收支表
   - 正常支出进入月度收支表
   - 作废流水不进入报表
   - 软删除流水不进入报表
   - 项目合同金额统计
   - 项目已收款统计
   - 项目已支出统计
   - 账户余额统计

### 数据口径说明

1. 报表流水统计统一排除：
   - `transactions.status <> 'normal'`
   - `transactions.deleted_at IS NOT NULL`
2. 月度收支表和账户余额表只统计：
   - `transactions.is_company_fund = 1`
3. 项目利润表沿用阶段五项目统计口径：
   - 客户收款计入项目已收款
   - 影响项目利润的支出计入项目已支出
4. 所有金额继续以整数分计算，页面显示为元。

### 注意事项

1. 报表页面当前以表格为主，暂未使用 Recharts 图表。
2. 月度收支表当前展示所选月份向前 12 个月。
3. 报表尚未支持 Excel 导出。
4. 首页和报表页新增了 preload API，开发环境需要完全重启 `pnpm dev` 后生效。

---

## 阶段七：备份、导出与系统设置

### 阶段目标

补齐本地账务软件的数据安全和基础交付能力，支持手动备份 SQLite 数据库，并导出基础资料、流水和报表到 Excel。

本阶段不实现自动恢复数据库，避免运行中替换 SQLite 文件造成数据损坏。

### 已完成内容

1. 新增维护 shared 类型：
   - `MaintenanceInfo`
   - `BackupResult`
   - `ExportResult`
2. 新增备份 Service：
   - 查询数据库文件路径
   - 查询备份目录
   - 查询导出目录
   - 手动备份 SQLite 数据库
   - 返回备份文件路径
3. 新增 Excel 导出 Service：
   - 导出客户
   - 导出项目
   - 导出合同
   - 导出财务流水
   - 导出月度收支表
   - 导出项目利润表
   - 导出客户应收表
   - 导出账户余额表
4. 新增维护 IPC：
   - `maintenance:info`
   - `maintenance:backup-database`
   - `maintenance:export-excel`
5. preload 暴露维护 API：
   - `window.haige.maintenance`
6. 新增 renderer API：
   - `maintenanceApi`
7. 系统设置页面新增：
   - 数据库文件路径展示
   - 备份目录展示
   - 导出目录展示
   - 备份数据库按钮
   - 导出 Excel 按钮
   - 数据库恢复风险提示
8. 保留系统设置中的收支分类维护。
9. 新增备份冒烟测试脚本。
10. 新增导出冒烟测试脚本。
11. 新增 pnpm scripts：
   - `pnpm backup:smoke-test`
   - `pnpm export:smoke-test`

### 关键文件

```text
package.json

src/shared/types/app.ts
src/shared/types/maintenance.ts

src/main/backup/backupService.ts
src/main/export/exportService.ts
src/main/ipc/maintenanceIpc.ts
src/main/main.ts

src/preload/index.cjs

src/renderer/api/maintenanceApi.ts
src/renderer/pages/SettingsPage.tsx

scripts/backup-smoke-test.mjs
scripts/export-smoke-test.mjs
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
pnpm backup:smoke-test
pnpm export:smoke-test
```

### 验证结果

1. TypeScript 类型检查通过。
2. renderer 和 main 构建通过。
3. 备份冒烟测试通过。
4. 导出冒烟测试通过。
5. 备份测试已生成 SQLite 备份文件。
6. 导出测试已生成 Excel 文件，并验证关键工作表存在。

### 数据口径说明

1. 备份使用 SQLite backup 能力生成完整数据库备份。
2. Excel 中金额字段统一导出为元。
3. 财务流水导出包含正常、作废等未软删除流水，方便追溯；报表导出仍沿用报表口径排除作废和软删除流水。
4. 备份目录和导出目录位于数据库文件同级目录下：
   - `backups`
   - `exports`

### 注意事项

1. 当前版本不支持自动恢复数据库。
2. 恢复数据库需要关闭连接、替换文件、重启应用，后续应单独设计安全流程和二次确认。
3. 设置页新增了 preload API，开发环境需要完全重启 `pnpm dev` 后生效。

---

## 阶段八：质量加固与打包前检查

### 阶段目标

建立 MVP 的完整验证安全网，补齐开发说明、用户手册和打包前计划，为后续试用和打包做准备。

本阶段不新增业务模块，不直接引入打包工具。

### 已完成内容

1. 新增统一验证命令：
   - `pnpm verify`
2. `pnpm verify` 串行执行：
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm db:init-test`
   - `pnpm crud:smoke-test`
   - `pnpm transaction:smoke-test`
   - `pnpm project-stats:smoke-test`
   - `pnpm report:smoke-test`
   - `pnpm backup:smoke-test`
   - `pnpm export:smoke-test`
3. preload 增加版本号：
   - `window.haige.version = '0.8.0'`
4. Electron preload 自检日志增加版本输出：

```text
[preload] haige api ready: true, version: 0.8.0
```

5. 新增开发运行说明：
   - `DEVELOPMENT_GUIDE.md`
6. 新增用户操作手册草稿：
   - `USER_GUIDE.md`
7. 新增打包前计划：
   - `PACKAGING_PLAN.md`
8. 修复 `report-smoke-test` 重复运行时的测试数据污染问题：
   - 报表测试月份改为每次运行生成隔离月份
9. 保留 `README.md` 作为需求文档，不直接覆盖。

### 关键文件

```text
package.json
DEVELOPMENT_GUIDE.md
USER_GUIDE.md
PACKAGING_PLAN.md
STAGE_SUMMARY.md

src/preload/index.cjs
src/shared/types/app.ts
src/main/main.ts

scripts/report-smoke-test.mjs
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
pnpm report:smoke-test
pnpm verify
```

### 验证结果

1. TypeScript 类型检查通过。
2. renderer 和 main 构建通过。
3. 报表冒烟测试可重复运行。
4. 完整验证 `pnpm verify` 通过。
5. 完整验证覆盖：
   - 数据库初始化
   - 基础资料 CRUD
   - 财务流水
   - 项目统计
   - 报表
   - 数据库备份
   - Excel 导出

### 注意事项

1. Vite 构建仍有包体积提示，不影响当前运行。
2. 新增 preload 版本号后，开发环境仍需在 preload 改动后完全重启 `pnpm dev`。
3. 打包工具尚未引入，后续应先确认应用名称、图标、平台和 better-sqlite3 打包策略。

---

## 阶段九：Electron 打包配置与试用版交付

### 阶段目标

引入 Electron 打包工具，完成本机 macOS 目录包构建，为后续生成可分发安装包做准备。

本阶段不做应用图标、代码签名、自动更新和 Windows 实机验证。

### 已完成内容

1. 引入打包工具：
   - `electron-builder`
2. 修正 pnpm 构建脚本审批配置：
   - `electron-winstaller`
3. 新增 electron-builder 配置：
   - `electron-builder.yml`
4. 新增打包脚本：
   - `pnpm pack:dir`
   - `pnpm pack:mac`
   - `pnpm pack:smoke-test`
   - `pnpm dist:mac`
   - `pnpm dist:win`
5. macOS 目录包配置：
   - `productName: 海哥财务管理`
   - `appId: com.haige.finance`
   - `asar: true`
   - `asarUnpack: **/*.node`
6. 确保原生模块打包：
   - electron-builder 执行了 `better-sqlite3` rebuild
7. 新增 `.gitignore` 忽略：
   - `release/`
8. 更新打包计划文档：
   - `PACKAGING_PLAN.md`
9. 更新开发说明文档：
   - `DEVELOPMENT_GUIDE.md`
10. 修复打包后主进程启动失败：
   - 将 `dist/shared/**` 加入 electron-builder files
   - 避免 `ERR_MODULE_NOT_FOUND: dist/shared/schemas/account.js`
11. 新增打包产物结构检查脚本：
   - `scripts/pack-smoke-test.mjs`
12. 修复打包后 renderer 白屏：
   - Vite 配置增加 `base: './'`
   - 避免 `file://` 加载时 `/assets/...` 资源路径找不到
13. 新增目录包修补脚本：
   - `scripts/patch-packaged-app.mjs`

### 关键文件

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.gitignore
electron-builder.yml
PACKAGING_PLAN.md
DEVELOPMENT_GUIDE.md
STAGE_SUMMARY.md
scripts/pack-smoke-test.mjs
scripts/patch-packaged-app.mjs
vite.config.ts
```

### 已验证命令

```bash
pnpm typecheck
pnpm build
pnpm pack:dir
pnpm pack:smoke-test
pnpm pack:patch-app
```

### 验证结果

1. TypeScript 类型检查通过。
2. renderer 和 main 构建通过。
3. `pnpm pack:dir` 先执行了完整 `pnpm verify`，并通过。
4. electron-builder 成功完成 macOS arm64 目录包构建。
5. 打包过程中成功 rebuild `better-sqlite3`。
6. `pnpm pack:smoke-test` 通过，确认 `app.asar` 包含主进程运行需要的 shared 文件。
7. `pnpm pack:smoke-test` 通过，确认 renderer 入口不再使用绝对 `/assets/...` 路径。
8. `pnpm pack:patch-app` 已修补当前 release 目录中的 app.asar。
9. 产物位置：

```text
release/mac-arm64/海哥财务管理.app
```

### 当前已知限制

1. 当前使用默认 Electron 图标。
2. 当前 macOS 包未签名。
3. 当前只验证了 macOS arm64 目录包。
4. 尚未验证 dmg 安装包。
5. 尚未验证 Windows nsis 安装包。
6. 尚未做自动更新。

---

## 阶段十：合同附件与图片转 PDF

### 阶段目标

为合同管理增加本地附件能力，支持上传图片或 PDF，支持图片排序后生成 PDF，并保持现有分层架构。

本阶段不实现完整内置 PDF 阅读器，不做 OCR，不做云同步。

### 已完成内容

1. 新增合同附件表：
   - `contract_attachments`
2. 附件支持字段：
   - 合同 ID
   - 文件类型：图片 / PDF
   - 来源：上传 / 生成
   - 原始文件名
   - 本地存储文件名
   - 本地存储路径
   - MIME 类型
   - 排序值
   - 软删除时间
3. 新增共享枚举、类型和 zod schema。
4. 新增 repository 层：
   - 合同存在性检查
   - 附件列表
   - 附件创建
   - 附件排序
   - 附件软删除
5. 新增 service 层：
   - 选择并导入图片 / PDF
   - 将附件复制到本地数据目录
   - 根据图片排序生成 PDF
   - 调用系统默认工具打开附件
6. 新增 IPC 层：
   - `contract-attachments:list`
   - `contract-attachments:import-files`
   - `contract-attachments:reorder`
   - `contract-attachments:delete`
   - `contract-attachments:open-file`
   - `contract-attachments:generate-pdf`
7. 扩展 preload 安全桥接：
   - `window.haige.contractAttachments`
8. preload 版本提升：
   - `window.haige.version = '0.10.0'`
9. 新增 renderer API：
   - `src/renderer/api/contractAttachmentApi.ts`
10. 合同管理页面新增“附件”入口和侧边抽屉。
11. 附件抽屉支持：
   - 上传图片/PDF
   - 图片生成 PDF
   - 刷新列表
   - 上移 / 下移排序
   - 系统打开文件
   - 软删除附件
12. 图片转 PDF 使用 Electron 隐藏窗口渲染 HTML 后 `printToPDF` 生成 A4 PDF。
13. 新增合同附件 smoke test。
14. `pnpm verify` 已纳入合同附件 smoke test。
15. `db:init-test` 已覆盖合同附件表结构检查。

### 关键文件

```text
package.json
STAGE_SUMMARY.md
DEVELOPMENT_GUIDE.md
USER_GUIDE.md

src/main/db/migrations.ts
src/main/db/schema.ts
src/main/repositories/contractAttachmentRepository.ts
src/main/services/contractAttachmentService.ts
src/main/ipc/contractAttachmentIpc.ts
src/main/main.ts

src/preload/index.cjs

src/renderer/api/contractAttachmentApi.ts
src/renderer/pages/ContractsPage.tsx

src/shared/constants/enums.ts
src/shared/types/app.ts
src/shared/types/contractAttachment.ts
src/shared/schemas/contractAttachment.ts

scripts/db-init-test.mjs
scripts/contract-attachment-smoke-test.mjs
```

### 验证方式

```bash
pnpm typecheck
pnpm build
pnpm db:init-test
pnpm contract-attachment:smoke-test
pnpm verify
```

### 使用验证

1. 启动应用：

```bash
pnpm dev
```

2. 进入“合同管理”。
3. 确保至少有一个合同。
4. 点击合同行的“附件”。
5. 点击“上传图片/PDF”，选择图片或 PDF。
6. 上传多张图片后，使用“上移 / 下移”调整顺序。
7. 点击“图片生成 PDF”。
8. 点击 PDF 附件的“打开”，应调用系统默认 PDF 工具打开。

### 当前已知限制

1. 当前 PDF 预览使用系统默认工具打开，尚未内置 PDF 阅读器。（阶段十一已补充内置预览）
2. 图片转 PDF 默认按 A4 纸张居中等比缩放，不做裁剪和扫描增强。
3. 附件删除为软删除，当前不会立即物理删除本地文件。
4. smoke test 覆盖数据库结构、排序和软删除，不覆盖系统文件选择框和隐藏窗口 PDF 渲染。

---

## 阶段十一：合同附件体验增强与文件安全完善

### 阶段目标

在阶段十的合同附件基础上，增强日常使用体验和本地文件安全提示。

本阶段不引入新的拖拽库，不做 OCR，不做自动清理物理文件。

### 已完成内容

1. 附件列表增加图片缩略图。
2. PDF 附件显示 PDF 图标。
3. 附件列表增加文件大小。
4. 附件列表增加创建时间。
5. 附件列表增加本地文件存在性检查。
6. 本地文件丢失时：
   - 显示“本地文件丢失”
   - 禁用预览
   - 禁用打开
7. 新增附件预览接口：
   - `contract-attachments:preview`
8. 图片附件支持系统内预览。
9. PDF 附件支持系统内预览。
10. 新增附件重命名接口：
   - `contract-attachments:rename`
11. 重命名只修改数据库中的显示名称 `original_name`，不修改物理文件名和路径。
12. preload 版本提升：
   - `window.haige.version = '0.11.0'`
13. “下移”按钮在最后一条附件时禁用。
14. smoke test 增加附件重命名检查。
15. 更新用户操作手册。

### 关键文件

```text
USER_GUIDE.md
STAGE_SUMMARY.md

src/main/repositories/contractAttachmentRepository.ts
src/main/services/contractAttachmentService.ts
src/main/ipc/contractAttachmentIpc.ts

src/preload/index.cjs

src/renderer/api/contractAttachmentApi.ts
src/renderer/pages/ContractsPage.tsx

src/shared/types/app.ts
src/shared/types/contractAttachment.ts
src/shared/schemas/contractAttachment.ts

scripts/contract-attachment-smoke-test.mjs
```

### 验证方式

```bash
pnpm typecheck
pnpm build
pnpm contract-attachment:smoke-test
pnpm verify
```

### 手动验证建议

1. 启动应用：

```bash
pnpm dev
```

2. 进入“合同管理”。
3. 点击合同“附件”。
4. 上传图片，确认列表出现缩略图。
5. 上传 PDF，确认列表出现 PDF 图标。
6. 点击“预览”，确认图片和 PDF 可在系统内弹窗展示。
7. 点击“打开”，确认可调用系统默认工具。
8. 点击“重命名”，确认列表显示名称更新。
9. 手动移动或删除某个附件文件后刷新列表，确认显示“本地文件丢失”。

### 当前已知限制

1. 图片缩略图使用预览接口读取原图 data URL，附件很多或图片很大时后续可优化为独立缩略图缓存。
2. PDF 预览使用 Chromium 对 data URL PDF 的内置支持，如特定系统环境异常，仍可使用“打开”调用系统工具。
3. 附件排序仍使用上移 / 下移，暂未引入拖拽排序。
4. 附件软删除后物理文件仍保留，清理策略留到后续阶段。

---

## 阶段十二：系统设置分栏与基础字典管理

### 阶段目标

将系统设置拆成更清晰的子栏目，并对不直接影响报表口径的基础状态/类型提供字典管理。

本阶段不开放资金性质、流水方向、流水状态等报表相关字段的字典化，不允许修改底层业务编码。

### 已完成内容

1. 系统设置页面改为 Tabs：
   - 数据备份
   - 收支分类
   - 字典设置
   - 系统信息
2. 新增字典表：
   - `dictionary_items`
3. 新增默认字典数据：
   - 客户状态
   - 项目状态
   - 项目类型
   - 合同状态
   - 员工状态
   - 账户类型
   - 账户状态
4. 字典项支持字段：
   - 字典类型
   - 稳定编码
   - 显示名称
   - 排序
   - 状态
   - 是否系统项
   - 备注
5. 字典管理支持：
   - 修改显示名称
   - 修改排序
   - 启用 / 停用
6. 字典管理不支持：
   - 新增编码
   - 删除编码
   - 修改编码
7. 默认字典 seed 不覆盖用户已修改的显示名称和启停状态。
8. 新增字典 repository / service / IPC / preload / renderer API。
9. preload 版本提升：
   - `window.haige.version = '0.12.0'`
10. 以下页面的显示和下拉选项优先使用字典：
   - 客户管理
   - 客户项目
   - 合同管理
   - 员工管理
   - 账户管理
11. 保留原有 `labels.ts` 作为兜底，避免字典接口异常时页面无显示。
12. 新增字典 smoke test。
13. `pnpm verify` 已纳入字典 smoke test。
14. `db:init-test` 已覆盖字典表和默认字典数据。

### 关键文件

```text
package.json
DEVELOPMENT_GUIDE.md
USER_GUIDE.md
STAGE_SUMMARY.md

src/shared/constants/dictionaries.ts
src/shared/types/dictionary.ts
src/shared/schemas/dictionary.ts
src/shared/types/app.ts

src/main/db/migrations.ts
src/main/db/schema.ts
src/main/db/seedData.ts
src/main/repositories/dictionaryRepository.ts
src/main/services/dictionaryService.ts
src/main/ipc/dictionaryIpc.ts
src/main/main.ts

src/preload/index.cjs

src/renderer/api/dictionaryApi.ts
src/renderer/hooks/useDictionaries.ts
src/renderer/pages/SettingsPage.tsx
src/renderer/pages/CustomersPage.tsx
src/renderer/pages/ProjectsPage.tsx
src/renderer/pages/ContractsPage.tsx
src/renderer/pages/EmployeesPage.tsx
src/renderer/pages/AccountsPage.tsx

scripts/db-init-test.mjs
scripts/dictionary-smoke-test.mjs
```

### 验证方式

```bash
pnpm typecheck
pnpm build
pnpm db:init-test
pnpm dictionary:smoke-test
pnpm verify
```

### 手动验证建议

1. 启动应用：

```bash
pnpm dev
```

2. 进入“系统设置”。
3. 确认页面存在“数据备份 / 收支分类 / 字典设置 / 系统信息”栏目。
4. 进入“字典设置”，选择“客户状态”。
5. 修改“潜在客户”的显示名称和排序。
6. 进入“客户管理”，确认客户状态显示和下拉选项使用新名称。
7. 将某个字典项停用，确认新增/编辑下拉中不再显示该项。
8. 确认已有历史数据仍可显示。

### 当前已知限制

1. 当前只允许编辑字典显示信息，不允许新增或修改编码。
2. 资金性质、流水方向、流水状态、分类类型等报表相关字段仍保持系统枚举。
3. 字典修改后，已打开的其他页面可能需要刷新或重新进入页面才能拿到最新下拉选项。
4. 停用字典项只影响后续选择，不会自动修改历史数据。

---

## 阶段十三：界面布局与财务录入体验优化

### 阶段目标

优化主界面布局和财务流水录入体验，不修改财务数据结构、报表口径和业务规则。

### 已完成内容

1. 左侧侧边栏固定在窗口左侧。
2. 应用整体改为 `100vh` 高度，右侧内容区独立滚动。
3. 左侧品牌区新增 LOGO 图片。
4. 品牌区和菜单区之间新增分割线。
5. 侧边栏支持收起 / 展开。
6. Header 左侧新增收起 / 展开按钮。
7. 侧边栏收起时只显示 LOGO 和菜单图标。
8. 新增占位 LOGO 文件：
   - `public/logo.svg`
9. 财务“新增/编辑流水”弹窗宽度调整为 900。
10. 财务流水表单改为两列紧凑布局。
11. 发生日期新增时默认当天。
12. 发生日期设置为不可清空，避免误删必填日期。
13. 开关项合并为一行展示。
14. 备注区域压缩为两行。

### 关键文件

```text
STAGE_SUMMARY.md
public/logo.svg
src/renderer/layouts/AppLayout.tsx
src/renderer/pages/FinancePage.tsx
src/renderer/styles/global.css
```

### 验证方式

```bash
pnpm typecheck
pnpm build
pnpm verify
```

### 手动验证建议

1. 启动应用：

```bash
pnpm dev
```

2. 滚动右侧页面，确认左侧菜单不随内容滚动。
3. 点击 Header 左侧按钮，确认侧边栏可收起和展开。
4. 收起侧边栏后，确认只显示 LOGO 和菜单图标。
5. 进入“财务管理”，点击“新增流水”。
6. 确认发生日期默认为当天。
7. 确认主要录入字段可在弹窗内紧凑显示。
8. 新增一条流水，确认保存正常。
9. 编辑已有流水，确认弹窗布局和保存正常。

### 当前已知限制

1. 当前 LOGO 为占位 SVG，后续可替换为正式品牌图片。
2. 财务弹窗在特别矮的屏幕上仍可能需要弹窗内部滚动，但常规桌面窗口下应明显少滚动。

---

## 下一阶段建议

### 补充修复：编辑面板回填问题

发现问题：

1. 客户、项目、合同、员工、账户、收支分类等通用编辑弹窗打开后，原有数据没有回填。
2. 财务流水编辑弹窗也存在同类风险。

原因：

1. 通用 `MasterDataPage` 和财务流水弹窗使用了 `destroyOnHidden`。
2. 原逻辑在弹窗内容实际挂载前调用 `form.setFieldsValue`。
3. 表单字段尚未注册完成，导致回填值丢失。

已修复：

1. `MasterDataPage` 改为在弹窗打开后的 `useEffect` 中执行回填。
2. 新增模式在弹窗打开后重置表单。
3. 编辑模式在弹窗打开后写入当前记录。
4. 财务流水新增 / 编辑弹窗同步采用打开后回填逻辑。
5. 财务流水新增仍默认当天日期。

关键文件：

```text
src/renderer/components/MasterDataPage.tsx
src/renderer/pages/FinancePage.tsx
STAGE_SUMMARY.md
```

验证方式：

```bash
pnpm typecheck
pnpm build
pnpm verify
```

手动验证建议：

1. 进入客户管理，编辑任意客户，确认弹窗回填原数据。
2. 进入项目、合同、员工、账户、系统设置中的收支分类，分别编辑任意记录，确认回填正常。
3. 进入财务管理，编辑任意流水，确认日期、金额、账户、分类等字段回填正常。
4. 点击新增，确认不会残留上一条编辑数据。

下一步建议进入“附件文件清理策略”或“安装包与发布体验完善”。

合同附件后续增强可完成：

1. 拖拽排序。
2. 独立缩略图缓存。
3. 附件批量上传进度。
4. 物理文件清理策略。

安装包与发布体验完善可完成：

1. 准备应用图标。
2. 配置 macOS dmg。
3. 验证打包 app 首次启动数据库创建。
4. 验证打包 app 中备份和 Excel 导出。
5. 评估 macOS 签名和 notarization。
6. 在 Windows 环境验证 nsis 安装包。
