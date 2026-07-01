import { BarChartOutlined } from '@ant-design/icons';
import { Button, Descriptions, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { customerApi, projectApi, type Customer } from '@/renderer/api/masterDataApi';
import { projectStatsApi } from '@/renderer/api/projectStatsApi';
import { useDictionaries } from '@/renderer/hooks/useDictionaries';
import { formatYuan } from '@/renderer/utils/money';
import {
  fundTypeLabels,
  projectStatusLabels,
  projectTypeLabels,
  receiptStatusLabels,
  transactionDirectionLabels,
  transactionStatusLabels,
} from '@/renderer/utils/labels';
import type { ProjectStatsDetail, ProjectStatsListItem } from '@/shared/types/projectStats';
import type { TransactionListItem } from '@/shared/types/transaction';

export function ProjectsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, ProjectStatsListItem>>({});
  const [detail, setDetail] = useState<ProjectStatsDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const dictionaries = useDictionaries(['project_status', 'project_type']);
  const statusLabels = dictionaries.labels('project_status', projectStatusLabels);
  const typeLabels = dictionaries.labels('project_type', projectTypeLabels);

  async function loadStats() {
    const result = await projectStatsApi.list();
    const nextStatsMap = Object.fromEntries(result.map((item) => [item.id, item]));
    setStatsMap(nextStatsMap);
    return nextStatsMap;
  }

  useEffect(() => {
    void Promise.all([customerApi.list({ page: 1, pageSize: 100 }), projectStatsApi.list()])
      .then(([customerResult, statsResult]) => {
        setCustomers(customerResult.items);
        setStatsMap(Object.fromEntries(statsResult.map((item) => [item.id, item])));
      })
      .catch((error) => {
        messageApi.error(error instanceof Error ? error.message : '项目数据加载失败');
      });
  }, []);

  async function openDetail(projectId: string) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      setDetail(await projectStatsApi.detail(projectId));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '项目详情加载失败');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  function getStats(projectId: string) {
    return statsMap[projectId]?.stats;
  }

  return (
    <>
      {contextHolder}
      <MasterDataPage<ProjectStatsListItem>
        title="项目"
        api={{
          list: async (query) => {
            const result = await projectApi.list(query);
            const nextStatsMap = await loadStats();
            return {
              ...result,
              items: result.items.map((item) => ({
                ...item,
                stats: nextStatsMap[item.id]?.stats ?? {
                  projectId: item.id,
                  contractAmountCents: 0,
                  receivedCents: 0,
                  expenseCents: 0,
                  receivableCents: 0,
                  currentProfitCents: 0,
                  expectedProfitCents: 0,
                  receiptStatus: 'not_started',
                },
              })),
            };
          },
          create: projectApi.create as any,
          update: projectApi.update as any,
          remove: projectApi.remove,
        }}
        columns={[
          { title: '项目名称', dataIndex: 'name', width: 180 },
          { title: '所属客户', dataIndex: 'customerName', width: 140 },
          { title: '小区', dataIndex: 'community', width: 140 },
          {
            title: '合同金额',
            width: 120,
            align: 'right',
            render: (_, record) => formatYuan(getStats(record.id)?.contractAmountCents ?? 0),
          },
          {
            title: '已收款',
            width: 120,
            align: 'right',
            render: (_, record) => formatYuan(getStats(record.id)?.receivedCents ?? 0),
          },
          {
            title: '已支出',
            width: 120,
            align: 'right',
            render: (_, record) => formatYuan(getStats(record.id)?.expenseCents ?? 0),
          },
          {
            title: '应收款',
            width: 120,
            align: 'right',
            render: (_, record) => formatYuan(getStats(record.id)?.receivableCents ?? 0),
          },
          {
            title: '当前毛利',
            width: 120,
            align: 'right',
            render: (_, record) => formatYuan(getStats(record.id)?.currentProfitCents ?? 0),
          },
          {
            title: '预计毛利',
            width: 120,
            align: 'right',
            render: (_, record) => formatYuan(getStats(record.id)?.expectedProfitCents ?? 0),
          },
          {
            title: '收款状态',
            width: 110,
            render: (_, record) => <Tag>{receiptStatusLabels[getStats(record.id)?.receiptStatus ?? 'not_started']}</Tag>,
          },
          {
            title: '项目类型',
            dataIndex: 'projectType',
            width: 100,
            render: (value) => (value ? typeLabels[String(value)] : '-'),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (value) => <Tag>{statusLabels[String(value)] ?? value}</Tag>,
          },
        ]}
        rowActions={(record) => (
          <Button type="text" icon={<BarChartOutlined />} onClick={() => openDetail(record.id)}>
            统计
          </Button>
        )}
        fields={[
          {
            name: 'customerId',
            label: '所属客户',
            required: true,
            render: <Select showSearch optionFilterProp="label" options={customers.map((customer) => ({ value: customer.id, label: customer.name }))} />,
          },
          { name: 'name', label: '项目名称', required: true, render: <Input /> },
          { name: 'community', label: '小区名称', render: <Input /> },
          { name: 'address', label: '施工地址', render: <Input /> },
          { name: 'projectType', label: '项目类型', render: <Select allowClear options={dictionaries.options('project_type', projectTypeLabels)} /> },
          { name: 'status', label: '项目状态', required: true, render: <Select options={dictionaries.options('project_status', projectStatusLabels)} /> },
          { name: 'remark', label: '备注', render: <Input.TextArea rows={3} /> },
        ]}
        normalizeBeforeSubmit={(values) => ({
          status: 'pending',
          ...values,
        })}
      />

      <Modal title="项目统计详情" open={detailOpen} footer={null} onCancel={() => setDetailOpen(false)} width={980} destroyOnHidden>
        {detail ? (
          <Space direction="vertical" size="middle" className="page-stack">
            <Descriptions bordered size="small" column={3}>
              <Descriptions.Item label="项目">{detail.project.name}</Descriptions.Item>
              <Descriptions.Item label="客户">{detail.project.customerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusLabels[detail.project.status]}</Descriptions.Item>
              <Descriptions.Item label="合同金额">{formatYuan(detail.stats.contractAmountCents)}</Descriptions.Item>
              <Descriptions.Item label="已收款">{formatYuan(detail.stats.receivedCents)}</Descriptions.Item>
              <Descriptions.Item label="已支出">{formatYuan(detail.stats.expenseCents)}</Descriptions.Item>
              <Descriptions.Item label="应收款">{formatYuan(detail.stats.receivableCents)}</Descriptions.Item>
              <Descriptions.Item label="当前毛利">{formatYuan(detail.stats.currentProfitCents)}</Descriptions.Item>
              <Descriptions.Item label="预计毛利">{formatYuan(detail.stats.expectedProfitCents)}</Descriptions.Item>
            </Descriptions>

            <Table
              size="small"
              rowKey="id"
              title={() => '合同列表'}
              dataSource={detail.contracts}
              pagination={false}
              columns={[
                { title: '合同名称', dataIndex: 'name' },
                { title: '合同编号', dataIndex: 'contractNo', render: (value) => value || '-' },
                { title: '金额', dataIndex: 'amountCents', align: 'right', render: (value) => formatYuan(Number(value)) },
                { title: '签约日期', dataIndex: 'signedDate', render: (value) => value || '-' },
                { title: '状态', dataIndex: 'status' },
              ]}
            />

            <Table<TransactionListItem>
              size="small"
              rowKey="id"
              title={() => '相关流水'}
              dataSource={detail.transactions}
              pagination={{ pageSize: 5 }}
              loading={detailLoading}
              columns={transactionColumns}
            />
          </Space>
        ) : null}
      </Modal>
    </>
  );
}

const transactionColumns: ColumnsType<TransactionListItem> = [
  { title: '日期', dataIndex: 'occurredDate', width: 110 },
  { title: '方向', dataIndex: 'direction', width: 80, render: (value) => transactionDirectionLabels[String(value)] },
  { title: '金额', dataIndex: 'amountCents', width: 110, align: 'right', render: (value) => formatYuan(Number(value)) },
  { title: '账户', dataIndex: 'accountName', width: 120 },
  { title: '分类', dataIndex: 'categoryName', width: 120 },
  { title: '资金性质', dataIndex: 'fundType', width: 120, render: (value) => fundTypeLabels[String(value)] },
  { title: '状态', dataIndex: 'status', width: 90, render: (value) => transactionStatusLabels[String(value)] },
];
