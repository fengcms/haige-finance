import { Input, Select, Tag } from 'antd';
import { MasterDataPage } from '@/renderer/components/MasterDataPage';
import { employeeApi, type Employee } from '@/renderer/api/masterDataApi';
import { employeeStatusLabels, toOptions } from '@/renderer/utils/labels';

export function EmployeesPage() {
  return (
    <MasterDataPage<Employee>
      title="员工"
      api={employeeApi}
      columns={[
        { title: '员工姓名', dataIndex: 'name', width: 150 },
        { title: '联系电话', dataIndex: 'phone', width: 150 },
        { title: '岗位', dataIndex: 'position', width: 150 },
        { title: '入职日期', dataIndex: 'entryDate', width: 120 },
        {
          title: '状态',
          dataIndex: 'status',
          width: 120,
          render: (value) => <Tag>{employeeStatusLabels[String(value)] ?? value}</Tag>,
        },
      ]}
      fields={[
        { name: 'name', label: '员工姓名', required: true, render: <Input /> },
        { name: 'phone', label: '联系电话', render: <Input /> },
        { name: 'position', label: '岗位', render: <Input /> },
        { name: 'entryDate', label: '入职日期', render: <Input placeholder="YYYY-MM-DD" /> },
        { name: 'status', label: '员工状态', required: true, render: <Select options={toOptions(employeeStatusLabels)} /> },
        { name: 'remark', label: '备注', render: <Input.TextArea rows={3} /> },
      ]}
      normalizeBeforeSubmit={(values) => ({
        status: 'active',
        ...values,
      })}
    />
  );
}
