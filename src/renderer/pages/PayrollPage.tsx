import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { InputNumberProps } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { accountApi, employeeApi } from '@/renderer/api/masterDataApi';
import { payrollApi } from '@/renderer/api/payrollApi';
import { formatYuan, parseYuan } from '@/renderer/utils/money';
import { payrollBatchStatusLabels, payrollOperationActionLabels, toOptions } from '@/renderer/utils/labels';
import type { Account } from '@/shared/types/account';
import type { Employee } from '@/shared/types/employee';
import type { PayrollBatch, PayrollBatchDetail, PayrollItem } from '@/shared/types/payroll';

const moneyFieldNames = [
  'baseSalaryCents',
  'attendanceBonusCents',
  'phoneAllowanceCents',
  'bonusCents',
  'commissionCents',
  'deductionCents',
  'socialInsuranceCents',
  'housingFundCents',
  'taxCents',
] as const;

type BatchDraftItem = {
  employeeId: string;
  employeeName: string;
  baseSalaryCents: number;
  attendanceBonusCents: number;
  phoneAllowanceCents: number;
  bonusCents: number;
  commissionCents: number;
  deductionCents: number;
  socialInsuranceCents: number;
  housingFundCents: number;
  taxCents: number;
  remark?: string | null;
};

type BatchDraftMoneyField = (typeof moneyFieldNames)[number];

function renderMoneyInput(
  record: BatchDraftItem,
  field: BatchDraftMoneyField,
  onChange: (employeeId: string, field: keyof BatchDraftItem, value: unknown) => void,
) {
  const handleChange: InputNumberProps['onChange'] = (value) => {
    onChange(record.employeeId, field, value);
  };

  return <InputNumber min={0} precision={2} value={record[field] / 100} onChange={handleChange} style={{ width: '100%' }} />;
}

const payrollStatusColor: Record<string, string> = {
  draft: 'default',
  confirmed: 'blue',
  paid: 'green',
  voided: 'red',
};

export function PayrollPage() {
  const [batchForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [payForm] = Form.useForm();
  const [voidForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [items, setItems] = useState<PayrollBatch[]>([]);
  const [detail, setDetail] = useState<PayrollBatchDetail | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [month, setMonth] = useState<dayjs.Dayjs | null>(null);
  const [status, setStatus] = useState<string>();
  const [batchOpen, setBatchOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [batchEntryOpen, setBatchEntryOpen] = useState(false);
  const [batchDraftItems, setBatchDraftItems] = useState<BatchDraftItem[]>([]);
  const [editingBatch, setEditingBatch] = useState<PayrollBatch | null>(null);
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [activeBatch, setActiveBatch] = useState<PayrollBatch | null>(null);

  async function loadBaseData() {
    const [accountResult, employeeResult] = await Promise.all([
      accountApi.list({ page: 1, pageSize: 100 }),
      employeeApi.list({ page: 1, pageSize: 100 }),
    ]);
    setAccounts(accountResult.items);
    setEmployees(employeeResult.items);
  }

  async function load() {
    try {
      setLoading(true);
      const result = await payrollApi.listBatches({
        month: month?.format('YYYY-MM'),
        status: status as any,
      });
      setItems(result);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '加载工资批次失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    try {
      setDetailLoading(true);
      const result = await payrollApi.getDetail(id);
      setDetail(result);
      setActiveBatch(result.batch);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '加载工资详情失败');
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadBaseData().catch((error) => {
      messageApi.error(error instanceof Error ? error.message : '基础数据加载失败');
    });
  }, []);

  useEffect(() => {
    void load();
  }, []);

  function openCreateBatch() {
    setEditingBatch(null);
    batchForm.resetFields();
    batchForm.setFieldsValue({
      month: dayjs(),
      name: `${dayjs().format('YYYY-MM')} 工资`,
      payDate: dayjs(),
    });
    setBatchOpen(true);
  }

  function openEditBatch(batch: PayrollBatch) {
    setEditingBatch(batch);
    batchForm.setFieldsValue({
      ...batch,
      month: dayjs(`${batch.month}-01`),
      payDate: batch.payDate ? dayjs(batch.payDate) : null,
    });
    setBatchOpen(true);
  }

  async function submitBatch() {
    const values = await batchForm.validateFields();
    const input = {
      ...values,
      month: values.month.format('YYYY-MM'),
      payDate: values.payDate ? values.payDate.format('YYYY-MM-DD') : null,
    };

    try {
      if (editingBatch) {
        await payrollApi.updateBatch(editingBatch.id, input);
        messageApi.success('工资批次已保存');
      } else {
        await payrollApi.createBatch(input);
        messageApi.success('工资批次已创建');
      }
      setBatchOpen(false);
      await load();
      if (detail) {
        await loadDetail(detail.batch.id);
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '保存工资批次失败');
    }
  }

  function openCreateItem() {
    if (!activeBatch) {
      return;
    }
    setEditingItem(null);
    setItemOpen(true);
  }

  function openEditItem(item: PayrollItem) {
    setEditingItem(item);
    setItemOpen(true);
  }

  function syncItemFormValues() {
    itemForm.resetFields();

    if (editingItem) {
      itemForm.setFieldsValue({
        ...editingItem,
        ...Object.fromEntries(moneyFieldNames.map((field) => [field, editingItem[field] / 100])),
      });
      return;
    }

    itemForm.setFieldsValue(Object.fromEntries(moneyFieldNames.map((field) => [field, 0])));
  }

  async function submitItem() {
    if (!activeBatch) {
      return;
    }

    const values = await itemForm.validateFields();
    const input = {
      ...values,
      ...Object.fromEntries(moneyFieldNames.map((field) => [field, parseYuan(values[field])])),
    };

    try {
      if (editingItem) {
        await payrollApi.updateItem(editingItem.id, input);
        messageApi.success(activeBatch.status === 'paid' ? '已发放工资已调整' : '工资明细已保存');
      } else {
        await payrollApi.createItem({ ...input, batchId: activeBatch.id });
        messageApi.success('工资明细已新增');
      }
      setItemOpen(false);
      await load();
      await loadDetail(activeBatch.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '保存工资明细失败');
    }
  }

  function openBatchEntry() {
    if (!activeBatch) {
      return;
    }

    setBatchDraftItems([]);
    setBatchEntryOpen(true);
  }

  function toggleBatchEmployee(employee: Employee) {
    const existingItem = detail?.items.find((item) => item.employeeId === employee.id);
    if (existingItem) {
      return;
    }

    setBatchDraftItems((draftItems) => {
      if (draftItems.some((item) => item.employeeId === employee.id)) {
        return draftItems.filter((item) => item.employeeId !== employee.id);
      }

      return [
        ...draftItems,
        {
          employeeId: employee.id,
          employeeName: employee.name,
          baseSalaryCents: 0,
          attendanceBonusCents: 0,
          phoneAllowanceCents: 0,
          bonusCents: 0,
          commissionCents: 0,
          deductionCents: 0,
          socialInsuranceCents: 0,
          housingFundCents: 0,
          taxCents: 0,
          remark: null,
        },
      ];
    });
  }

  function updateBatchDraftItem(employeeId: string, field: keyof BatchDraftItem, value: unknown) {
    setBatchDraftItems((draftItems) =>
      draftItems.map((item) =>
        item.employeeId === employeeId
          ? {
              ...item,
              [field]: field === 'remark' ? value : parseYuan(value as string | number | null),
            }
          : item,
      ),
    );
  }

  async function submitBatchEntry() {
    if (!activeBatch) {
      return;
    }

    if (batchDraftItems.length === 0) {
      messageApi.warning('请先选择员工');
      return;
    }

    try {
      await payrollApi.createItemsBatch({
        batchId: activeBatch.id,
        items: batchDraftItems.map(({ employeeName, ...item }) => item),
      });
      messageApi.success(`已批量保存 ${batchDraftItems.length} 条工资明细`);
      setBatchEntryOpen(false);
      setBatchDraftItems([]);
      await load();
      await loadDetail(activeBatch.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '批量保存工资明细失败');
    }
  }

  async function removeBatch(id: string) {
    try {
      await payrollApi.removeBatch(id);
      messageApi.success('工资批次已删除');
      await load();
      if (detail?.batch.id === id) {
        setDetail(null);
        setActiveBatch(null);
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '删除工资批次失败');
    }
  }

  async function removeItem(id: string) {
    if (!activeBatch) {
      return;
    }

    try {
      await payrollApi.removeItem(id);
      messageApi.success('工资明细已删除');
      await load();
      await loadDetail(activeBatch.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '删除工资明细失败');
    }
  }

  async function confirmBatch(id: string) {
    try {
      await payrollApi.confirmBatch(id);
      messageApi.success('工资批次已确认');
      await load();
      await loadDetail(id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '确认工资失败');
    }
  }

  async function cancelConfirmBatch(id: string) {
    try {
      await payrollApi.cancelConfirmBatch(id);
      messageApi.success('已撤销确认');
      await load();
      await loadDetail(id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '撤销确认失败');
    }
  }

  function openPay(batch: PayrollBatch) {
    setActiveBatch(batch);
    payForm.resetFields();
    payForm.setFieldsValue({
      accountId: batch.accountId ?? accounts[0]?.id,
      payDate: batch.payDate ? dayjs(batch.payDate) : dayjs(),
    });
    setPayOpen(true);
  }

  async function submitPay() {
    if (!activeBatch) {
      return;
    }

    const values = await payForm.validateFields();
    try {
      await payrollApi.payBatch({
        id: activeBatch.id,
        accountId: values.accountId,
        payDate: values.payDate.format('YYYY-MM-DD'),
        remark: values.remark,
      });
      messageApi.success('工资已发放，并已生成财务流水');
      setPayOpen(false);
      await load();
      await loadDetail(activeBatch.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '发放工资失败');
    }
  }

  function openVoid(batch: PayrollBatch) {
    setActiveBatch(batch);
    voidForm.resetFields();
    setVoidOpen(true);
  }

  async function submitVoid() {
    if (!activeBatch) {
      return;
    }

    const values = await voidForm.validateFields();
    try {
      await payrollApi.voidBatch(activeBatch.id, values.reason);
      messageApi.success(activeBatch.status === 'paid' ? '工资已作废，关联流水已作废' : '工资已作废');
      setVoidOpen(false);
      await load();
      await loadDetail(activeBatch.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '作废工资失败');
    }
  }

  const batchColumns = useMemo<ColumnsType<PayrollBatch>>(
    () => [
      { title: '月份', dataIndex: 'month', width: 110 },
      { title: '批次名称', dataIndex: 'name', width: 220 },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (value) => <Tag color={payrollStatusColor[String(value)]}>{payrollBatchStatusLabels[String(value)]}</Tag>,
      },
      { title: '发放日期', dataIndex: 'payDate', width: 120, render: (value) => value || '-' },
      { title: '应发', dataIndex: 'totalGrossCents', align: 'right', width: 120, render: (value) => formatYuan(Number(value)) },
      { title: '扣款', dataIndex: 'totalDeductionCents', align: 'right', width: 120, render: (value) => formatYuan(Number(value)) },
      { title: '实发', dataIndex: 'totalNetCents', align: 'right', width: 120, render: (value) => formatYuan(Number(value)) },
      { title: '备注', dataIndex: 'remark', width: 180, render: (value) => value || '-' },
      {
        title: '操作',
        key: 'actions',
        width: 360,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Button type="text" icon={<EyeOutlined />} onClick={() => loadDetail(record.id)}>
              详情
            </Button>
            <Button type="text" icon={<EditOutlined />} disabled={!['draft', 'confirmed'].includes(record.status)} onClick={() => openEditBatch(record)}>
              编辑
            </Button>
            {record.status === 'draft' ? (
              <Button type="text" onClick={() => confirmBatch(record.id)}>
                确认
              </Button>
            ) : null}
            {record.status === 'confirmed' ? (
              <>
                <Button type="text" onClick={() => cancelConfirmBatch(record.id)}>
                  撤销
                </Button>
                <Button type="text" icon={<WalletOutlined />} onClick={() => openPay(record)}>
                  发放
                </Button>
              </>
            ) : null}
            {record.status !== 'voided' ? (
              <Button type="text" danger icon={<StopOutlined />} onClick={() => openVoid(record)}>
                作废
              </Button>
            ) : null}
            {record.status === 'draft' ? (
              <Popconfirm title="确认删除这个工资批次？" okText="删除" cancelText="取消" onConfirm={() => removeBatch(record.id)}>
                <Button type="text" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [accounts, detail],
  );

  const itemColumns = useMemo<ColumnsType<PayrollItem>>(
    () => [
      { title: '员工', dataIndex: 'employeeName', width: 130, render: (value) => value || '-' },
      { title: '基本工资', dataIndex: 'baseSalaryCents', align: 'right', width: 110, render: (value) => formatYuan(Number(value)) },
      { title: '全勤', dataIndex: 'attendanceBonusCents', align: 'right', width: 100, render: (value) => formatYuan(Number(value)) },
      { title: '话补', dataIndex: 'phoneAllowanceCents', align: 'right', width: 100, render: (value) => formatYuan(Number(value)) },
      { title: '奖金', dataIndex: 'bonusCents', align: 'right', width: 100, render: (value) => formatYuan(Number(value)) },
      { title: '提成', dataIndex: 'commissionCents', align: 'right', width: 100, render: (value) => formatYuan(Number(value)) },
      { title: '扣款', dataIndex: 'deductionCents', align: 'right', width: 100, render: (value) => formatYuan(Number(value)) },
      { title: '社保', dataIndex: 'socialInsuranceCents', align: 'right', width: 100, render: (value) => formatYuan(Number(value)) },
      { title: '公积金', dataIndex: 'housingFundCents', align: 'right', width: 100, render: (value) => formatYuan(Number(value)) },
      { title: '个税', dataIndex: 'taxCents', align: 'right', width: 100, render: (value) => formatYuan(Number(value)) },
      { title: '应发', dataIndex: 'grossSalaryCents', align: 'right', width: 110, render: (value) => formatYuan(Number(value)) },
      { title: '实发', dataIndex: 'netSalaryCents', align: 'right', width: 110, render: (value) => formatYuan(Number(value)) },
      {
        title: '操作',
        key: 'actions',
        width: 170,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Button type="text" icon={<EditOutlined />} disabled={activeBatch?.status === 'voided'} onClick={() => openEditItem(record)}>
              编辑
            </Button>
            <Popconfirm title="确认删除这条工资明细？" okText="删除" cancelText="取消" onConfirm={() => removeItem(record.id)}>
              <Button type="text" danger icon={<DeleteOutlined />} disabled={!['draft', 'confirmed'].includes(activeBatch?.status ?? '')}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [activeBatch],
  );

  const batchDraftTotals = useMemo(() => {
    return batchDraftItems.reduce(
      (totals, item) => {
        const gross =
          item.baseSalaryCents +
          item.attendanceBonusCents +
          item.phoneAllowanceCents +
          item.bonusCents +
          item.commissionCents;
        const net = gross - item.deductionCents;

        return {
          grossCents: totals.grossCents + gross,
          deductionCents: totals.deductionCents + item.deductionCents,
          netCents: totals.netCents + net,
        };
      },
      { grossCents: 0, deductionCents: 0, netCents: 0 },
    );
  }, [batchDraftItems]);

  const batchEntryColumns = useMemo<ColumnsType<BatchDraftItem>>(
    () => [
      { title: '员工', dataIndex: 'employeeName', width: 120, fixed: 'left' },
      { title: '基本工资', dataIndex: 'baseSalaryCents', width: 120, render: (_, record) => renderMoneyInput(record, 'baseSalaryCents', updateBatchDraftItem) },
      { title: '全勤', dataIndex: 'attendanceBonusCents', width: 110, render: (_, record) => renderMoneyInput(record, 'attendanceBonusCents', updateBatchDraftItem) },
      { title: '话补', dataIndex: 'phoneAllowanceCents', width: 110, render: (_, record) => renderMoneyInput(record, 'phoneAllowanceCents', updateBatchDraftItem) },
      { title: '奖金', dataIndex: 'bonusCents', width: 110, render: (_, record) => renderMoneyInput(record, 'bonusCents', updateBatchDraftItem) },
      { title: '提成', dataIndex: 'commissionCents', width: 110, render: (_, record) => renderMoneyInput(record, 'commissionCents', updateBatchDraftItem) },
      { title: '扣款', dataIndex: 'deductionCents', width: 110, render: (_, record) => renderMoneyInput(record, 'deductionCents', updateBatchDraftItem) },
      { title: '社保', dataIndex: 'socialInsuranceCents', width: 110, render: (_, record) => renderMoneyInput(record, 'socialInsuranceCents', updateBatchDraftItem) },
      { title: '公积金', dataIndex: 'housingFundCents', width: 110, render: (_, record) => renderMoneyInput(record, 'housingFundCents', updateBatchDraftItem) },
      { title: '个税', dataIndex: 'taxCents', width: 110, render: (_, record) => renderMoneyInput(record, 'taxCents', updateBatchDraftItem) },
      {
        title: '应发',
        width: 110,
        align: 'right',
        render: (_, record) =>
          formatYuan(
            record.baseSalaryCents +
              record.attendanceBonusCents +
              record.phoneAllowanceCents +
              record.bonusCents +
              record.commissionCents,
          ),
      },
      {
        title: '实发',
        width: 110,
        align: 'right',
        render: (_, record) =>
          formatYuan(
            record.baseSalaryCents +
              record.attendanceBonusCents +
              record.phoneAllowanceCents +
              record.bonusCents +
              record.commissionCents -
              record.deductionCents,
          ),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 180,
        render: (_, record) => (
          <Input
            value={record.remark ?? ''}
            onChange={(event) => updateBatchDraftItem(record.employeeId, 'remark', event.target.value)}
          />
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 90,
        fixed: 'right',
        render: (_, record) => (
          <Button type="text" danger onClick={() => setBatchDraftItems((draftItems) => draftItems.filter((item) => item.employeeId !== record.employeeId))}>
            移除
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <Space direction="vertical" size="middle" className="page-stack">
      {contextHolder}

      <Card>
        <Space direction="vertical" size="middle" className="page-stack">
          <Space className="toolbar" wrap>
            <Space wrap>
              <DatePicker picker="month" value={month} onChange={setMonth} placeholder="选择月份" />
              <Select allowClear placeholder="状态" value={status} options={toOptions(payrollBatchStatusLabels)} style={{ width: 130 }} onChange={setStatus} />
              <Button icon={<ReloadOutlined />} onClick={() => load()}>
                刷新
              </Button>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateBatch}>
              新增工资批次
            </Button>
          </Space>

          <Table<PayrollBatch>
            rowKey="id"
            loading={loading}
            columns={batchColumns}
            dataSource={items}
            pagination={{ pageSize: 50, showTotal: (count) => `共 ${count} 条` }}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Card>

      <Drawer
        title={detail ? `工资详情：${detail.batch.name}` : '工资详情'}
        open={Boolean(detail)}
        width={`calc(100vw - 150px)`}
        onClose={() => {
          setDetail(null);
          setActiveBatch(null);
        }}
      >
        {detail ? (
          <Space direction="vertical" size="middle" className="page-stack">
            <Descriptions bordered size="small" column={3}>
              <Descriptions.Item label="月份">{detail.batch.month}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={payrollStatusColor[detail.batch.status]}>{payrollBatchStatusLabels[detail.batch.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="发放日期">{detail.batch.payDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="应发">{formatYuan(detail.batch.totalGrossCents)}</Descriptions.Item>
              <Descriptions.Item label="扣款">{formatYuan(detail.batch.totalDeductionCents)}</Descriptions.Item>
              <Descriptions.Item label="实发">{formatYuan(detail.batch.totalNetCents)}</Descriptions.Item>
              <Descriptions.Item label="关联流水" span={3}>{detail.batch.paidTransactionId || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={3}>{detail.batch.remark || '-'}</Descriptions.Item>
            </Descriptions>

            <Space className="toolbar" wrap>
              <Typography.Title level={5} style={{ margin: 0 }}>
                工资明细
              </Typography.Title>
              <Button type="primary" icon={<PlusOutlined />} disabled={!['draft', 'confirmed'].includes(detail.batch.status)} onClick={openCreateItem}>
                新增明细
              </Button>
              <Button disabled={!['draft', 'confirmed'].includes(detail.batch.status)} onClick={openBatchEntry}>
                批量录入
              </Button>
            </Space>
            <Table<PayrollItem>
              rowKey="id"
              loading={detailLoading}
              columns={itemColumns}
              dataSource={detail.items}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />

            <Typography.Title level={5} style={{ margin: 0 }}>
              操作记录
            </Typography.Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.logs}
              columns={[
                {
                  title: '时间',
                  dataIndex: 'createdAt',
                  width: 180,
                  render: (value) => dayjs(Number(value)).format('YYYY-MM-DD HH:mm:ss'),
                },
                {
                  title: '动作',
                  dataIndex: 'action',
                  width: 120,
                  render: (value) => payrollOperationActionLabels[String(value)] ?? value,
                },
                { title: '说明', dataIndex: 'detail', render: (value) => value || '-' },
              ]}
            />
          </Space>
        ) : null}
      </Drawer>

      <Modal title={editingBatch ? '编辑工资批次' : '新增工资批次'} open={batchOpen} okText="保存" cancelText="取消" onOk={submitBatch} onCancel={() => setBatchOpen(false)} destroyOnHidden>
        <Form form={batchForm} layout="vertical" preserve={false}>
          <Form.Item name="month" label="工资月份" rules={[{ required: true, message: '请选择工资月份' }]}>
            <DatePicker picker="month" allowClear={false} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="name" label="批次名称" rules={[{ required: true, message: '请输入批次名称' }]}>
            <Input placeholder="例如：2026-07 第一周工资" />
          </Form.Item>
          <Form.Item name="payDate" label="计划发放日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="accountId" label="计划发放账户">
            <Select allowClear options={accounts.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingItem ? '编辑工资明细' : '新增工资明细'}
        open={itemOpen}
        okText="保存"
        cancelText="取消"
        width={780}
        onOk={submitItem}
        onCancel={() => setItemOpen(false)}
        afterOpenChange={(visible) => {
          if (visible) {
            syncItemFormValues();
          }
        }}
        forceRender
        destroyOnHidden
      >
        <Form form={itemForm} layout="vertical" preserve={false} className="payroll-form">
          <div className="payroll-form-grid">
            <Form.Item name="employeeId" label="员工" rules={[{ required: true, message: '请选择员工' }]}>
              <Select options={employees.map((item) => ({ value: item.id, label: item.name }))} disabled={Boolean(editingItem)} />
            </Form.Item>
            <Form.Item name="baseSalaryCents" label="基本工资（元）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="attendanceBonusCents" label="全勤（元）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="phoneAllowanceCents" label="话补（元）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="bonusCents" label="奖金（元）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="commissionCents" label="提成（元）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="deductionCents" label="扣款（元）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="socialInsuranceCents" label="社保（元，仅记录）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="housingFundCents" label="公积金（元，仅记录）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="taxCents" label="个税（元，仅记录）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="批量录入工资明细"
        open={batchEntryOpen}
        width={`calc(100vw - 150px)`}
        onClose={() => setBatchEntryOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setBatchEntryOpen(false)}>取消</Button>
            <Button type="primary" onClick={submitBatchEntry}>
              一次性保存
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" className="page-stack">
          <div className="payroll-employee-tags">
            {employees.map((employee) => {
              const alreadyExists = Boolean(detail?.items.some((item) => item.employeeId === employee.id));
              const selected = batchDraftItems.some((item) => item.employeeId === employee.id);
              return (
                <Tag
                  key={employee.id}
                  color={selected ? 'blue' : alreadyExists ? 'default' : undefined}
                  className={alreadyExists ? 'payroll-employee-tag-disabled' : 'payroll-employee-tag'}
                  onClick={() => toggleBatchEmployee(employee)}
                >
                  {employee.name}
                  {alreadyExists ? ' 已录' : ''}
                </Tag>
              );
            })}
          </div>

          <Space wrap>
            <Tag color="blue">已选 {batchDraftItems.length} 人</Tag>
            <Tag>应发合计 {formatYuan(batchDraftTotals.grossCents)}</Tag>
            <Tag>扣款合计 {formatYuan(batchDraftTotals.deductionCents)}</Tag>
            <Tag color={batchDraftTotals.netCents < 0 ? 'red' : 'green'}>实发合计 {formatYuan(batchDraftTotals.netCents)}</Tag>
          </Space>

          <Table<BatchDraftItem>
            rowKey="employeeId"
            columns={batchEntryColumns}
            dataSource={batchDraftItems}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Drawer>

      <Modal title="发放工资" open={payOpen} okText="确认发放" cancelText="取消" onOk={submitPay} onCancel={() => setPayOpen(false)} destroyOnHidden>
        <Form form={payForm} layout="vertical" preserve={false}>
          <Form.Item name="payDate" label="发放日期" rules={[{ required: true, message: '请选择发放日期' }]}>
            <DatePicker allowClear={false} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="accountId" label="发放账户" rules={[{ required: true, message: '请选择发放账户' }]}>
            <Select options={accounts.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="remark" label="流水备注">
            <Input.TextArea rows={3} placeholder="不填则自动使用工资批次名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="作废工资批次" open={voidOpen} okText="确认作废" cancelText="取消" onOk={submitVoid} onCancel={() => setVoidOpen(false)} destroyOnHidden>
        <Form form={voidForm} layout="vertical" preserve={false}>
          <Form.Item name="reason" label="作废原因" rules={[{ required: true, message: '请输入作废原因' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
