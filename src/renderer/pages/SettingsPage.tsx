import { CloudDownloadOutlined, FileExcelOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Descriptions, Input, Select, Space, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { categoryApi, type Category } from '@/renderer/api/masterDataApi';
import { maintenanceApi } from '@/renderer/api/maintenanceApi';
import { categoryStatusLabels, categoryTypeLabels, fundTypeLabels, toOptions } from '@/renderer/utils/labels';
import type { MaintenanceInfo } from '@/shared/types/maintenance';

export function SettingsPage() {
  const [info, setInfo] = useState<MaintenanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  async function loadInfo() {
    try {
      setInfo(await maintenanceApi.info());
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '系统信息加载失败');
    }
  }

  async function handleBackup() {
    try {
      setLoading(true);
      const result = await maintenanceApi.backupDatabase();
      messageApi.success(`备份完成：${result.backupPath}`);
      await loadInfo();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '备份失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      setLoading(true);
      const result = await maintenanceApi.exportExcel();
      messageApi.success(`导出完成：${result.exportPath}`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInfo();
  }, []);

  return (
    <Space direction="vertical" size="middle" className="page-stack">
      {contextHolder}

      <Card>
        <Space direction="vertical" size="middle" className="page-stack">
          <Space className="toolbar" wrap>
            <Typography.Title level={4} style={{ margin: 0 }}>
              数据备份与导出
            </Typography.Title>
            <Button icon={<ReloadOutlined />} onClick={loadInfo}>
              刷新路径
            </Button>
            <Button type="primary" icon={<CloudDownloadOutlined />} loading={loading} onClick={handleBackup}>
              备份数据库
            </Button>
            <Button icon={<FileExcelOutlined />} loading={loading} onClick={handleExport}>
              导出 Excel
            </Button>
          </Space>

          {info ? (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="数据库文件">{info.databasePath}</Descriptions.Item>
              <Descriptions.Item label="备份目录">{info.backupDir}</Descriptions.Item>
              <Descriptions.Item label="导出目录">{info.exportDir}</Descriptions.Item>
            </Descriptions>
          ) : null}

          <Alert
            type="warning"
            showIcon
            message="恢复数据库暂未开放自动操作"
            description={info?.restoreNote ?? '恢复数据库需要替换当前 SQLite 文件并重启应用，后续会单独做安全确认流程。'}
          />
        </Space>
      </Card>

      <MasterDataPage<Category>
        title="收支分类"
        api={categoryApi}
        columns={[
          { title: '分类名称', dataIndex: 'name', width: 160 },
          { title: '类型', dataIndex: 'type', width: 100, render: (value) => categoryTypeLabels[String(value)] ?? value },
          { title: '资金性质', dataIndex: 'fundType', width: 150, render: (value) => (value ? fundTypeLabels[String(value)] : '-') },
          {
            title: '影响应收',
            dataIndex: 'affectsReceivable',
            width: 100,
            render: (value) => (value ? <Tag color="blue">是</Tag> : '否'),
          },
          {
            title: '影响利润',
            dataIndex: 'affectsProjectProfit',
            width: 100,
            render: (value) => (value ? <Tag color="green">是</Tag> : '否'),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (value) => <Tag>{categoryStatusLabels[String(value)] ?? value}</Tag>,
          },
        ]}
        fields={[
          { name: 'name', label: '分类名称', required: true, render: <Input /> },
          { name: 'type', label: '分类类型', required: true, render: <Select options={toOptions(categoryTypeLabels)} /> },
          { name: 'fundType', label: '资金性质', render: <Select allowClear options={toOptions(fundTypeLabels)} /> },
          { name: 'affectsReceivable', label: '影响应收', valuePropName: 'checked', render: <Checkbox /> },
          { name: 'affectsProjectProfit', label: '影响项目利润', valuePropName: 'checked', render: <Checkbox /> },
          { name: 'sortOrder', label: '排序', render: <Input /> },
          { name: 'status', label: '分类状态', required: true, render: <Select options={toOptions(categoryStatusLabels)} /> },
          { name: 'remark', label: '备注', render: <Input.TextArea rows={3} /> },
        ]}
        normalizeBeforeSubmit={(values) => ({
          status: 'active',
          ...values,
          sortOrder: Number(values.sortOrder ?? 0),
          affectsReceivable: Boolean(values.affectsReceivable),
          affectsProjectProfit: Boolean(values.affectsProjectProfit),
        })}
      />
    </Space>
  );
}
