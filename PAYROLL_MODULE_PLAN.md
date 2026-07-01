# 工资管理模块分阶段需求分析与开发计划

## 1. 文档目的

本文档用于规划“小公司本地账务管理系统”的工资管理模块。

工资发放不建议只作为普通财务支出处理。普通支出只能表达“钱出去了”，但无法清楚管理：

1. 每个员工应发多少。
2. 每个员工实发多少。
3. 哪些工资已经发放。
4. 哪些工资还未发放。
5. 哪些工资属于项目人工成本。
6. 哪些工资属于公司日常人工费用。
7. 工资发放后对应哪些财务流水。
8. 工资是否可以作废、撤销或追溯。

因此，建议新增独立的“工资管理”模块，并让它和现有财务流水、项目利润、账户余额打通。

## 2. 总体设计原则

工资模块必须继续遵守当前系统架构：

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

设计原则：

1. React 页面不直接操作 SQLite。
2. 数据库访问放在 repository 层。
3. 工资计算、状态流转、发放规则放在 service 层。
4. 工资金额全部使用整数分。
5. 已发放工资不能物理删除。
6. 作废工资不得参与工资统计。
7. 工资发放最终必须生成财务流水，不能绕开现有账户和报表体系。
8. 第一版不做复杂税务、社保、公积金自动计算。
9. 第一版不做多用户审批流。
10. 第一版不修改现有报表口径，先通过生成财务流水自然进入现有报表。

## 3. 业务对象分析

### 3.1 工资批次

工资通常按月管理，一个月可以有一张工资批次。

示例：

```text
2026年7月工资
```

工资批次负责表达：

1. 工资月份。
2. 发放日期。
3. 发放账户。
4. 批次状态。
5. 应发合计。
6. 扣款合计。
7. 实发合计。
8. 关联的财务流水。

### 3.2 工资明细

工资明细是批次下的员工工资行。

每个员工一行，记录：

1. 员工。
2. 可选关联项目。
3. 基本工资。
4. 奖金。
5. 补贴。
6. 扣款。
7. 应发工资。
8. 实发工资。
9. 备注。

后续可以扩展：

1. 社保个人部分。
2. 公积金个人部分。
3. 个税。
4. 加班费。
5. 请假扣款。
6. 工资条。

## 4. 推荐状态流转

工资批次状态建议：

```text
draft       草稿
confirmed   已确认
paid        已发放
voided      已作废
```

规则：

1. 草稿可以编辑。
2. 草稿可以删除或软删除。
3. 已确认后金额不建议随意编辑。
4. 已确认可以发放。
5. 已发放后不能编辑工资金额。
6. 已发放后必须能追踪生成的财务流水。
7. 已作废工资不参与工资统计。
8. 如果已发放工资要作废，必须同步处理已生成流水，第一版建议先限制复杂作废。

## 5. 工资和财务流水的关系

工资模块不应替代财务流水，而是生成财务流水。

推荐第一版发放规则：

1. 按项目汇总生成流水。
2. 有项目的工资，每个项目生成一条工资支出流水。
3. 无项目的工资，汇总生成一条公司工资支出流水。
4. 生成流水后，工资批次状态变为 `paid`。

示例：

```text
2026-07 工资 - 项目A：12000
2026-07 工资 - 项目B：8000
2026-07 工资 - 公司工资：10000
```

生成流水字段建议：

```text
direction = expense
fundType = salary
category = 人工工资
accountId = 工资发放账户
projectId = 有项目则填
employeeId = 空
affectsReceivable = false
affectsProjectProfit = 有项目则 true，否则 false
status = normal
```

这样现有报表可以自然统计：

1. 账户余额减少。
2. 月度支出增加。
3. 项目利润扣除项目人工工资。
4. 公司工资进入公司费用口径。

## 6. 第一版建议数据表

### 6.1 payroll_batches

工资批次表。

```text
id
month
name
pay_date
account_id
status
total_gross_cents
total_deduction_cents
total_net_cents
remark
created_at
updated_at
deleted_at
```

说明：

1. `month` 格式为 `YYYY-MM`。
2. `pay_date` 格式为 `YYYY-MM-DD`。
3. `account_id` 是发放工资的账户。
4. 合计字段由 service 根据明细计算，不建议页面直接决定。

### 6.2 payroll_items

工资明细表。

```text
id
batch_id
employee_id
project_id
base_salary_cents
bonus_cents
allowance_cents
deduction_cents
gross_salary_cents
net_salary_cents
remark
created_at
updated_at
deleted_at
```

计算规则：

```text
gross_salary_cents = base_salary_cents + bonus_cents + allowance_cents
net_salary_cents = gross_salary_cents - deduction_cents
```

### 6.3 payroll_batch_transactions

工资批次和财务流水关联表。

```text
id
batch_id
transaction_id
created_at
```

说明：

1. 一个工资批次可能生成多条财务流水。
2. 使用关联表比在批次表放单个 `transaction_id` 更稳。

## 7. 分阶段开发计划

## 阶段十六：工资管理基础版

### 阶段目标

完成工资批次、工资明细、工资确认、工资发放和财务流水生成的最小闭环。

### 功能范围

1. 新增“工资管理”菜单。
2. 新增工资批次列表。
3. 支持按月份筛选工资批次。
4. 支持新增工资批次。
5. 支持编辑草稿工资批次。
6. 支持软删除草稿工资批次。
7. 支持查看工资批次详情。
8. 支持在工资批次下新增员工工资明细。
9. 支持编辑草稿状态下的工资明细。
10. 自动计算应发工资和实发工资。
11. 自动汇总批次合计。
12. 支持确认工资。
13. 支持取消确认。
14. 支持发放工资。
15. 发放工资时按项目汇总生成财务流水。
16. 发放成功后批次状态变为已发放。
17. 已发放工资不能继续编辑金额。
18. 可以查看工资批次关联的财务流水。

### 暂不实现

1. 个税自动计算。
2. 社保、公积金自动计算。
3. 工资条导出。
4. 银行代发文件。
5. 多次部分发放。
6. 发放后复杂撤销。
7. 审批流。
8. 考勤管理。

### 开发任务

1. shared 枚举：
   - `payrollBatchStatusOptions`
2. shared 类型：
   - `PayrollBatch`
   - `PayrollItem`
   - `PayrollBatchTransaction`
   - `PayrollBatchListItem`
   - `PayrollBatchDetail`
3. shared zod schema：
   - 创建工资批次
   - 更新工资批次
   - 创建工资明细
   - 更新工资明细
   - 确认工资
   - 发放工资
4. 数据库迁移：
   - `payroll_batches`
   - `payroll_items`
   - `payroll_batch_transactions`
5. Drizzle schema 增加工资表。
6. Repository：
   - 工资批次 CRUD
   - 工资明细 CRUD
   - 批次汇总
   - 关联流水记录
7. Service：
   - 计算应发/实发
   - 汇总批次金额
   - 状态流转校验
   - 发放工资生成财务流水
8. IPC：
   - `payroll:list-batches`
   - `payroll:create-batch`
   - `payroll:update-batch`
   - `payroll:delete-batch`
   - `payroll:get-detail`
   - `payroll:create-item`
   - `payroll:update-item`
   - `payroll:delete-item`
   - `payroll:confirm`
   - `payroll:cancel-confirm`
   - `payroll:pay`
9. preload 暴露工资 API。
10. renderer API：
    - `payrollApi`
11. 页面：
    - `PayrollPage`
    - 批次列表
    - 批次详情 Drawer
    - 明细录入弹窗
    - 发放确认弹窗
12. 菜单：
    - 新增“工资管理”
13. 测试：
    - `payroll:smoke-test`
14. 文档：
    - 更新 `USER_GUIDE.md`
    - 更新 `DEVELOPMENT_GUIDE.md`
    - 更新 `STAGE_SUMMARY.md`

### 验收标准

1. 可以创建工资批次。
2. 可以给员工录工资明细。
3. 应发、实发、批次合计自动计算正确。
4. 草稿工资可以编辑。
5. 已确认工资不能随意删除。
6. 已发放工资不能编辑金额。
7. 发放工资会生成财务流水。
8. 有项目的工资进入项目利润。
9. 无项目的工资进入公司工资支出。
10. `pnpm payroll:smoke-test` 通过。
11. `pnpm verify` 通过。

## 阶段十七：工资报表与项目人工成本增强

### 阶段目标

让工资模块提供独立统计，并增强项目人工成本展示。

### 功能范围

1. 月度工资汇总表。
2. 员工工资明细表。
3. 项目人工成本表。
4. 未发工资统计。
5. 已发工资统计。
6. 工资批次状态统计。
7. 首页仪表盘增加本月工资支出。
8. 项目统计详情增加工资人工成本来源。
9. Excel 导出增加工资相关 sheet。

### 开发任务

1. ReportRepository 增加工资统计查询。
2. ReportService 增加工资金报表。
3. shared report 类型扩展。
4. ReportsPage 增加工资金报表展示。
5. DashboardPage 增加工资金指标。
6. ExportService 增加工资金 sheet。
7. payroll report smoke test。

### 验收标准

1. 月度工资汇总正确。
2. 员工工资明细正确。
3. 项目人工成本和工资明细能对上。
4. 未发工资不进入财务报表。
5. 已发工资通过财务流水进入现有报表。
6. Excel 导出包含工资 sheet。

## 阶段十八：工资高级功能

### 阶段目标

提升长期使用效率和工资管理完整度。

### 候选功能

1. 员工默认工资配置。
2. 一键生成当月工资单。
3. 复制上月工资。
4. 工资条导出。
5. 社保个人部分字段。
6. 公积金个人部分字段。
7. 个税字段。
8. 加班费字段。
9. 请假扣款字段。
10. 工资附件。
11. 工资发放撤销。
12. 工资批次作废联动作废流水。
13. 按员工、项目、月份筛选统计。

### 建议新增表

```text
employee_salary_profiles
payroll_attachments
```

### 验收标准

1. 可以根据员工默认工资生成当月工资。
2. 可以复制上月工资并调整。
3. 可以导出工资条。
4. 工资高级字段不破坏基础工资发放闭环。

## 8. 风险与边界

### 8.1 税务风险

工资薪金可能涉及个人所得税、社保、公积金等政策。

第一版不自动计算税费，避免错误政策口径导致使用风险。

### 8.2 财务口径风险

工资明细本身不直接进入财务报表。

只有“发放工资”后生成的财务流水，才进入账户余额、月度支出和项目利润。

### 8.3 作废风险

工资发放后已经生成财务流水。

第一版建议：

1. 已发放工资不允许直接删除。
2. 已发放工资如需作废，先人工处理关联流水。
3. 后续阶段再做联动作废。

### 8.4 数据复杂度风险

不要第一版就做完整人事薪酬系统。

当前系统定位是小公司本地账务管理，因此第一版工资模块只做“工资核算 + 发放入账 + 项目成本归集”。

## 9. 推荐实施顺序

建议下一步从“阶段十六：工资管理基础版”开始。

阶段十六推荐再拆成两个开发批次：

### 9.1 阶段十六 A：工资数据底座

1. 数据库表。
2. shared 类型和 schema。
3. repository。
4. service 基础计算。
5. IPC 和 preload。
6. smoke test 覆盖批次和明细计算。

### 9.2 阶段十六 B：工资页面与发放

1. 工资管理页面。
2. 批次详情。
3. 明细录入。
4. 确认工资。
5. 发放工资生成流水。
6. smoke test 覆盖发放后流水、账户和项目利润。

## 10. 等待确认的问题

在正式开发阶段十六前，需要确认以下问题：

1. 第一版工资发放是否采用“按项目汇总生成流水”的方案？
2. 工资明细第一版是否只保留：基本工资、奖金、补贴、扣款？
3. 是否需要保留社保、公积金、个税字段，但暂不自动计算？
4. 工资批次是否允许同一个月份创建多个批次？
5. 已发放工资第一版是否禁止作废，只允许查看？
6. 菜单名称使用“工资管理”还是“薪资管理”？
