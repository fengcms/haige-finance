import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Empty, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supplierAnalysisApi } from '@/renderer/api/supplierAnalysisApi';
import { supplierApi } from '@/renderer/api/masterDataApi';
import { projectStatsApi } from '@/renderer/api/projectStatsApi';
import { useDefaultPageSize } from '@/renderer/hooks/useDefaultPageSize';
import { formatYuan } from '@/renderer/utils/money';
import { projectExpenseTypeLabels, toOptions } from '@/renderer/utils/labels';
import { pageSizeOptions } from '@/shared/constants/pagination';
import type { Supplier } from '@/shared/types/supplier';
import type { ProjectStatsListItem } from '@/shared/types/projectStats';
import type {
  SupplierAnalysisBundle,
  SupplierAnalysisQuery,
  SupplierExpenseDetailItem,
} from '@/shared/types/supplierAnalysis';

const { RangePicker } = DatePicker;

const chartColors = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2', '#fa541c', '#2f54eb'];

export function SupplierAnalysisPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<ProjectStatsListItem[]>([]);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [supplierId, setSupplierId] = useState<string>();
  const [projectId, setProjectId] = useState<string>();
  const [expenseType, setExpenseType] = useState<string>();
  const [analysis, setAnalysis] = useState<SupplierAnalysisBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const defaultTablePageSize = useDefaultPageSize();

  const query = useMemo<SupplierAnalysisQuery>(
    () => ({
      startDate: range[0].format('YYYY-MM-DD'),
      endDate: range[1].format('YYYY-MM-DD'),
      supplierId,
      projectId,
      expenseType: expenseType as SupplierAnalysisQuery['expenseType'],
    }),
    [range, supplierId, projectId, expenseType],
  );

  async function loadBaseData() {
    const [supplierResult, projectResult] = await Promise.all([
      supplierApi.list({ page: 1, pageSize: 100 }),
      projectStatsApi.list(),
    ]);
    setSuppliers(supplierResult.items);
    setProjects(projectResult);
  }

  async function loadAnalysis(nextQuery = query) {
    try {
      setLoading(true);
      setAnalysis(await supplierAnalysisApi.get(nextQuery));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '供应商费用分析加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBaseData().catch((error) => {
      messageApi.error(error instanceof Error ? error.message : '基础数据加载失败');
    });
    void loadAnalysis();
  }, []);

  function handleRefresh() {
    void loadAnalysis();
  }

  function handleRangeChange(values: null | [Dayjs | null, Dayjs | null]) {
    const nextRange: [Dayjs, Dayjs] = [values?.[0] ?? dayjs().startOf('month'), values?.[1] ?? dayjs().endOf('month')];
    setRange(nextRange);
    void loadAnalysis({
      ...query,
      startDate: nextRange[0].format('YYYY-MM-DD'),
      endDate: nextRange[1].format('YYYY-MM-DD'),
    });
  }

  function updateFilter(next: Partial<SupplierAnalysisQuery>) {
    const nextQuery = { ...query, ...next };
    if (!nextQuery.supplierId) delete nextQuery.supplierId;
    if (!nextQuery.projectId) delete nextQuery.projectId;
    if (!nextQuery.expenseType) delete nextQuery.expenseType;
    void loadAnalysis(nextQuery);
  }

  const supplierRankChartData = (analysis?.supplierRank ?? []).map((item) => ({
    name: item.supplierName,
    amountYuan: item.amountCents / 100,
    amountCents: item.amountCents,
  }));

  const trendChartData = (analysis?.trend ?? []).map((item) => ({
    period: item.period,
    amountYuan: item.amountCents / 100,
    amountCents: item.amountCents,
  }));

  const projectChartData = (analysis?.projectDistribution ?? []).map((item) => ({
    name: item.projectName,
    amountYuan: item.amountCents / 100,
    amountCents: item.amountCents,
  }));

  const columns: ColumnsType<SupplierExpenseDetailItem> = [
    { title: '发生日期', dataIndex: 'occurredDate', width: 120 },
    { title: '供应商', dataIndex: 'supplierName', width: 160, render: (value) => value || <Tag>未指定</Tag> },
    { title: '客户', dataIndex: 'customerName', width: 140, render: (value) => value || '-' },
    { title: '项目', dataIndex: 'projectName', width: 180, render: (value) => value || '-' },
    {
      title: '费用分类',
      dataIndex: 'expenseType',
      width: 110,
      render: (value) => projectExpenseTypeLabels[String(value)] ?? value,
    },
    { title: '金额', dataIndex: 'totalAmountCents', width: 120, align: 'right', render: (value) => formatYuan(value) },
    { title: '附件', dataIndex: 'attachmentCount', width: 90, render: (value) => `${value} 张` },
    { title: '备注', dataIndex: 'remark', width: 220, render: (value) => value || '-' },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/project-finance?projectId=${record.projectId}`)}>
          查看项目
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" className="page-stack">
      {contextHolder}

      <Card>
        <Space className="toolbar" wrap>
          <RangePicker value={range} onChange={handleRangeChange} allowClear={false} />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="供应商"
            style={{ width: 180 }}
            value={supplierId}
            options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            onChange={(value) => {
              setSupplierId(value);
              updateFilter({ supplierId: value });
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="项目"
            style={{ width: 220 }}
            value={projectId}
            options={projects.map((project) => ({ value: project.id, label: `${project.name}${project.customerName ? ` / ${project.customerName}` : ''}` }))}
            onChange={(value) => {
              setProjectId(value);
              updateFilter({ projectId: value });
            }}
          />
          <Select
            allowClear
            placeholder="费用分类"
            style={{ width: 140 }}
            value={expenseType}
            options={toOptions(projectExpenseTypeLabels)}
            onChange={(value) => {
              setExpenseType(value);
              updateFilter({ expenseType: value as SupplierAnalysisQuery['expenseType'] });
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="供应商费用总额" value={formatYuan(analysis?.summary.totalAmountCents ?? 0)} suffix="元" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="涉及供应商" value={analysis?.summary.supplierCount ?? 0} suffix="家" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="费用单数量" value={analysis?.summary.orderCount ?? 0} suffix="单" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="平均单笔金额" value={formatYuan(analysis?.summary.averageOrderAmountCents ?? 0)} suffix="元" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <AnalysisChartCard title="供应商费用排行">
            {supplierRankChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={supplierRankChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(_, __, item) => formatYuan((item.payload as { amountCents: number }).amountCents)} />
                  <Bar dataKey="amountYuan" name="费用金额">
                    {supplierRankChartData.map((_, index) => (
                      <Cell key={index} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无供应商费用数据" />
            )}
          </AnalysisChartCard>
        </Col>
        <Col xs={24} xl={12}>
          <AnalysisChartCard title={`费用趋势（按${analysis?.trendGranularity === 'month' ? '月' : '日'}）`}>
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(_, __, item) => formatYuan((item.payload as { amountCents: number }).amountCents)} />
                  <Legend />
                  <Line type="monotone" dataKey="amountYuan" name="费用金额" stroke="#1677ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无趋势数据" />
            )}
          </AnalysisChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <AnalysisChartCard title="项目费用分布">
            {projectChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={projectChartData} dataKey="amountYuan" nameKey="name" outerRadius={100} label>
                    {projectChartData.map((_, index) => (
                      <Cell key={index} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(_, __, item) => formatYuan((item.payload as { amountCents: number }).amountCents)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无项目分布数据" />
            )}
          </AnalysisChartCard>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="费用明细">
            <Table<SupplierExpenseDetailItem>
              rowKey="id"
              loading={loading}
              dataSource={analysis?.details ?? []}
              columns={columns}
              pagination={{
                pageSize: defaultTablePageSize,
                showSizeChanger: true,
                pageSizeOptions: pageSizeOptions.map(String),
                showTotal: (count) => `共 ${count} 条`,
              }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

function AnalysisChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card
      title={
        <Typography.Text strong>
          {title}
        </Typography.Text>
      }
    >
      {children}
    </Card>
  );
}
