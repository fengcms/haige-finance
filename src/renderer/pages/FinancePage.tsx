import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { accountApi, categoryApi, customerApi, employeeApi, projectApi } from '@/renderer/api/masterDataApi';
import { transactionApi } from '@/renderer/api/transactionApi';
import { formatYuan, parseYuan } from '@/renderer/utils/money';
import {
  fundTypeLabels,
  toOptions,
  transactionDirectionLabels,
  transactionStatusLabels,
} from '@/renderer/utils/labels';
import type { Account } from '@/shared/types/account';
import type { Category } from '@/shared/types/category';
import type { Customer } from '@/shared/types/customer';
import type { Employee } from '@/shared/types/employee';
import type { CustomerProject } from '@/shared/types/project';
import type { AccountBalance, TransactionListItem } from '@/shared/types/transaction';

const { RangePicker } = DatePicker;

export function FinancePage() {
  const [form] = Form.useForm();
  const [voidForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<CustomerProject[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [direction, setDirection] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [open, setOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransactionListItem | null>(null);
  const [voidingItem, setVoidingItem] = useState<TransactionListItem | null>(null);

  async function loadBaseData() {
    const [accountResult, categoryResult, customerResult, projectResult, employeeResult] = await Promise.all([
      accountApi.list({ page: 1, pageSize: 100 }),
      categoryApi.list({ page: 1, pageSize: 100 }),
      customerApi.list({ page: 1, pageSize: 100 }),
      projectApi.list({ page: 1, pageSize: 100 }),
      employeeApi.list({ page: 1, pageSize: 100 }),
    ]);

    setAccounts(accountResult.items);
    setCategories(categoryResult.items);
    setCustomers(customerResult.items);
    setProjects(projectResult.items);
    setEmployees(employeeResult.items);
  }

  async function load() {
    try {
      setLoading(true);
      const [listResult, balanceResult] = await Promise.all([
        transactionApi.list({
          keyword,
          direction: direction as any,
          status: status as any,
          startDate: dateRange?.[0].format('YYYY-MM-DD'),
          endDate: dateRange?.[1].format('YYYY-MM-DD'),
          page: 1,
          pageSize: 100,
        }),
        transactionApi.accountBalances(),
      ]);
      setItems(listResult.items);
      setTotal(listResult.total);
      setBalances(balanceResult);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
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

  function handleCreate() {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      direction: 'income',
      occurredDate: dayjs(),
      isCompanyFund: true,
      affectsReceivable: false,
      affectsProjectProfit: false,
    });
    setOpen(true);
  }

  function handleEdit(item: TransactionListItem) {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      amountYuan: item.amountCents / 100,
      occurredDate: dayjs(item.occurredDate),
    });
    setOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const input = {
      ...values,
      occurredDate: values.occurredDate.format('YYYY-MM-DD'),
      amountCents: parseYuan(values.amountYuan),
    };
    delete input.amountYuan;

    try {
      if (editingItem) {
        await transactionApi.update(editingItem.id, input);
        messageApi.success('流水已保存');
      } else {
        await transactionApi.create(input);
        messageApi.success('流水已新增');
      }

      setOpen(false);
      setEditingItem(null);
      form.resetFields();
      await load();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '保存失败');
    }
  }

  function handleCategoryChange(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    form.setFieldsValue({
      direction: category.type,
      fundType: category.fundType,
      affectsReceivable: category.affectsReceivable,
      affectsProjectProfit: category.affectsProjectProfit,
    });
  }

  function openVoidModal(item: TransactionListItem) {
    setVoidingItem(item);
    voidForm.resetFields();
    setVoidOpen(true);
  }

  async function handleVoid() {
    if (!voidingItem) {
      return;
    }

    const values = await voidForm.validateFields();
    try {
      await transactionApi.void(voidingItem.id, values.reason);
      messageApi.success('流水已作废');
      setVoidOpen(false);
      setVoidingItem(null);
      await load();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '作废失败');
    }
  }

  async function handleDelete(id: string) {
    try {
      await transactionApi.remove(id);
      messageApi.success('流水已删除');
      await load();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '删除失败');
    }
  }

  const columns = useMemo<ColumnsType<TransactionListItem>>(
    () => [
      { title: '日期', dataIndex: 'occurredDate', width: 120 },
      {
        title: '方向',
        dataIndex: 'direction',
        width: 90,
        render: (value) => <Tag color={value === 'income' ? 'green' : 'red'}>{transactionDirectionLabels[String(value)]}</Tag>,
      },
      {
        title: '金额',
        dataIndex: 'amountCents',
        width: 120,
        align: 'right',
        render: (value, record) => (
          <span style={{ color: record.direction === 'income' ? '#389e0d' : '#cf1322' }}>{formatYuan(Number(value))}</span>
        ),
      },
      { title: '账户', dataIndex: 'accountName', width: 140 },
      { title: '分类', dataIndex: 'categoryName', width: 140 },
      { title: '资金性质', dataIndex: 'fundType', width: 150, render: (value) => fundTypeLabels[String(value)] },
      { title: '客户', dataIndex: 'customerName', width: 140, render: (value) => value || '-' },
      { title: '项目', dataIndex: 'projectName', width: 160, render: (value) => value || '-' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (value) => <Tag color={value === 'normal' ? 'blue' : 'default'}>{transactionStatusLabels[String(value)]}</Tag>,
      },
      { title: '备注', dataIndex: 'remark', width: 180, render: (value) => value || '-' },
      {
        title: '操作',
        key: 'actions',
        width: 210,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Button type="text" icon={<EditOutlined />} disabled={record.status !== 'normal'} onClick={() => handleEdit(record)}>
              编辑
            </Button>
            <Button type="text" danger icon={<StopOutlined />} disabled={record.status !== 'normal'} onClick={() => openVoidModal(record)}>
              作废
            </Button>
            <Popconfirm title="确认删除这笔流水？" okText="删除" cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" danger icon={<DeleteOutlined />}>
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

      <Space wrap>
        {balances.map((item) => (
          <Card key={item.accountId} size="small" title={item.accountName} style={{ width: 210 }}>
            <div>当前余额：{formatYuan(item.balanceCents)}</div>
            <div style={{ color: '#8c8c8c' }}>收入 {formatYuan(item.incomeCents)} / 支出 {formatYuan(item.expenseCents)}</div>
          </Card>
        ))}
      </Space>

      <Card>
        <Space direction="vertical" size="middle" className="page-stack">
          <Space className="toolbar" wrap>
            <Input.Search
              allowClear
              placeholder="搜索流水号、备注、客户、项目"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onSearch={() => load()}
              style={{ width: 280 }}
            />
            <Select allowClear placeholder="方向" value={direction} options={toOptions(transactionDirectionLabels)} style={{ width: 120 }} onChange={setDirection} />
            <Select allowClear placeholder="状态" value={status} options={toOptions(transactionStatusLabels)} style={{ width: 120 }} onChange={setStatus} />
            <RangePicker value={dateRange} onChange={(value) => setDateRange(value as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
            <Button icon={<ReloadOutlined />} onClick={() => load()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增流水
            </Button>
          </Space>

          <Table<TransactionListItem>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={items}
            pagination={{ total, pageSize: 100, showTotal: (count) => `共 ${count} 条` }}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Card>

      <Modal title={editingItem ? '编辑流水' : '新增流水'} open={open} okText="保存" cancelText="取消" onOk={handleSubmit} onCancel={() => setOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="transactionNo" label="流水号">
            <Input placeholder="可选，不填也可以" />
          </Form.Item>
          <Form.Item name="occurredDate" label="发生日期" rules={[{ required: true, message: '请选择发生日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="categoryId" label="收支分类" rules={[{ required: true, message: '请选择收支分类' }]}>
            <Select options={categories.map((item) => ({ value: item.id, label: item.name }))} onChange={handleCategoryChange} />
          </Form.Item>
          <Form.Item name="direction" label="方向" rules={[{ required: true, message: '请选择方向' }]}>
            <Select options={toOptions(transactionDirectionLabels)} />
          </Form.Item>
          <Form.Item name="amountYuan" label="金额（元）" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="accountId" label="账户" rules={[{ required: true, message: '请选择账户' }]}>
            <Select options={accounts.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="fundType" label="资金性质" rules={[{ required: true, message: '请选择资金性质' }]}>
            <Select options={toOptions(fundTypeLabels)} />
          </Form.Item>
          <Form.Item name="customerId" label="关联客户">
            <Select allowClear options={customers.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="projectId" label="关联项目">
            <Select allowClear options={projects.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="employeeId" label="关联员工">
            <Select allowClear options={employees.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item name="isCompanyFund" label="进入公司账户" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="affectsReceivable" label="影响项目应收" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="affectsProjectProfit" label="影响项目利润" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="作废流水" open={voidOpen} okText="确认作废" cancelText="取消" onOk={handleVoid} onCancel={() => setVoidOpen(false)} destroyOnHidden>
        <Form form={voidForm} layout="vertical" preserve={false}>
          <Form.Item name="reason" label="作废原因" rules={[{ required: true, message: '请输入作废原因' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
