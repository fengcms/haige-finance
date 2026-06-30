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

## 下一阶段建议

阶段六建议进入“报表与对账”。

推荐完成：

1. 首页仪表盘基础经营数据
2. 项目利润表
3. 客户应收表
4. 月度收支表
5. 账户余额表
6. 报表 service 和 smoke test

所有报表必须排除作废流水和软删除流水。
