# 项目费用单图片附件开发计划

本文档规划“项目费用单附件”的轻量版实现。

本阶段不做复杂票据系统，不做 PDF 上传，不做图片转 PDF，不做拖拽排序。核心目标是让用户能把截图快速粘贴到费用单里，并能预览。

## 1. 需求目标

项目费用单常见附件是截图、票据照片、付款凭证、材料清单截图。

实际使用中，用户经常通过系统截图、微信截图、QQ 截图等方式得到剪贴板图片。如果每次都先保存到桌面再选择文件，会非常麻烦。

因此本阶段优先支持：

1. 在软件里直接粘贴剪贴板图片。
2. 点击按钮选择本地图片上传。
3. 上传后在费用单详情里看到图片列表。
4. 点击图片可以预览。
5. 可以删除已上传图片。

## 2. 功能范围

### 2.1 通用图片上传组件

先开发一个可复用组件，例如：

```text
ImagePasteUpload
```

组件能力：

1. 显示一个粘贴区域。
2. 支持 `Ctrl + V` / `Command + V` 粘贴剪贴板图片。
3. 支持点击按钮选择本地图片。
4. 支持展示上传中的状态。
5. 支持展示错误提示。
6. 支持上传成功后通知父组件刷新。

组件不直接操作 SQLite，不直接写文件。

组件只负责：

```text
用户交互
↓
读取剪贴板图片或选择图片
↓
调用 renderer API
```

### 2.2 项目费用单附件

项目费用单详情中新增“附件图片”区域。

功能：

1. 粘贴上传图片。
2. 点击选择图片上传。
3. 展示附件图片列表。
4. 展示缩略图。
5. 点击预览大图。
6. 删除附件，使用软删除。
7. 如果本地文件丢失，显示“本地文件丢失”。

### 2.3 支持的文件类型

第一版只支持图片：

```text
jpg
jpeg
png
webp
gif 可选，建议先不支持动图预览优化
```

建议第一版支持：

```text
jpg / jpeg / png / webp
```

### 2.4 不做的功能

本阶段不做：

1. PDF 上传。
2. 图片排序。
3. 图片合并 PDF。
4. 拖拽排序。
5. OCR 识别。
6. 发票验真。
7. 供应商对账。
8. 附件物理清理。

## 3. 建议数据结构

新增表：

```text
project_expense_attachments
```

字段建议：

```text
id
order_id
original_name
stored_name
stored_path
mime_type
file_size
source_type
created_at
updated_at
deleted_at
```

说明：

1. `order_id` 关联项目费用单。
2. `source_type` 可取：
   - `pasted`
   - `selected`
3. 仅软删除，不物理删除文件。
4. 文件保存在本地数据库同级数据目录下。

建议保存路径：

```text
data/attachments/project-expenses/{orderId}/images/
```

## 4. 分层设计

保持现有架构：

```text
React 页面/组件
↓
renderer/api
↓
preload
↓
IPC
↓
Service
↓
Repository
↓
SQLite + 本地文件
```

### 4.1 shared

新增：

```text
src/shared/types/projectExpenseAttachment.ts
src/shared/schemas/projectExpenseAttachment.ts
```

类型：

```text
ProjectExpenseAttachment
ProjectExpenseAttachmentPreview
```

schema：

```text
listProjectExpenseAttachmentsSchema
createProjectExpenseAttachmentFromDataUrlSchema
removeProjectExpenseAttachmentSchema
previewProjectExpenseAttachmentSchema
```

### 4.2 main

新增：

```text
src/main/repositories/projectExpenseAttachmentRepository.ts
src/main/services/projectExpenseAttachmentService.ts
src/main/ipc/projectExpenseAttachmentIpc.ts
```

Service 负责：

1. 校验费用单存在。
2. 校验图片类型。
3. 将粘贴图片 data URL 写入本地文件。
4. 将选择的图片复制到本地附件目录。
5. 创建附件记录。
6. 读取图片为预览 data URL。
7. 检查本地文件是否存在。
8. 软删除附件。

Repository 只负责数据库访问。

### 4.3 preload

新增：

```text
window.haige.projectExpenseAttachments
```

接口：

```text
list(orderId)
importFiles(orderId)
createFromDataUrl(orderId, dataUrl)
preview(id)
remove(id)
```

### 4.4 renderer

新增：

```text
src/renderer/api/projectExpenseAttachmentApi.ts
src/renderer/components/ImagePasteUpload.tsx
```

项目收支页面中，在费用单详情抽屉内增加附件区域。

## 5. 粘贴上传设计

浏览器/Electron renderer 可以监听粘贴事件：

```text
onPaste
```

流程：

1. 用户截图。
2. 用户点击费用单附件区域。
3. 用户按 `Command + V` 或 `Ctrl + V`。
4. 组件从 `clipboardData.items` 中查找图片。
5. 将图片转为 data URL。
6. 调用 `projectExpenseAttachmentApi.createFromDataUrl(orderId, dataUrl)`。
7. Service 保存图片文件并写入数据库。
8. 前端刷新附件列表。

注意：

1. 粘贴区域需要可聚焦。
2. 粘贴失败时提示“剪贴板中没有图片”。
3. 图片过大时应提示，目前建议限制单张 10MB。

## 6. 传统选择上传设计

优先复用 Electron 主进程 `dialog.showOpenDialog`，由 Service/IPC 触发文件选择。

流程：

1. 点击“选择图片”。
2. Electron 打开系统文件选择框。
3. 用户选择图片。
4. Service 复制图片到附件目录。
5. Repository 写入附件记录。
6. 前端刷新列表。

## 7. UI 设计

费用单详情抽屉中，建议在“已保存明细”下面增加：

```text
附件图片
```

区域内容：

1. 左侧/顶部为粘贴上传框。
2. 按钮：
   - 选择图片
   - 刷新
3. 下方图片网格：
   - 缩略图
   - 文件名
   - 文件大小
   - 上传时间
   - 预览
   - 删除

草稿、已确认、已作废费用单都允许查看附件。

是否允许上传附件：

建议第一版：

1. 草稿允许上传。
2. 已确认允许上传补充凭证。
3. 已作废只允许查看，不允许新增。

原因：很多票据可能在付款后才补齐，已确认后仍允许上传更符合实际。

## 8. 验收标准

1. 费用单详情中可以看到“附件图片”区域。
2. 可以通过截图后粘贴上传图片。
3. 可以通过点击按钮选择本地图片上传。
4. 上传后图片出现在附件列表。
5. 点击图片可以预览。
6. 可以删除图片，删除为软删除。
7. 本地文件丢失时，列表有明确提示。
8. React 页面不直接操作 SQLite。
9. 数据库访问在 repository 层。
10. 文件保存和业务校验在 service 层。
11. `pnpm project-expense-attachment:smoke-test` 通过。
12. `pnpm verify` 通过。

## 9. 开发步骤

建议按以下顺序开发：

1. 新增 shared 类型和 schema。
2. 新增 SQLite 表和 Drizzle schema。
3. 新增 Repository。
4. 新增 Service。
5. 新增 IPC。
6. 新增 preload API 和 shared app 类型。
7. 新增 renderer API。
8. 新增 `ImagePasteUpload` 通用组件。
9. 在项目费用单详情中接入附件区域。
10. 新增 smoke test。
11. 更新用户手册和阶段总结。

## 10. 复用合同附件经验

可参考合同附件已有实现：

```text
src/main/services/contractAttachmentService.ts
src/main/repositories/contractAttachmentRepository.ts
src/main/ipc/contractAttachmentIpc.ts
src/renderer/pages/ContractsPage.tsx
src/renderer/api/contractAttachmentApi.ts
```

但不要直接混用合同附件表。项目费用单附件应独立建表，避免后续统计、迁移和业务含义混乱。
