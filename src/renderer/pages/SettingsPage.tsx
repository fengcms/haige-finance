import { CloudDownloadOutlined, FileExcelOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { authApi } from '@/renderer/api/authApi';
import { dictionaryApi } from '@/renderer/api/dictionaryApi';
import { categoryApi, type Category } from '@/renderer/api/masterDataApi';
import { maintenanceApi } from '@/renderer/api/maintenanceApi';
import { settingsApi } from '@/renderer/api/settingsApi';
import { categoryStatusLabels, categoryTypeLabels, fundTypeLabels, toOptions } from '@/renderer/utils/labels';
import { pageSizeOptions, type PageSizeOption } from '@/shared/constants/pagination';
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

  async function handlePasswordChanged() {
    messageApi.success('密码已修改，请重新登录');
    window.location.reload();
  }

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

  async function handleRestore() {
    Modal.confirm({
      title: '确认恢复数据库？',
      content: '恢复会替换当前账本。系统会先自动备份当前数据库；恢复成功后建议重启应用。',
      okText: '选择文件并恢复',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          setLoading(true);
          const result = await maintenanceApi.restoreDatabase();
          if (result) {
            messageApi.success(result.message);
            await loadInfo();
          }
        } catch (error) {
          messageApi.error(error instanceof Error ? error.message : '恢复失败');
        } finally {
          setLoading(false);
        }
      },
    });
  }

  async function handleUndoRestore() {
    try {
      setLoading(true);
      const result = await maintenanceApi.undoLastRestore();
      messageApi.success(result.message);
      await loadInfo();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '撤销恢复失败');
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
            children: (
              <BackupPanel
                info={info}
                loading={loading}
                loadInfo={loadInfo}
                handleBackup={handleBackup}
                handleExport={handleExport}
                handleRestore={handleRestore}
                handleUndoRestore={handleUndoRestore}
              />
            ),
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
          {
            key: 'ui',
            label: '界面设置',
            children: <UiSettings />,
          },
          {
            key: 'security',
            label: '安全设置',
            children: <SecuritySettings onPasswordChanged={handlePasswordChanged} />,
          },
        ]}
      />
    </Space>
  );
}

function UiSettings() {
  const [defaultPageSize, setDefaultPageSize] = useState<PageSizeOption>(20);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  async function loadSettings() {
    try {
      setLoading(true);
      const settings = await settingsApi.get();
      setDefaultPageSize(settings.defaultPageSize);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '界面设置加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setLoading(true);
      const settings = await settingsApi.update({ defaultPageSize });
      setDefaultPageSize(settings.defaultPageSize);
      messageApi.success('界面设置已保存');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '界面设置保存失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <Card>
      {contextHolder}
      <Space direction="vertical" size="middle" className="page-stack">
        <Typography.Title level={4} style={{ margin: 0 }}>
          界面设置
        </Typography.Title>
        <Alert
          type="info"
          showIcon
          message="默认每页条数会影响主要列表"
          description="保存后，新打开或刷新后的客户、项目、合同、员工、供应商、账户、分类和财务流水列表会使用该默认值。表格右下角仍可临时切换每页条数。"
        />
        <Form layout="vertical" style={{ maxWidth: 360 }}>
          <Form.Item label="默认每页条数">
            <Select
              value={defaultPageSize}
              options={pageSizeOptions.map((value) => ({ value, label: `${value} 条 / 页` }))}
              onChange={setDefaultPageSize}
            />
          </Form.Item>
          <Space>
            <Button onClick={loadSettings} loading={loading}>
              重新加载
            </Button>
            <Button type="primary" onClick={saveSettings} loading={loading}>
              保存设置
            </Button>
          </Space>
        </Form>
      </Space>
    </Card>
  );
}

function SecuritySettings({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  async function handleSubmit() {
    const values = await form.validateFields();
    try {
      setLoading(true);
      await authApi.changePassword(values);
      form.resetFields();
      onPasswordChanged();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '密码修改失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      {contextHolder}
      <Space direction="vertical" size="middle" className="page-stack">
        <Typography.Title level={4} style={{ margin: 0 }}>
          安全设置
        </Typography.Title>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="当前用户">admin（本地管理员）</Descriptions.Item>
        </Descriptions>
        <Alert
          type="info"
          showIcon
          message="本功能用于防止他人直接打开软件操作"
          description="密码只保护应用入口，不加密 SQLite 数据库文件。忘记密码时需要按重置说明处理。"
        />
        <Form form={form} layout="vertical" style={{ maxWidth: 420 }}>
          <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认新密码" rules={[{ required: true, message: '请再次输入新密码' }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            修改密码
          </Button>
        </Form>
      </Space>
    </Card>
  );
}

function BackupPanel(props: {
  info: MaintenanceInfo | null;
  loading: boolean;
  loadInfo: () => void;
  handleBackup: () => void;
  handleExport: () => void;
  handleRestore: () => void;
  handleUndoRestore: () => void;
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
          <Button danger loading={props.loading} onClick={props.handleRestore}>
            恢复数据库
          </Button>
          <Popconfirm
            title="确认撤销最近一次恢复？"
            okText="撤销恢复"
            cancelText="取消"
            disabled={!props.info?.lastRestore}
            onConfirm={props.handleUndoRestore}
          >
            <Button danger ghost loading={props.loading} disabled={!props.info?.lastRestore}>
              撤销最近一次恢复
            </Button>
          </Popconfirm>
        </Space>

        {props.info ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="数据库文件">{props.info.databasePath}</Descriptions.Item>
            <Descriptions.Item label="备份目录">{props.info.backupDir}</Descriptions.Item>
            <Descriptions.Item label="导出目录">{props.info.exportDir}</Descriptions.Item>
            <Descriptions.Item label="恢复点目录">{props.info.restorePointDir}</Descriptions.Item>
            <Descriptions.Item label="最近一次恢复">
              {props.info.lastRestore
                ? `${props.info.lastRestore.restoredAt}，来源：${props.info.lastRestore.sourcePath}`
                : '暂无'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}

        <Alert
          type="warning"
          showIcon
          message="恢复数据库属于高风险操作"
          description={props.info?.restoreNote ?? '恢复前会自动备份当前数据库，恢复成功后建议重启应用。'}
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
