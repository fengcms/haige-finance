import { Input, Select, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import {
  contractApi,
  customerApi,
  projectApi,
  type ContractListItem,
  type Customer,
  type ProjectListItem,
} from '@/renderer/api/masterDataApi';
import { contractStatusLabels, toOptions } from '@/renderer/utils/labels';
import { formatYuan, parseYuan } from '@/renderer/utils/money';

export function ContractsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  useEffect(() => {
    void Promise.all([customerApi.list({ page: 1, pageSize: 100 }), projectApi.list({ page: 1, pageSize: 100 })]).then(([customerResult, projectResult]) => {
      setCustomers(customerResult.items);
      setProjects(projectResult.items);
    });
  }, []);

  return (
    <MasterDataPage<ContractListItem>
      title="合同"
      api={contractApi}
      columns={[
        { title: '合同名称', dataIndex: 'name', width: 200 },
        { title: '合同编号', dataIndex: 'contractNo', width: 150 },
        { title: '客户', dataIndex: 'customerName', width: 150 },
        { title: '项目', dataIndex: 'projectName', width: 200 },
        {
          title: '合同金额',
          dataIndex: 'amountCents',
          width: 130,
          render: (value) => `${formatYuan(Number(value))} 元`,
        },
        { title: '签约日期', dataIndex: 'signedDate', width: 120 },
        {
          title: '状态',
          dataIndex: 'status',
          width: 120,
          render: (value) => <Tag>{contractStatusLabels[String(value)] ?? value}</Tag>,
        },
      ]}
      fields={[
        {
          name: 'customerId',
          label: '所属客户',
          required: true,
          render: <Select showSearch optionFilterProp="label" options={customers.map((customer) => ({ value: customer.id, label: customer.name }))} />,
        },
        {
          name: 'projectId',
          label: '所属项目',
          required: true,
          render: <Select showSearch optionFilterProp="label" options={projects.map((project) => ({ value: project.id, label: `${project.name}${project.customerName ? `（${project.customerName}）` : ''}` }))} />,
        },
        { name: 'name', label: '合同名称', required: true, render: <Input /> },
        { name: 'contractNo', label: '合同编号', render: <Input /> },
        { name: 'amountYuan', label: '合同金额（元）', required: true, render: <Input /> },
        { name: 'signedDate', label: '签约日期', render: <Input placeholder="YYYY-MM-DD" /> },
        { name: 'status', label: '合同状态', required: true, render: <Select options={toOptions(contractStatusLabels)} /> },
        { name: 'remark', label: '备注', render: <Input.TextArea rows={3} /> },
      ]}
      normalizeBeforeEdit={(item) => ({
        ...item,
        amountYuan: formatYuan(item.amountCents),
      })}
      normalizeBeforeSubmit={(values) => {
        const { amountYuan, ...rest } = values;
        return {
          status: 'draft',
          ...rest,
          amountCents: parseYuan(amountYuan as string),
        };
      }}
    />
  );
}
