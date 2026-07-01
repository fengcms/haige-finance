import { Input, Select, Tag } from 'antd';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { accountApi, type Account } from '@/renderer/api/masterDataApi';
import { useDictionaries } from '@/renderer/hooks/useDictionaries';
import { accountStatusLabels, accountTypeLabels } from '@/renderer/utils/labels';
import { formatYuan, parseYuan } from '@/renderer/utils/money';

export function AccountsPage() {
  const dictionaries = useDictionaries(['account_type', 'account_status']);
  const typeLabels = dictionaries.labels('account_type', accountTypeLabels);
  const statusLabels = dictionaries.labels('account_status', accountStatusLabels);

  return (
    <MasterDataPage<Account>
      title="账户"
      api={accountApi}
      columns={[
        { title: '账户名称', dataIndex: 'name', width: 180 },
        { title: '账户类型', dataIndex: 'type', width: 120, render: (value) => typeLabels[String(value)] ?? value },
        {
          title: '初始余额',
          dataIndex: 'openingBalanceCents',
          width: 130,
          render: (value) => `${formatYuan(Number(value))} 元`,
        },
        {
          title: '状态',
          dataIndex: 'status',
          width: 120,
          render: (value) => <Tag>{statusLabels[String(value)] ?? value}</Tag>,
        },
        { title: '备注', dataIndex: 'remark', width: 220 },
      ]}
      fields={[
        { name: 'name', label: '账户名称', required: true, render: <Input /> },
        { name: 'type', label: '账户类型', required: true, render: <Select options={dictionaries.options('account_type', accountTypeLabels)} /> },
        { name: 'openingBalanceYuan', label: '初始余额（元）', render: <Input /> },
        { name: 'status', label: '账户状态', required: true, render: <Select options={dictionaries.options('account_status', accountStatusLabels)} /> },
        { name: 'remark', label: '备注', render: <Input.TextArea rows={3} /> },
      ]}
      normalizeBeforeEdit={(item) => ({
        ...item,
        openingBalanceYuan: formatYuan(item.openingBalanceCents),
      })}
      normalizeBeforeSubmit={(values) => {
        const { openingBalanceYuan, ...rest } = values;
        return {
          status: 'active',
          ...rest,
          openingBalanceCents: parseYuan(openingBalanceYuan as string),
        };
      }}
    />
  );
}
