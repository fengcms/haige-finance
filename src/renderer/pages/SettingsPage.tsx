import { CloudDownloadOutlined, FileExcelOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Descriptions, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { dictionaryApi } from '@/renderer/api/dictionaryApi';
import { categoryApi, type Category } from '@/renderer/api/masterDataApi';
import { maintenanceApi } from '@/renderer/api/maintenanceApi';
import { categoryStatusLabels, categoryTypeLabels, fundTypeLabels, toOptions } from '@/renderer/utils/labels';
import { dictionaryTypeLabels, dictionaryTypeOptions, type DictionaryType } from '@/shared/constants/dictionaries';
import type { DictionaryItem } from '@/shared/types/dictionary';
import type { MaintenanceInfo } from '@/shared/types/maintenance';

interface DictionaryEditState {
  item: DictionaryItem;
  name: string;
  sortOrder: number;
  status: DictionaryItem['status'];
  remark?: string | null;
}

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

      <Tabs
        items={[
          {
            key: 'backup',
            label: '数据备份',
            children: <BackupPanel info={info} loading={loading} loadInfo={loadInfo} handleBackup={handleBackup} handleExport={handleExport} />,
          },
          {
            key: 'categories',
            label: '收支分类',
            children: <CategorySettings />,
          },
          {
            key: 'dictionaries',
            label: '字典设置',
            children: <DictionarySettings />,
          },
          {
            key: 'system',
            label: '系统信息',
            children: <SystemInfoPanel info={info} loadInfo={loadInfo} />,
          },
        ]}
      />
    </Space>
  );
}

function BackupPanel(props: {
  info: MaintenanceInfo | null;
  loading: boolean;
  loadInfo: () => void;
  handleBackup: () => void;
  handleExport: () => void;
}) {
  return (
    <Card>
      <Space direction="vertical" size="middle" className="page-stack">
        <Space className="toolbar" wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>
            数据备份与导出
          </Typography.Title>
          <Button icon={<ReloadOutlined />} onClick={props.loadInfo}>
            刷新路径
          </Button>
          <Button type="primary" icon={<CloudDownloadOutlined />} loading={props.loading} onClick={props.handleBackup}>
            备份数据库
          </Button>
          <Button icon={<FileExcelOutlined />} loading={props.loading} onClick={props.handleExport}>
            导出 Excel
          </Button>
        </Space>

        {props.info ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="数据库文件">{props.info.databasePath}</Descriptions.Item>
            <Descriptions.Item label="备份目录">{props.info.backupDir}</Descriptions.Item>
            <Descriptions.Item label="导出目录">{props.info.exportDir}</Descriptions.Item>
          </Descriptions>
        ) : null}

        <Alert
          type="warning"
          showIcon
          message="恢复数据库暂未开放自动操作"
          description={props.info?.restoreNote ?? '恢复数据库需要替换当前 SQLite 文件并重启应用，后续会单独做安全确认流程。'}
        />
      </Space>
    </Card>
  );
}

function SystemInfoPanel(props: { info: MaintenanceInfo | null; loadInfo: () => void }) {
  return (
    <Card>
      <Space direction="vertical" size="middle" className="page-stack">
        <Space className="toolbar" wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>
            系统信息
          </Typography.Title>
          <Button icon={<ReloadOutlined />} onClick={props.loadInfo}>
            刷新
          </Button>
        </Space>
        {props.info ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="数据库文件">{props.info.databasePath}</Descriptions.Item>
            <Descriptions.Item label="备份目录">{props.info.backupDir}</Descriptions.Item>
            <Descriptions.Item label="导出目录">{props.info.exportDir}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Space>
    </Card>
  );
}

function CategorySettings() {
  return (
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
  );
}

function DictionarySettings() {
  const [dictType, setDictType] = useState<DictionaryType>('customer_status');
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editState, setEditState] = useState<DictionaryEditState | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  async function loadItems(nextDictType = dictType) {
    try {
      setLoading(true);
      setItems(await dictionaryApi.list({ dictType: nextDictType }));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '字典加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editState) {
      return;
    }

    try {
      setLoading(true);
      await dictionaryApi.update(editState.item.id, {
        name: editState.name,
        sortOrder: editState.sortOrder,
        status: editState.status,
        remark: editState.remark,
      });
      setEditState(null);
      await loadItems();
      messageApi.success('字典项已更新');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '字典保存失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems(dictType);
  }, [dictType]);

  const columns: ColumnsType<DictionaryItem> = [
    { title: '编码', dataIndex: 'code', width: 180 },
    { title: '名称', dataIndex: 'name', width: 180 },
    { title: '排序', dataIndex: 'sortOrder', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value) => <Tag color={value === 'active' ? 'green' : undefined}>{value === 'active' ? '启用' : '停用'}</Tag>,
    },
    { title: '系统项', dataIndex: 'isSystem', width: 90, render: (value) => (value ? '是' : '否') },
    { title: '备注', dataIndex: 'remark', width: 220, render: (value) => value || '-' },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() =>
            setEditState({
              item: record,
              name: record.name,
              sortOrder: record.sortOrder,
              status: record.status,
              remark: record.remark,
            })
          }
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <Card>
      {contextHolder}
      <Space direction="vertical" size="middle" className="page-stack">
        <Space className="toolbar" wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>
            字典设置
          </Typography.Title>
          <Select
            value={dictType}
            style={{ width: 180 }}
            options={dictionaryTypeOptions.map((value) => ({ value, label: dictionaryTypeLabels[value] }))}
            onChange={setDictType}
          />
          <Button icon={<ReloadOutlined />} onClick={() => loadItems()} loading={loading}>
            刷新
          </Button>
        </Space>

        <Alert
          type="info"
          showIcon
          message="当前字典只允许修改显示名称、排序和启停"
          description="底层编码由系统用于校验和历史数据关联，本阶段不开放新增、删除或修改编码。资金性质、流水方向、流水状态等报表相关字段暂不纳入字典管理。"
        />

        <Table<DictionaryItem> rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={false} />
      </Space>

      <Modal
        title="编辑字典项"
        open={Boolean(editState)}
        okText="保存"
        cancelText="取消"
        confirmLoading={loading}
        onOk={handleSave}
        onCancel={() => setEditState(null)}
      >
        <Space direction="vertical" size="middle" className="page-stack">
          <Input addonBefore="编码" value={editState?.item.code ?? ''} disabled />
          <Input
            addonBefore="名称"
            value={editState?.name ?? ''}
            maxLength={100}
            onChange={(event) => setEditState((current) => (current ? { ...current, name: event.target.value } : current))}
          />
          <InputNumber
            addonBefore="排序"
            min={0}
            precision={0}
            value={editState?.sortOrder ?? 0}
            style={{ width: '100%' }}
            onChange={(value) => setEditState((current) => (current ? { ...current, sortOrder: Number(value ?? 0) } : current))}
          />
          <Select
            value={editState?.status}
            options={[
              { value: 'active', label: '启用' },
              { value: 'inactive', label: '停用' },
            ]}
            onChange={(value) => setEditState((current) => (current ? { ...current, status: value } : current))}
          />
          <Input.TextArea
            rows={3}
            placeholder="备注"
            value={editState?.remark ?? ''}
            onChange={(event) => setEditState((current) => (current ? { ...current, remark: event.target.value } : current))}
          />
        </Space>
      </Modal>
    </Card>
  );
}
