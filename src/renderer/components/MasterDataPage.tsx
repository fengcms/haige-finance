import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ListQuery, ListResult } from '@/shared/types/api';

export interface FieldConfig {
  name: string;
  label: string;
  required?: boolean;
  hidden?: boolean;
  valuePropName?: string;
  render: React.ReactNode;
}

interface CrudApi<T extends { id: string }> {
  list: (query?: ListQuery) => Promise<ListResult<T>>;
  create: (input: unknown) => Promise<T>;
  update: (id: string, input: unknown) => Promise<T>;
  remove: (id: string) => Promise<{ id: string }>;
}

interface MasterDataPageProps<T extends { id: string }> {
  title: string;
  api: CrudApi<T>;
  columns: ColumnsType<T>;
  fields: FieldConfig[];
  rowActions?: (record: T) => React.ReactNode;
  normalizeBeforeSubmit?: (values: Record<string, unknown>, editingItem?: T | null) => Record<string, unknown>;
  normalizeBeforeEdit?: (item: T) => Record<string, unknown>;
}

export function MasterDataPage<T extends { id: string }>({
  title,
  api,
  columns,
  fields,
  rowActions,
  normalizeBeforeSubmit,
  normalizeBeforeEdit,
}: MasterDataPageProps<T>) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  async function load(queryKeyword = keyword) {
    try {
      setLoading(true);
      const result = await api.list({ keyword: queryKeyword, page: 1, pageSize: 100 });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load('');
  }, []);

  function syncFormValues() {
    if (editingItem) {
      form.setFieldsValue(normalizeBeforeEdit ? normalizeBeforeEdit(editingItem) : editingItem);
    } else {
      form.resetFields();
    }
  }

  function handleCreate() {
    setEditingItem(null);
    setOpen(true);
  }

  function handleEdit(item: T) {
    setEditingItem(item);
    setOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const input = normalizeBeforeSubmit ? normalizeBeforeSubmit(values, editingItem) : values;

    try {
      if (editingItem) {
        await api.update(editingItem.id, input);
        messageApi.success('已保存修改');
      } else {
        await api.create(input);
        messageApi.success('已新增');
      }

      setOpen(false);
      setEditingItem(null);
      form.resetFields();
      await load();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '保存失败');
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.remove(id);
      messageApi.success('已删除');
      await load();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '删除失败');
    }
  }

  const tableColumns = useMemo<ColumnsType<T>>(
    () => [
      ...columns,
      {
        title: '操作',
        key: 'actions',
        width: rowActions ? 230 : 150,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            {rowActions?.(record)}
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
            <Popconfirm title="确认删除？" okText="删除" cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [columns, rowActions],
  );

  return (
    <Card>
      {contextHolder}
      <Space direction="vertical" size="middle" className="page-stack">
        <Space className="toolbar" wrap>
          <Input.Search
            allowClear
            placeholder={`搜索${title}`}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onSearch={(value) => load(value)}
            style={{ width: 280 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => load()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增{title}
          </Button>
        </Space>

        <Table<T>
          rowKey="id"
          loading={loading}
          columns={tableColumns}
          dataSource={items}
          pagination={{
            total,
            pageSize: 100,
            showTotal: (count) => `共 ${count} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Space>

      <Modal
        title={editingItem ? `编辑${title}` : `新增${title}`}
        open={open}
        okText="保存"
        cancelText="取消"
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        afterOpenChange={(visible) => {
          if (visible) {
            syncFormValues();
          }
        }}
        forceRender
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          {fields
            .filter((field) => !field.hidden)
            .map((field) => (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                valuePropName={field.valuePropName}
                rules={field.required ? [{ required: true, message: `请输入或选择${field.label}` }] : undefined}
              >
                {field.render}
              </Form.Item>
            ))}
        </Form>
      </Modal>
    </Card>
  );
}
