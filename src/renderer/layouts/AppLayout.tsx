import {
  AccountBookOutlined,
  BankOutlined,
  BarChartOutlined,
  DashboardOutlined,
  FileTextOutlined,
  ProjectOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type React from 'react';
import { Layout, Menu, Typography } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { routes } from '@/shared/constants/routes';

const { Header, Sider, Content } = Layout;

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardOutlined />,
  customers: <UserOutlined />,
  projects: <ProjectOutlined />,
  contracts: <FileTextOutlined />,
  employees: <TeamOutlined />,
  finance: <WalletOutlined />,
  accounts: <BankOutlined />,
  reports: <BarChartOutlined />,
  settings: <SettingOutlined />,
};

const menuItems: ItemType[] = routes.map((route) => ({
  key: route.path,
  icon: iconMap[route.key] ?? <AccountBookOutlined />,
  label: route.label,
}));

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPath = routes.find((route) => route.path === location.pathname)?.path ?? '/';

  return (
    <Layout className="app-shell">
      <Sider width={224} theme="dark">
        <div className="brand">海哥财务管理</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedPath]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Title level={4} className="app-title">
            小公司本地账务管理系统
          </Typography.Title>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
