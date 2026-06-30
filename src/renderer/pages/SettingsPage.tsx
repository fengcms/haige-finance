import { Checkbox, Input, Select, Tag } from 'antd';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { categoryApi, type Category } from '@/renderer/api/masterDataApi';
import { categoryStatusLabels, categoryTypeLabels, fundTypeLabels, toOptions } from '@/renderer/utils/labels';

export function SettingsPage() {
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
