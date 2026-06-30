import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Space, Typography } from 'antd';
import { pingApp } from '@/renderer/api/appApi';
import type { PingResult } from '@/shared/types/app';

export function DashboardPage() {
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePing() {
    try {
      setError(null);
      setPingResult(await pingApp());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'IPC 调用失败');
    }
  }

  useEffect(() => {
    void handlePing();
  }, []);

  return (
    <Space direction="vertical" size="middle" className="page-stack">
      <Card>
        <Typography.Title level={3}>首页仪表盘</Typography.Title>
        <Typography.Paragraph type="secondary">
          第一阶段用于验证 Electron、IPC 与 SQLite 初始化是否正常。
        </Typography.Paragraph>
        <Button type="primary" onClick={handlePing}>
          测试 IPC 与数据库
        </Button>
      </Card>

      {error && <Alert type="error" showIcon message="测试失败" description={error} />}

      {pingResult && (
        <Card title="app:ping 测试结果">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="返回消息">{pingResult.message}</Descriptions.Item>
            <Descriptions.Item label="应用名称">{pingResult.appName}</Descriptions.Item>
            <Descriptions.Item label="服务时间">{pingResult.timestamp}</Descriptions.Item>
            <Descriptions.Item label="SQLite 状态">
              {pingResult.database.ok ? '正常' : '异常'}
            </Descriptions.Item>
            <Descriptions.Item label="数据库文件">{pingResult.database.path}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  );
}
