import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { accountApi, employeeApi } from '@/renderer/api/masterDataApi';
import { projectStatsApi } from '@/renderer/api/projectStatsApi';
import { transactionApi } from '@/renderer/api/transactionApi';
import { formatYuan, parseYuan } from '@/renderer/utils/money';
import { fundTypeLabels, receiptStatusLabels, transactionDirectionLabels, transactionStatusLabels } from '@/renderer/utils/labels';
import type { Account } from '@/shared/types/account';
import type { Employee } from '@/shared/types/employee';
import type { ProjectStatsDetail, ProjectStatsListItem } from '@/shared/types/projectStats';
import type { TransactionListItem } from '@/shared/types/transaction';

type QuickEntryType = 'receipt' | 'material' | 'labor' | 'transport' | 'installation' | 'repair' | 'other';

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
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [projects, setProjects] = useState<ProjectStatsListItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [detail, setDetail] = useState<ProjectStatsDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [quickType, setQuickType] = useState<QuickEntryType>('receipt');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<QuickEntryType | 'all'>('all');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  async function loadBaseData() {
    const [projectResult, accountResult, employeeResult] = await Promise.all([
      projectStatsApi.list(),
      accountApi.list({ page: 1, pageSize: 100 }),
      employeeApi.list({ page: 1, pageSize: 100 }),
    ]);
    setProjects(projectResult);
    setAccounts(accountResult.items);
    setEmployees(employeeResult.items);

    if (!selectedProjectId && projectResult[0]) {
      setSelectedProjectId(projectResult[0].id);
      await loadDetail(projectResult[0].id);
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
    }
  }

  useEffect(() => {
    void loadBaseData().catch((error) => {
      messageApi.error(error instanceof Error ? error.message : '项目收支基础数据加载失败');
    });
  }, []);

  async function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    await loadDetail(projectId);
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
            pagination={{ pageSize: 20, showTotal: (count) => `共 ${count} 条` }}
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
