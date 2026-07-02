import { Input, Select, Tag } from 'antd';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { supplierApi, type Supplier } from '@/renderer/api/masterDataApi';
import { supplierStatusLabels, supplierTypeLabels, toOptions } from '@/renderer/utils/labels';

export function SuppliersPage() {
  return (
    <MasterDataPage<Supplier>
      title="供应商"
      api={supplierApi}
      columns={[
        { title: '供应商名称', dataIndex: 'name', width: 180 },
        { title: '联系人', dataIndex: 'contactName', width: 130, render: (value) => value || '-' },
        { title: '联系电话', dataIndex: 'phone', width: 140, render: (value) => value || '-' },
        { title: '地址', dataIndex: 'address', width: 220, render: (value) => value || '-' },
        { title: '类型', dataIndex: 'type', width: 120, render: (value) => supplierTypeLabels[String(value)] ?? value },
        {
          title: '状态',
          dataIndex: 'status',
          width: 100,
          render: (value) => <Tag>{supplierStatusLabels[String(value)] ?? value}</Tag>,
        },
        { title: '备注', dataIndex: 'remark', width: 220, render: (value) => value || '-' },
      ]}
      fields={[
        { name: 'name', label: '供应商名称', required: true, render: <Input /> },
        { name: 'contactName', label: '联系人', render: <Input /> },
        { name: 'phone', label: '联系电话', render: <Input /> },
        { name: 'address', label: '地址', render: <Input /> },
        { name: 'type', label: '供应商类型', required: true, render: <Select options={toOptions(supplierTypeLabels)} /> },
        { name: 'status', label: '状态', required: true, render: <Select options={toOptions(supplierStatusLabels)} /> },
        { name: 'remark', label: '备注', render: <Input.TextArea rows={3} /> },
      ]}
      normalizeBeforeSubmit={(values) => ({
        type: 'material',
        status: 'active',
        ...values,
      })}
    />
  );
}
