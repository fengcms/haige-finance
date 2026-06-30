import { Alert, Card, Col, Descriptions, Row, Space, Statistic, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { pingApp } from '@/renderer/api/appApi';
import { reportApi } from '@/renderer/api/reportApi';
import { formatYuan } from '@/renderer/utils/money';
import type { PingResult } from '@/shared/types/app';
import type { DashboardReport } from '@/shared/types/report';

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardReport | null>(null);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  async function load() {
    try {
      setLoading(true);
      const [reportResult, ping] = await Promise.all([reportApi.get(), pingApp()]);
      setDashboard(reportResult.dashboard);
      setPingResult(ping);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '仪表盘加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Space direction="vertical" size="middle" className="page-stack">
      {contextHolder}

      <Card loading={loading}>
        <Typography.Title level={3}>首页仪表盘</Typography.Title>
        <Typography.Paragraph type="secondary">查看本月经营概览、账户余额和项目应收情况。</Typography.Paragraph>
      </Card>

      {dashboard ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title={`${dashboard.month} 收入`} value={formatYuan(dashboard.monthIncomeCents)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title={`${dashboard.month} 支出`} value={formatYuan(dashboard.monthExpenseCents)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title={`${dashboard.month} 收支差额`} value={formatYuan(dashboard.monthProfitCents)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title="账户总余额" value={formatYuan(dashboard.accountBalanceCents)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title="项目应收合计" value={formatYuan(dashboard.projectReceivableCents)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title="项目预计毛利合计" value={formatYuan(dashboard.expectedProfitCents)} />
            </Card>
          </Col>
        </Row>
      ) : (
        <Alert type="info" showIcon message="暂无仪表盘数据" />
      )}

      {pingResult ? (
        <Card title="本地数据库状态">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="SQLite 状态">{pingResult.database.ok ? '正常' : '异常'}</Descriptions.Item>
            <Descriptions.Item label="数据库文件">{pingResult.database.path}</Descriptions.Item>
            <Descriptions.Item label="服务时间">{pingResult.timestamp}</Descriptions.Item>
          </Descriptions>
        </Card>
      ) : null}
    </Space>
  );
}
