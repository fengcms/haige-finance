# 项目收支模块分阶段需求分析与开发计划

本文档用于规划“项目收支”模块。

## 1. 背景

当前项目相关收款、材料费、人工费等都在“财务管理”中录入。财务管理适合从公司总流水角度记账，但项目管理更关心某个项目的经营情况：

1. 合同金额是多少。
2. 客户已经收了多少钱。
3. 项目已经支出了多少钱。
4. 材料费、人工费、其他项目成本分别是多少。
5. 项目当前毛利和预计毛利是多少。

因此建议新增“项目收支”模块，作为项目视角的快捷记账入口。

## 2. 设计原则

1. 第一版不新增数据库表。
2. 项目收支底层仍然写入 `transactions` 财务流水。
3. 项目收支页面不能直接访问 SQLite。
4. 项目收支页面通过 renderer API 调用现有 IPC。
5. 项目收支录入的数据必须进入账户余额、项目统计和报表。
6. 项目收支不得绕开现有财务流水作废、软删除和报表口径。
7. 所有金额继续以整数分存储，页面以元展示。

## 3. 模块定位

```text
财务管理：公司总流水视角
项目收支：项目经营视角
```

项目收支不是一套独立账，而是围绕项目封装的快捷记账页面。

## 4. 第一阶段：项目收支快捷录入

### 阶段目标

让用户可以围绕一个项目录入项目收款和项目支出，而不需要每次手动选择客户、项目、资金性质和统计口径。

### 功能范围

1. 新增“项目收支”菜单。
2. 新增项目选择器。
3. 选择项目后展示项目经营概览：
   - 合同金额
   - 已收款
   - 已支出
   - 应收款
   - 当前毛利
   - 预计毛利
4. 展示当前项目相关流水。
5. 支持快捷录入：
   - 项目收款
   - 材料支出
   - 人工支出
   - 其他项目支出
6. 快捷录入自动带入：
   - 当前客户
   - 当前项目
   - 方向
   - 资金性质
   - 默认分类
   - 是否影响项目应收
   - 是否影响项目利润
7. 录入后刷新项目概览和流水列表。

### 记账口径

项目收款：

```text
direction = income
fundType = customer_payment
categoryId = category_customer_payment
affectsReceivable = true
affectsProjectProfit = false
```

材料支出：

```text
direction = expense
fundType = project_expense
categoryId = category_project_material
affectsReceivable = false
affectsProjectProfit = true
```

人工支出：

```text
direction = expense
fundType = salary
categoryId = category_salary
affectsReceivable = false
affectsProjectProfit = true
employeeId = 可选
```

其他项目支出：

```text
direction = expense
fundType = other_expense
categoryId = category_other_expense
affectsReceivable = false
affectsProjectProfit = true
```

### 验收标准

1. 可以从左侧进入“项目收支”页面。
2. 可以选择一个项目并查看项目经营概览。
3. 可以查看该项目相关流水。
4. 可以快速录入项目收款。
5. 可以快速录入材料支出、人工支出、其他项目支出。
6. 录入后项目统计自动变化。
7. 录入后财务管理中可以看到对应流水。
8. `pnpm verify` 通过。

## 5. 第二阶段：项目费用分类体验优化

### 阶段目标

让项目支出录入更贴近现场习惯，减少重复选择。

### 功能范围

1. 常用项目费用模板。
2. 快捷费用类型：
   - 材料费
   - 运输费
   - 安装费
   - 临时人工
   - 维修返工
   - 其他项目杂费
3. 按费用类型自动带出默认分类、资金性质和统计口径。
4. 项目流水按费用类型筛选。
5. 项目支出小计：
   - 材料合计
   - 人工合计
   - 运输合计
   - 安装合计
   - 维修返工合计
   - 其他支出合计

### 验收标准

1. 项目收支页面提供运输费、安装费、维修返工等快捷录入按钮。
2. 不同费用类型能自动带出默认口径。
3. 页面显示项目收款和各类项目支出小计。
4. 项目流水可以按费用类型筛选。
5. 录入后项目统计口径正确。
6. `pnpm project-finance:smoke-test` 通过。
7. `pnpm verify` 通过。

## 6. 第三阶段：项目成本明细化

### 阶段目标

当项目费用需要更细颗粒度管理时，引入项目费用单或材料采购单。

### 候选功能

1. 新增项目费用单。
2. 一张费用单支持多条明细。
3. 明细字段可包括：
   - 材料名称
   - 规格
   - 数量
   - 单价
   - 金额
   - 供应商
   - 备注
4. 支持费用附件或票据。
5. 费用单确认后生成财务流水。
6. 支持费用单作废，并联动作废财务流水。

### 阶段三 A：项目费用单与成本明细

本阶段先完成不含附件的项目费用单。

#### 功能范围

1. 新增项目费用单表、费用明细表和操作日志表。
2. 项目费用单关联客户、项目、供应商、计划付款账户。
3. 费用单支持费用类型：
   - 材料费
   - 人工费
   - 运输费
   - 安装费
   - 维修返工
   - 其他支出
4. 费用单明细支持名称、规格、数量、单位、单价、金额和备注。
5. 草稿费用单可以新增明细、删除明细、删除草稿。
6. 确认费用单后生成财务流水。
7. 已确认费用单作废时，联动作废对应财务流水。
8. 作废费用单及其关联作废流水不参与项目统计和报表统计。
9. 保留费用单操作日志。

#### 记账口径

材料费：

```text
direction = expense
fundType = project_expense
categoryId = category_project_material
affectsReceivable = false
affectsProjectProfit = true
```

人工费：

```text
direction = expense
fundType = salary
categoryId = category_salary
affectsReceivable = false
affectsProjectProfit = true
```

运输费、安装费、维修返工、其他支出：

```text
direction = expense
fundType = project_expense
categoryId = category_other_expense
affectsReceivable = false
affectsProjectProfit = true
```

#### 验收标准

1. 项目收支页面可以新增费用单。
2. 费用单可以关联供应商。
3. 费用单详情可以新增多条明细并自动汇总合计。
4. 草稿费用单不生成财务流水，不影响项目统计。
5. 确认费用单后自动生成项目支出流水。
6. 确认后项目支出和预计毛利正确变化。
7. 作废费用单后关联流水同步作废，项目统计恢复。
8. `pnpm project-expense:smoke-test` 通过。
9. `pnpm verify` 通过。

### 阶段三 B：费用附件与票据

本阶段暂不实现附件。下一阶段单独规划：

1. 费用单附件表。
2. 上传图片或 PDF。
3. 图片排序。
4. 图片合并生成 PDF。
5. 内置预览或调用系统默认工具打开。
6. 票据附件软删除和本地文件状态检查。

## 7. 当前状态

已完成第一阶段、第二阶段、供应商基础资料，以及第三阶段 A 的项目费用单与成本明细。下一步建议先制定阶段三 B 的附件上传计划，再开发费用单附件。
