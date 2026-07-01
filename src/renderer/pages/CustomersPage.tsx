import { Input, Select, Tag } from 'antd';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { customerApi, type Customer } from '@/renderer/api/masterDataApi';
import { useDictionaries } from '@/renderer/hooks/useDictionaries';
import { customerStatusLabels } from '@/renderer/utils/labels';

export function CustomersPage() {
  const dictionaries = useDictionaries(['customer_status']);
  const statusLabels = dictionaries.labels('customer_status', customerStatusLabels);

  return (
    <MasterDataPage<Customer>
      title="客户"
      api={customerApi}
      columns={[
        { title: '客户姓名', dataIndex: 'name', width: 160 },
        { title: '联系电话', dataIndex: 'phone', width: 150 },
        { title: '小区', dataIndex: 'community', width: 160 },
        { title: '房号', dataIndex: 'houseNumber', width: 120 },
        {
          title: '状态',
          dataIndex: 'status',
          width: 120,
          render: (value) => <Tag>{statusLabels[String(value)] ?? value}</Tag>,
        },
        { title: '备注', dataIndex: 'remark', width: 220 },
      ]}
      fields={[
        { name: 'name', label: '客户姓名', required: true, render: <Input /> },
        { name: 'phone', label: '联系电话', render: <Input /> },
        { name: 'address', label: '客户地址', render: <Input /> },
        { name: 'community', label: '小区名称', render: <Input /> },
        { name: 'houseNumber', label: '房号', render: <Input /> },
        {
          name: 'status',
          label: '客户状态',
          required: true,
          render: <Select options={dictionaries.options('customer_status', customerStatusLabels)} />,
        },
        { name: 'remark', label: '备注', render: <Input.TextArea rows={3} /> },
      ]}
      normalizeBeforeSubmit={(values) => ({
        status: 'potential',
        ...values,
      })}
    />
  );
}
