import { FileImageOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Drawer, Form, Image, Input, InputNumber, Modal, Popconfirm, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ImagePasteUpload } from '@/renderer/components/ImagePasteUpload';
import { accountApi, employeeApi, supplierApi } from '@/renderer/api/masterDataApi';
import { useDictionaries } from '@/renderer/hooks/useDictionaries';
import { useDefaultPageSize } from '@/renderer/hooks/useDefaultPageSize';
import { projectExpenseAttachmentApi } from '@/renderer/api/projectExpenseAttachmentApi';
import { projectExpenseApi } from '@/renderer/api/projectExpenseApi';
import { projectStatsApi } from '@/renderer/api/projectStatsApi';
import { transactionApi } from '@/renderer/api/transactionApi';
import { formatYuan, parseYuan } from '@/renderer/utils/money';
import { fundTypeLabels, projectExpenseOrderStatusLabels, receiptStatusLabels, transactionDirectionLabels, transactionStatusLabels } from '@/renderer/utils/labels';
import { pageSizeOptions } from '@/shared/constants/pagination';
import type { Account } from '@/shared/types/account';
import type { Employee } from '@/shared/types/employee';
import type { Supplier } from '@/shared/types/supplier';
import type { ProjectStatsDetail, ProjectStatsListItem } from '@/shared/types/projectStats';
import type { ProjectExpenseItem, ProjectExpenseOrder, ProjectExpenseOrderDetail } from '@/shared/types/projectExpense';
import type { ProjectExpenseAttachment, ProjectExpenseAttachmentPreview } from '@/shared/types/projectExpenseAttachment';
import type { TransactionListItem } from '@/shared/types/transaction';

type QuickEntryType = 'receipt' | 'material' | 'labor' | 'transport' | 'installation' | 'repair' | 'other';

interface ExpenseDraftItem {
  rowId: string;
  name: string;
  spec?: string | null;
  quantity: number;
  unit?: string | null;
  unitPriceCents: number;
  remark?: string | null;
}

const quickEntryConfigs: Record<
  QuickEntryType,
  {
    title: string;
    buttonLabel: string;
    direction: 'income' | 'expense';
    categoryId: string;
    fundType: string;
    affectsReceivable: boolean;
    affectsProjectProfit: boolean;
    defaultRemark: string;
    summaryLabel: string;
  }
> = {
  receipt: {
    title: '新增项目收款',
    buttonLabel: '项目收款',
    direction: 'income',
    categoryId: 'category_customer_payment',
    fundType: 'customer_payment',
    affectsReceivable: true,
    affectsProjectProfit: false,
    defaultRemark: '项目收款',
    summaryLabel: '项目收款',
  },
  material: {
    title: '新增材料支出',
    buttonLabel: '材料支出',
    direction: 'expense',
    categoryId: 'category_project_material',
    fundType: 'project_expense',
    affectsReceivable: false,
    affectsProjectProfit: true,
    defaultRemark: '项目材料支出',
    summaryLabel: '材料费',
  },
  labor: {
    title: '新增人工支出',
    buttonLabel: '人工支出',
    direction: 'expense',
    categoryId: 'category_salary',
    fundType: 'salary',
    affectsReceivable: false,
    affectsProjectProfit: true,
    defaultRemark: '项目人工支出',
    summaryLabel: '人工费',
  },
  transport: {
    title: '新增运输支出',
    buttonLabel: '运输费',
    direction: 'expense',
    categoryId: 'category_other_expense',
    fundType: 'project_expense',
    affectsReceivable: false,
    affectsProjectProfit: true,
    defaultRemark: '项目运输费',
    summaryLabel: '运输费',
  },
  installation: {
    title: '新增安装支出',
    buttonLabel: '安装费',
    direction: 'expense',
    categoryId: 'category_other_expense',
    fundType: 'project_expense',
    affectsReceivable: false,
    affectsProjectProfit: true,
    defaultRemark: '项目安装费',
    summaryLabel: '安装费',
  },
  repair: {
    title: '新增维修返工支出',
    buttonLabel: '维修返工',
    direction: 'expense',
    categoryId: 'category_other_expense',
    fundType: 'project_expense',
    affectsReceivable: false,
    affectsProjectProfit: true,
    defaultRemark: '项目维修返工',
    summaryLabel: '维修返工',
  },
  other: {
    title: '新增其他项目支出',
    buttonLabel: '其他支出',
    direction: 'expense',
    categoryId: 'category_other_expense',
    fundType: 'project_expense',
    affectsReceivable: false,
    affectsProjectProfit: true,
    defaultRemark: '其他项目支出',
    summaryLabel: '其他支出',
  },
};

const quickEntryOptions = (Object.keys(quickEntryConfigs) as QuickEntryType[]).map((type) => ({
  value: type,
  label: quickEntryConfigs[type].summaryLabel,
}));

export function ProjectFinancePage() {
  const location = useLocation();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [projects, setProjects] = useState<ProjectStatsListItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenseOrders, setExpenseOrders] = useState<ProjectExpenseOrder[]>([]);
  const [expenseDetail, setExpenseDetail] = useState<ProjectExpenseOrderDetail | null>(null);
  const [expenseAttachments, setExpenseAttachments] = useState<ProjectExpenseAttachment[]>([]);
  const [attachmentPreview, setAttachmentPreview] = useState<ProjectExpenseAttachmentPreview | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [detail, setDetail] = useState<ProjectStatsDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [quickType, setQuickType] = useState<QuickEntryType>('receipt');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<QuickEntryType | 'all'>('all');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [expenseDraftItems, setExpenseDraftItems] = useState<ExpenseDraftItem[]>([]);
  const [expenseForm] = Form.useForm();
  const [confirmForm] = Form.useForm();
  const [voidForm] = Form.useForm();
  const dictionaries = useDictionaries(['project_expense_order_status']);
  const expenseOrderStatusLabels = dictionaries.labels('project_expense_order_status', projectExpenseOrderStatusLabels);
  const defaultTablePageSize = useDefaultPageSize();

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const initialProjectId = useMemo(() => new URLSearchParams(location.search).get('projectId') ?? undefined, [location.search]);

  async function loadBaseData() {
    const [projectResult, accountResult, employeeResult, supplierResult] = await Promise.all([
      projectStatsApi.list(),
      accountApi.list({ page: 1, pageSize: 100 }),
      employeeApi.list({ page: 1, pageSize: 100 }),
      supplierApi.list({ page: 1, pageSize: 100 }),
    ]);
    setProjects(projectResult);
    setAccounts(accountResult.items);
    setEmployees(employeeResult.items);
    setSuppliers(supplierResult.items);

    const initialProject = projectResult.find((project) => project.id === initialProjectId) ?? projectResult[0];
    if (!selectedProjectId && initialProject) {
      setSelectedProjectId(initialProject.id);
      await loadDetail(initialProject.id);
      await loadExpenseOrders(initialProject.id);
    }
  }

  async function loadDetail(projectId = selectedProjectId) {
    if (!projectId) {
      setDetail(null);
      return;
    }

    try {
      setLoading(true);
      setDetail(await projectStatsApi.detail(projectId));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '项目收支加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function reloadAll(projectId = selectedProjectId) {
    const projectResult = await projectStatsApi.list();
    setProjects(projectResult);
    if (projectId) {
      await loadDetail(projectId);
      await loadExpenseOrders(projectId);
    }
  }

  async function loadExpenseOrders(projectId = selectedProjectId) {
    if (!projectId) {
      setExpenseOrders([]);
      return;
    }
    setExpenseOrders(await projectExpenseApi.listOrders({ projectId }));
  }

  useEffect(() => {
    void loadBaseData().catch((error) => {
      messageApi.error(error instanceof Error ? error.message : '项目收支基础数据加载失败');
    });
  }, []);

  async function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    await loadDetail(projectId);
    await loadExpenseOrders(projectId);
  }

  function openQuickEntry(type: QuickEntryType) {
    if (!selectedProject) {
      messageApi.warning('请先选择项目');
      return;
    }

    setQuickType(type);
    setModalOpen(true);
  }

  function syncQuickEntryForm() {
    const config = quickEntryConfigs[quickType];
    form.resetFields();
    form.setFieldsValue({
      occurredDate: dayjs(),
      accountId: accounts[0]?.id,
      amountYuan: 0,
      remark: config.defaultRemark,
    });
  }

  async function submitQuickEntry() {
    if (!selectedProject) {
      return;
    }

    const values = await form.validateFields();
    const config = quickEntryConfigs[quickType];
    const input = {
      transactionNo: null,
      direction: config.direction,
      amountCents: parseYuan(values.amountYuan),
      occurredDate: values.occurredDate.format('YYYY-MM-DD'),
      accountId: values.accountId,
      categoryId: config.categoryId,
      fundType: config.fundType,
      isCompanyFund: true,
      affectsReceivable: config.affectsReceivable,
      affectsProjectProfit: config.affectsProjectProfit,
      customerId: selectedProject.customerId,
      projectId: selectedProject.id,
      employeeId: quickType === 'labor' ? values.employeeId ?? null : null,
      remark: values.remark,
    };

    try {
      await transactionApi.create(input);
      messageApi.success('项目收支已保存');
      setModalOpen(false);
      form.resetFields();
      await reloadAll(selectedProject.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '项目收支保存失败');
    }
  }

  function openExpenseOrder() {
    if (!selectedProject) {
      messageApi.warning('请先选择项目');
      return;
    }
    expenseForm.resetFields();
    expenseForm.setFieldsValue({ occurredDate: dayjs(), expenseType: 'material' });
    setExpenseOpen(true);
  }

  async function submitExpenseOrder() {
    if (!selectedProject) return;
    const values = await expenseForm.validateFields();
    try {
      const order = await projectExpenseApi.createOrder({
        projectId: selectedProject.id,
        supplierId: values.supplierId ?? null,
        expenseType: values.expenseType,
        occurredDate: values.occurredDate.format('YYYY-MM-DD'),
        accountId: values.accountId ?? null,
        remark: values.remark,
      });
      messageApi.success('项目费用单已创建');
      setExpenseOpen(false);
      await loadExpenseOrders(selectedProject.id);
      await openExpenseDetail(order.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '创建费用单失败');
    }
  }

  async function openExpenseDetail(id: string) {
    const [nextDetail, nextAttachments] = await Promise.all([
      projectExpenseApi.getDetail(id),
      projectExpenseAttachmentApi.list(id),
    ]);
    setExpenseDetail(nextDetail);
    setExpenseAttachments(nextAttachments);
    setExpenseDraftItems([]);
  }

  async function loadExpenseAttachments(orderId = expenseDetail?.order.id) {
    if (!orderId) {
      setExpenseAttachments([]);
      return;
    }
    setExpenseAttachments(await projectExpenseAttachmentApi.list(orderId));
  }

  async function pasteExpenseAttachment(dataUrl: string, originalName?: string) {
    if (!expenseDetail) return;
    try {
      setAttachmentLoading(true);
      await projectExpenseAttachmentApi.createFromDataUrl(expenseDetail.order.id, dataUrl, originalName);
      messageApi.success('截图已上传');
      await loadExpenseAttachments(expenseDetail.order.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '截图上传失败');
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function selectExpenseAttachment() {
    if (!expenseDetail) return;
    try {
      setAttachmentLoading(true);
      await projectExpenseAttachmentApi.importFiles(expenseDetail.order.id);
      await loadExpenseAttachments(expenseDetail.order.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function previewExpenseAttachment(attachment: ProjectExpenseAttachment) {
    try {
      setAttachmentLoading(true);
      setAttachmentPreview(await projectExpenseAttachmentApi.preview(attachment.id));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '图片预览失败');
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function removeExpenseAttachment(attachment: ProjectExpenseAttachment) {
    try {
      await projectExpenseAttachmentApi.remove(attachment.id);
      messageApi.success('附件已删除');
      await loadExpenseAttachments(attachment.orderId);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '附件删除失败');
    }
  }

  function addExpenseDraftItem() {
    setExpenseDraftItems((items) => [
      ...items,
      {
        rowId: crypto.randomUUID(),
        name: '',
        spec: null,
        quantity: 1,
        unit: '',
        unitPriceCents: 0,
        remark: null,
      },
    ]);
  }

  function updateExpenseDraftItem(rowId: string, field: keyof ExpenseDraftItem, value: unknown) {
    setExpenseDraftItems((items) =>
      items.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              [field]: field === 'quantity'
                ? Number(value ?? 0)
                : field === 'unitPriceCents'
                  ? parseYuan(value as string | number | null)
                  : value,
            }
          : item,
      ),
    );
  }

  async function submitExpenseDraftItems() {
    if (!expenseDetail) return;

    if (expenseDraftItems.length === 0) {
      messageApi.warning('请先新增一行费用明细');
      return;
    }

    const invalidIndex = expenseDraftItems.findIndex((item) => !item.name.trim());
    if (invalidIndex >= 0) {
      messageApi.warning(`第 ${invalidIndex + 1} 行明细名称不能为空`);
      return;
    }

    try {
      await projectExpenseApi.createItemsBatch({
        orderId: expenseDetail.order.id,
        items: expenseDraftItems.map((item) => ({
          name: item.name,
          spec: item.spec,
          quantity: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          remark: item.remark,
        })),
      });
      messageApi.success(`已保存 ${expenseDraftItems.length} 条费用明细`);
      setExpenseDraftItems([]);
      await openExpenseDetail(expenseDetail.order.id);
      await loadExpenseOrders(selectedProjectId);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '批量保存费用明细失败');
    }
  }

  async function confirmExpenseOrder() {
    if (!expenseDetail) return;
    const values = await confirmForm.validateFields();
    try {
      await projectExpenseApi.confirmOrder(expenseDetail.order.id, values.accountId);
      messageApi.success('费用单已确认并生成财务流水');
      setConfirmOpen(false);
      await reloadAll(selectedProjectId);
      await openExpenseDetail(expenseDetail.order.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '确认费用单失败');
    }
  }

  async function voidExpenseOrder() {
    if (!expenseDetail) return;
    const values = await voidForm.validateFields();
    try {
      await projectExpenseApi.voidOrder(expenseDetail.order.id, values.reason);
      messageApi.success('费用单已作废');
      setVoidOpen(false);
      await reloadAll(selectedProjectId);
      await openExpenseDetail(expenseDetail.order.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '作废费用单失败');
    }
  }

  const categorizedTransactions = useMemo(() => {
    return (detail?.transactions ?? []).map((transaction) => ({
      ...transaction,
      projectFinanceType: getProjectFinanceType(transaction),
    }));
  }, [detail]);

  const filteredTransactions = useMemo(() => {
    if (transactionTypeFilter === 'all') {
      return categorizedTransactions;
    }

    return categorizedTransactions.filter((transaction) => transaction.projectFinanceType === transactionTypeFilter);
  }, [categorizedTransactions, transactionTypeFilter]);

  const financeSummary = useMemo(() => {
    const summary = Object.fromEntries(
      (Object.keys(quickEntryConfigs) as QuickEntryType[]).map((type) => [type, 0]),
    ) as Record<QuickEntryType, number>;

    for (const transaction of categorizedTransactions) {
      if (transaction.status !== 'normal') {
        continue;
      }

      summary[transaction.projectFinanceType] += transaction.amountCents;
    }

    return summary;
  }, [categorizedTransactions]);

  const columns = useMemo<ColumnsType<TransactionListItem>>(
    () => [
      { title: '日期', dataIndex: 'occurredDate', width: 110 },
      {
        title: '方向',
        dataIndex: 'direction',
        width: 90,
        render: (value) => <Tag color={value === 'income' ? 'green' : 'red'}>{transactionDirectionLabels[String(value)]}</Tag>,
      },
      { title: '金额', dataIndex: 'amountCents', width: 120, align: 'right', render: (value) => formatYuan(Number(value)) },
      { title: '账户', dataIndex: 'accountName', width: 130 },
      { title: '分类', dataIndex: 'categoryName', width: 130 },
      { title: '资金性质', dataIndex: 'fundType', width: 120, render: (value) => fundTypeLabels[String(value)] ?? value },
      {
        title: '项目类型',
        dataIndex: 'projectFinanceType',
        width: 120,
        render: (value) => quickEntryConfigs[value as QuickEntryType]?.summaryLabel ?? '-',
      },
      { title: '员工', dataIndex: 'employeeName', width: 120, render: (value) => value || '-' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        render: (value) => <Tag color={value === 'normal' ? 'blue' : 'default'}>{transactionStatusLabels[String(value)]}</Tag>,
      },
      { title: '备注', dataIndex: 'remark', width: 180, render: (value) => value || '-' },
    ],
    [],
  );

  const expenseOrderColumns = useMemo<ColumnsType<ProjectExpenseOrder>>(
    () => [
      { title: '日期', dataIndex: 'occurredDate', width: 110 },
      { title: '类型', dataIndex: 'expenseType', width: 110, render: (value) => quickEntryConfigs[value as QuickEntryType]?.summaryLabel ?? value },
      { title: '供应商', dataIndex: 'supplierName', width: 150, render: (value) => value || '-' },
      { title: '金额', dataIndex: 'totalAmountCents', width: 120, align: 'right', render: (value) => formatYuan(Number(value)) },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (value) => (
          <Tag color={value === 'confirmed' ? 'green' : value === 'voided' ? 'red' : 'default'}>
            {expenseOrderStatusLabels[String(value)] ?? value}
          </Tag>
        ),
      },
      { title: '备注', dataIndex: 'remark', width: 180, render: (value) => value || '-' },
      { title: '操作', width: 100, fixed: 'right', render: (_, record) => <Button type="text" onClick={() => openExpenseDetail(record.id)}>详情</Button> },
    ],
    [expenseOrderStatusLabels],
  );

  const expenseItemColumns = useMemo<ColumnsType<ProjectExpenseItem>>(
    () => [
      { title: '名称', dataIndex: 'name', width: 160 },
      { title: '规格', dataIndex: 'spec', width: 120, render: (value) => value || '-' },
      { title: '数量', dataIndex: 'quantity', width: 90 },
      { title: '单位', dataIndex: 'unit', width: 80, render: (value) => value || '-' },
      { title: '单价', dataIndex: 'unitPriceCents', width: 110, align: 'right', render: (value) => formatYuan(Number(value)) },
      { title: '金额', dataIndex: 'amountCents', width: 110, align: 'right', render: (value) => formatYuan(Number(value)) },
      { title: '备注', dataIndex: 'remark', render: (value) => value || '-' },
    ],
    [],
  );

  const expenseDraftTotalCents = useMemo(
    () => expenseDraftItems.reduce((total, item) => total + Math.round(item.quantity * item.unitPriceCents), 0),
    [expenseDraftItems],
  );

  const expenseDraftColumns = useMemo<ColumnsType<ExpenseDraftItem>>(
    () => [
      {
        title: '名称',
        dataIndex: 'name',
        width: 170,
        fixed: 'left',
        render: (_, record) => (
          <Input
            placeholder="例如：板材"
            value={record.name}
            onChange={(event) => updateExpenseDraftItem(record.rowId, 'name', event.target.value)}
          />
        ),
      },
      {
        title: '规格',
        dataIndex: 'spec',
        width: 130,
        render: (_, record) => (
          <Input value={record.spec ?? ''} onChange={(event) => updateExpenseDraftItem(record.rowId, 'spec', event.target.value)} />
        ),
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        width: 110,
        render: (_, record) => (
          <InputNumber
            min={0}
            precision={2}
            value={record.quantity}
            onChange={(value) => updateExpenseDraftItem(record.rowId, 'quantity', value)}
            style={{ width: '100%' }}
          />
        ),
      },
      {
        title: '单位',
        dataIndex: 'unit',
        width: 100,
        render: (_, record) => (
          <Input value={record.unit ?? ''} onChange={(event) => updateExpenseDraftItem(record.rowId, 'unit', event.target.value)} />
        ),
      },
      {
        title: '单价（元）',
        dataIndex: 'unitPriceCents',
        width: 130,
        render: (_, record) => (
          <InputNumber
            min={0}
            precision={2}
            value={record.unitPriceCents / 100}
            onChange={(value) => updateExpenseDraftItem(record.rowId, 'unitPriceCents', value)}
            style={{ width: '100%' }}
          />
        ),
      },
      {
        title: '金额',
        width: 120,
        align: 'right',
        render: (_, record) => formatYuan(Math.round(record.quantity * record.unitPriceCents)),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 180,
        render: (_, record) => (
          <Input value={record.remark ?? ''} onChange={(event) => updateExpenseDraftItem(record.rowId, 'remark', event.target.value)} />
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 90,
        fixed: 'right',
        render: (_, record) => (
          <Button type="text" danger onClick={() => setExpenseDraftItems((items) => items.filter((item) => item.rowId !== record.rowId))}>
            移除
          </Button>
        ),
      },
    ],
    [],
  );

  const expenseAttachmentColumns = useMemo<ColumnsType<ProjectExpenseAttachment>>(
    () => [
      {
        title: '图片',
        key: 'image',
        width: 80,
        render: () => <FileImageOutlined style={{ fontSize: 24 }} />,
      },
      {
        title: '文件名',
        dataIndex: 'originalName',
        width: 260,
        render: (value, record) => (
          <Space direction="vertical" size={2}>
            <Typography.Text>{value}</Typography.Text>
            {!record.fileExists ? <Typography.Text type="danger">本地文件丢失</Typography.Text> : null}
          </Space>
        ),
      },
      { title: '来源', dataIndex: 'sourceType', width: 90, render: (value) => (value === 'pasted' ? '粘贴' : '选择') },
      { title: '大小', dataIndex: 'fileSizeBytes', width: 100, render: (value) => formatFileSize(value) },
      { title: '上传时间', dataIndex: 'createdAt', width: 160, render: (value) => dayjs(Number(value)).format('YYYY-MM-DD HH:mm') },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        render: (_, record) => (
          <Space>
            <Button type="link" disabled={!record.fileExists} onClick={() => previewExpenseAttachment(record)}>
              预览
            </Button>
            <Popconfirm title="确认删除这张图片？" okText="删除" cancelText="取消" onConfirm={() => removeExpenseAttachment(record)}>
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <Space direction="vertical" size="middle" className="page-stack">
      {contextHolder}

      <Card>
        <Space className="toolbar" wrap>
          <Space wrap>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择项目"
              value={selectedProjectId}
              style={{ width: 320 }}
              options={projects.map((project) => ({
                value: project.id,
                label: `${project.customerName || '未命名客户'} / ${project.name}`,
              }))}
              onChange={handleProjectChange}
            />
            <Button icon={<ReloadOutlined />} onClick={() => reloadAll()}>
              刷新
            </Button>
          </Space>
          <Space wrap>
            {(Object.keys(quickEntryConfigs) as QuickEntryType[]).map((type) => (
              <Button key={type} type={type === 'receipt' ? 'primary' : 'default'} icon={<PlusOutlined />} disabled={!selectedProject} onClick={() => openQuickEntry(type)}>
                {quickEntryConfigs[type].buttonLabel}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>

      <Card>
        <Space direction="vertical" size="middle" className="page-stack">
          <Space className="toolbar" wrap>
            <Typography.Title level={5} style={{ margin: 0 }}>项目费用单</Typography.Title>
            <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProject} onClick={openExpenseOrder}>新增费用单</Button>
          </Space>
          <Table<ProjectExpenseOrder>
            rowKey="id"
            dataSource={expenseOrders}
            columns={expenseOrderColumns}
            pagination={{
              pageSize: defaultTablePageSize,
              showSizeChanger: true,
              pageSizeOptions: pageSizeOptions.map(String),
              showTotal: (count) => `共 ${count} 条`,
            }}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Card>

      <Space wrap>
        <Card size="small" style={{ width: 170 }}>
          <Statistic title="合同金额" value={formatYuan(detail?.stats.contractAmountCents ?? 0)} />
        </Card>
        <Card size="small" style={{ width: 170 }}>
          <Statistic title="已收款" value={formatYuan(detail?.stats.receivedCents ?? 0)} />
        </Card>
        <Card size="small" style={{ width: 170 }}>
          <Statistic title="已支出" value={formatYuan(detail?.stats.expenseCents ?? 0)} />
        </Card>
        <Card size="small" style={{ width: 170 }}>
          <Statistic title="应收款" value={formatYuan(detail?.stats.receivableCents ?? 0)} />
        </Card>
        <Card size="small" style={{ width: 170 }}>
          <Statistic title="当前毛利" value={formatYuan(detail?.stats.currentProfitCents ?? 0)} />
        </Card>
        <Card size="small" style={{ width: 170 }}>
          <Statistic title="预计毛利" value={formatYuan(detail?.stats.expectedProfitCents ?? 0)} />
        </Card>
      </Space>

      <Space wrap>
        {quickEntryOptions.map((option) => (
          <Card key={option.value} size="small" style={{ width: 150 }}>
            <Statistic title={option.label} value={formatYuan(financeSummary[option.value as QuickEntryType] ?? 0)} />
          </Card>
        ))}
      </Space>

      <Card>
        <Space direction="vertical" size="middle" className="page-stack">
          <Space className="toolbar" wrap>
            <Space wrap>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {detail ? `${detail.project.customerName || '-'} / ${detail.project.name}` : '项目流水'}
              </Typography.Title>
              {detail ? <Tag>{receiptStatusLabels[detail.stats.receiptStatus]}</Tag> : null}
            </Space>
            <Select
              value={transactionTypeFilter}
              style={{ width: 150 }}
              options={[{ value: 'all', label: '全部类型' }, ...quickEntryOptions]}
              onChange={setTransactionTypeFilter}
            />
          </Space>
          <Table<TransactionListItem>
            rowKey="id"
            loading={loading}
            dataSource={filteredTransactions}
            columns={columns}
            pagination={{
              pageSize: defaultTablePageSize,
              showSizeChanger: true,
              pageSizeOptions: pageSizeOptions.map(String),
              showTotal: (count) => `共 ${count} 条`,
            }}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Card>

      <Modal
        title={quickEntryConfigs[quickType].title}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        onOk={submitQuickEntry}
        onCancel={() => setModalOpen(false)}
        afterOpenChange={(visible) => {
          if (visible) {
            syncQuickEntryForm();
          }
        }}
        forceRender
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="occurredDate" label="发生日期" rules={[{ required: true, message: '请选择发生日期' }]}>
            <DatePicker allowClear={false} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="accountId" label="账户" rules={[{ required: true, message: '请选择账户' }]}>
            <Select options={accounts.map((account) => ({ value: account.id, label: account.name }))} />
          </Form.Item>
          <Form.Item name="amountYuan" label="金额（元）" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          {quickType === 'labor' ? (
            <Form.Item name="employeeId" label="关联员工">
              <Select allowClear options={employees.map((employee) => ({ value: employee.id, label: employee.name }))} />
            </Form.Item>
          ) : null}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="新增项目费用单" open={expenseOpen} okText="保存" cancelText="取消" onOk={submitExpenseOrder} onCancel={() => setExpenseOpen(false)} destroyOnHidden>
        <Form form={expenseForm} layout="vertical" preserve={false}>
          <Form.Item name="expenseType" label="费用类型" rules={[{ required: true, message: '请选择费用类型' }]}>
            <Select options={quickEntryOptions.filter((item) => item.value !== 'receipt')} />
          </Form.Item>
          <Form.Item name="supplierId" label="供应商">
            <Select allowClear showSearch optionFilterProp="label" options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} />
          </Form.Item>
          <Form.Item name="occurredDate" label="费用日期" rules={[{ required: true, message: '请选择费用日期' }]}>
            <DatePicker allowClear={false} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="accountId" label="计划付款账户">
            <Select allowClear options={accounts.map((account) => ({ value: account.id, label: account.name }))} />
          </Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={expenseDetail ? `费用单详情：${quickEntryConfigs[expenseDetail.order.expenseType as QuickEntryType]?.summaryLabel}` : '费用单详情'}
        open={Boolean(expenseDetail)}
        width={`calc(100vw - 150px)`}
        onClose={() => {
          setExpenseDetail(null);
          setExpenseDraftItems([]);
          setExpenseAttachments([]);
        }}
      >
        {expenseDetail ? (
          <Space direction="vertical" size="middle" className="page-stack">
            <Space wrap>
              <Tag>{expenseOrderStatusLabels[expenseDetail.order.status] ?? expenseDetail.order.status}</Tag>
              <Tag>合计 {formatYuan(expenseDetail.order.totalAmountCents)}</Tag>
              <Tag>供应商 {expenseDetail.order.supplierName || '-'}</Tag>
            </Space>
            <Space wrap>
              <Button type="primary" icon={<PlusOutlined />} disabled={expenseDetail.order.status !== 'draft'} onClick={addExpenseDraftItem}>新增一行</Button>
              <Button disabled={expenseDetail.order.status !== 'draft' || expenseDraftItems.length === 0} onClick={submitExpenseDraftItems}>一次性保存</Button>
              <Button disabled={expenseDraftItems.length === 0} onClick={() => setExpenseDraftItems([])}>清空待保存</Button>
              <Button disabled={expenseDetail.order.status !== 'draft'} onClick={() => {
                confirmForm.setFieldsValue({ accountId: expenseDetail.order.accountId ?? accounts[0]?.id });
                setConfirmOpen(true);
              }}>确认生成流水</Button>
              <Popconfirm title="确认删除这张草稿费用单？" disabled={expenseDetail.order.status !== 'draft'} onConfirm={async () => {
                await projectExpenseApi.removeOrder(expenseDetail.order.id);
                setExpenseDetail(null);
                await loadExpenseOrders(selectedProjectId);
              }}>
                <Button danger disabled={expenseDetail.order.status !== 'draft'}>删除草稿</Button>
              </Popconfirm>
              <Button danger disabled={expenseDetail.order.status === 'voided'} onClick={() => setVoidOpen(true)}>作废</Button>
            </Space>
            {expenseDraftItems.length > 0 ? (
              <Space direction="vertical" size="small" className="page-stack">
                <Space wrap>
                  <Typography.Title level={5} style={{ margin: 0 }}>待保存明细</Typography.Title>
                  <Tag>新增 {expenseDraftItems.length} 行</Tag>
                  <Tag color="blue">待保存合计 {formatYuan(expenseDraftTotalCents)}</Tag>
                </Space>
                <Table<ExpenseDraftItem>
                  rowKey="rowId"
                  dataSource={expenseDraftItems}
                  columns={expenseDraftColumns}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                />
              </Space>
            ) : null}
            <Space direction="vertical" size="small" className="page-stack">
              <Typography.Title level={5} style={{ margin: 0 }}>已保存明细</Typography.Title>
              <Table<ProjectExpenseItem> rowKey="id" dataSource={expenseDetail.items} columns={expenseItemColumns} pagination={false} scroll={{ x: 'max-content' }} />
            </Space>
            <Space direction="vertical" size="small" className="page-stack">
              <Space className="toolbar" wrap>
                <Typography.Title level={5} style={{ margin: 0 }}>附件图片</Typography.Title>
                <Button onClick={() => loadExpenseAttachments()} loading={attachmentLoading}>刷新附件</Button>
              </Space>
              <ImagePasteUpload
                disabled={expenseDetail.order.status === 'voided'}
                loading={attachmentLoading}
                onPasteImage={pasteExpenseAttachment}
                onSelectImage={selectExpenseAttachment}
              />
              <Table<ProjectExpenseAttachment>
                rowKey="id"
                loading={attachmentLoading}
                dataSource={expenseAttachments}
                columns={expenseAttachmentColumns}
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </Space>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title={attachmentPreview?.originalName ?? '图片预览'}
        open={Boolean(attachmentPreview)}
        footer={null}
        width={760}
        onCancel={() => setAttachmentPreview(null)}
        destroyOnClose
      >
        {attachmentPreview ? <Image src={attachmentPreview.dataUrl} alt={attachmentPreview.originalName} width="100%" /> : null}
      </Modal>

      <Modal title="确认费用单" open={confirmOpen} okText="确认" cancelText="取消" onOk={confirmExpenseOrder} onCancel={() => setConfirmOpen(false)} destroyOnHidden>
        <Form form={confirmForm} layout="vertical" preserve={false}>
          <Form.Item name="accountId" label="付款账户" rules={[{ required: true, message: '请选择付款账户' }]}>
            <Select options={accounts.map((account) => ({ value: account.id, label: account.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="作废费用单" open={voidOpen} okText="作废" cancelText="取消" onOk={voidExpenseOrder} onCancel={() => setVoidOpen(false)} destroyOnHidden>
        <Form form={voidForm} layout="vertical" preserve={false}>
          <Form.Item name="reason" label="作废原因" rules={[{ required: true, message: '请输入作废原因' }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function getProjectFinanceType(transaction: TransactionListItem): QuickEntryType {
  const remark = transaction.remark ?? '';

  if (transaction.direction === 'income' && transaction.fundType === 'customer_payment') {
    return 'receipt';
  }

  for (const type of ['transport', 'installation', 'repair'] as QuickEntryType[]) {
    if (remark.startsWith(quickEntryConfigs[type].defaultRemark)) {
      return type;
    }
  }

  if (transaction.categoryId === 'category_project_material') {
    return 'material';
  }

  if (transaction.categoryId === 'category_salary' || transaction.fundType === 'salary') {
    return 'labor';
  }

  return 'other';
}

function formatFileSize(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
