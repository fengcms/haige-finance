export const routes = [
  { path: '/', label: '首页仪表盘', key: 'dashboard' },
  { path: '/customers', label: '客户管理', key: 'customers' },
  { path: '/projects', label: '客户项目', key: 'projects' },
  { path: '/contracts', label: '合同管理', key: 'contracts' },
  { path: '/employees', label: '员工管理', key: 'employees' },
  { path: '/suppliers', label: '供应商管理', key: 'suppliers' },
  { path: '/supplier-analysis', label: '供应商费用分析', key: 'supplierAnalysis' },
  { path: '/project-finance', label: '项目收支', key: 'projectFinance' },
  { path: '/finance', label: '财务管理', key: 'finance' },
  { path: '/payroll', label: '工资管理', key: 'payroll' },
  { path: '/accounts', label: '账户管理', key: 'accounts' },
  { path: '/reports', label: '报表对账', key: 'reports' },
  { path: '/settings', label: '系统设置', key: 'settings' },
] as const;

export type RouteKey = (typeof routes)[number]['key'];
