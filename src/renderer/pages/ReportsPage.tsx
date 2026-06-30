import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table, Tabs, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { reportApi } from '@/renderer/api/reportApi';
import { formatYuan } from '@/renderer/utils/money';
import type {
  AccountBalanceReportItem,
  CustomerReceivableReportItem,
  MonthlyIncomeExpenseItem,
  ProjectProfitReportItem,
  ReportBundle,
} from '@/shared/types/report';

export function ReportsPage() {
  const [month, setMonth] = useState(dayjs());
  const [report, setReport] = useState<ReportBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  async function load(nextMonth = month) {
    try {
      setLoading(true);
      setReport(await reportApi.get({ month: nextMonth.format('YYYY-MM') }));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '报表加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(month);
  }, []);

  return (
    <Space direction="vertical" size="middle" className="page-stack">
      {contextHolder}

      <Card>
        <Space className="toolbar" wrap>
          <DatePicker
            picker="month"
            value={month}
            onChange={(value) => {
              const nextMonth = value ?? dayjs();
              setMonth(nextMonth);
              void load(nextMonth);
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => load()}>
            刷新
          </Button>
        </Space>
      </Card>

      {report ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title={`${report.dashboard.month} 收入`} value={formatYuan(report.dashboard.monthIncomeCents)} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title={`${report.dashboard.month} 支出`} value={formatYuan(report.dashboard.monthExpenseCents)} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="账户总余额" value={formatYuan(report.dashboard.accountBalanceCents)} />
              </Card>
            </Col>
          </Row>

          <Card>
            <Tabs
              items={[
                {
                  key: 'monthly',
                  label: '月度收支表',
                  children: (
                    <Table<MonthlyIncomeExpenseItem>
                      rowKey="month"
                      loading={loading}
                      dataSource={report.monthlyIncomeExpense}
                      columns={monthlyColumns}
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'project-profit',
                  label: '项目利润表',
                  children: (
                    <Table<ProjectProfitReportItem>
                      rowKey="projectId"
                      loading={loading}
                      dataSource={report.projectProfit}
                      columns={projectProfitColumns}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 'max-content' }}
                    />
                  ),
                },
                {
                  key: 'customer-receivable',
                  label: '客户应收表',
                  children: (
                    <Table<CustomerReceivableReportItem>
                      rowKey="customerId"
                      loading={loading}
                      dataSource={report.customerReceivable}
                      columns={customerReceivableColumns}
                      pagination={{ pageSize: 10 }}
                    />
                  ),
                },
                {
                  key: 'account-balance',
                  label: '账户余额表',
                  children: (
                    <Table<AccountBalanceReportItem>
                      rowKey="accountId"
                      loading={loading}
                      dataSource={report.accountBalance}
                      columns={accountBalanceColumns}
                      pagination={false}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </>
      ) : null}
    </Space>
  );
}

const moneyColumn = {
  align: 'right' as const,
  render: (value: number) => formatYuan(value),
};

const monthlyColumns: ColumnsType<MonthlyIncomeExpenseItem> = [
  { title: '月份', dataIndex: 'month' },
  { title: '收入', dataIndex: 'incomeCents', ...moneyColumn },
  { title: '支出', dataIndex: 'expenseCents', ...moneyColumn },
  { title: '收支差额', dataIndex: 'profitCents', ...moneyColumn },
];

const projectProfitColumns: ColumnsType<ProjectProfitReportItem> = [
  { title: '项目', dataIndex: 'projectName', width: 180 },
  { title: '客户', dataIndex: 'customerName', width: 140, render: (value) => value || '-' },
  { title: '合同金额', dataIndex: 'contractAmountCents', width: 120, ...moneyColumn },
  { title: '已收款', dataIndex: 'receivedCents', width: 120, ...moneyColumn },
  { title: '已支出', dataIndex: 'expenseCents', width: 120, ...moneyColumn },
  { title: '应收款', dataIndex: 'receivableCents', width: 120, ...moneyColumn },
  { title: '当前毛利', dataIndex: 'currentProfitCents', width: 120, ...moneyColumn },
  { title: '预计毛利', dataIndex: 'expectedProfitCents', width: 120, ...moneyColumn },
];

const customerReceivableColumns: ColumnsType<CustomerReceivableReportItem> = [
  { title: '客户', dataIndex: 'customerName' },
  { title: '合同金额', dataIndex: 'contractAmountCents', ...moneyColumn },
  { title: '已收款', dataIndex: 'receivedCents', ...moneyColumn },
  { title: '应收款', dataIndex: 'receivableCents', ...moneyColumn },
];

const accountBalanceColumns: ColumnsType<AccountBalanceReportItem> = [
  { title: '账户', dataIndex: 'accountName' },
  { title: '期初余额', dataIndex: 'openingBalanceCents', ...moneyColumn },
  { title: '收入', dataIndex: 'incomeCents', ...moneyColumn },
  { title: '支出', dataIndex: 'expenseCents', ...moneyColumn },
  { title: '当前余额', dataIndex: 'balanceCents', ...moneyColumn },
];
