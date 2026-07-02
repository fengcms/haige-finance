import {
  AccountBookOutlined,
  BankOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type React from 'react';
import { Button, Layout, Menu, Typography } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { routes } from '@/shared/constants/routes';

const { Header, Sider, Content } = Layout;

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardOutlined />,
  customers: <UserOutlined />,
  projects: <ProjectOutlined />,
  contracts: <FileTextOutlined />,
  employees: <TeamOutlined />,
  suppliers: <TeamOutlined />,
  projectFinance: <AccountBookOutlined />,
  finance: <WalletOutlined />,
  payroll: <DollarOutlined />,
  accounts: <BankOutlined />,
  reports: <BarChartOutlined />,
  settings: <SettingOutlined />,
};

const menuItems: ItemType[] = routes.map((route) => ({
  key: route.path,
  icon: iconMap[route.key] ?? <AccountBookOutlined />,
  label: route.label,
}));

export function AppLayout({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const selectedPath = routes.find((route) => route.path === location.pathname)?.path ?? '/';

  return (
    <Layout className="app-shell">
      <Sider width={224} collapsedWidth={72} collapsed={collapsed} trigger={null} theme="dark" className="app-sider">
        <div className="brand">
          <img className="brand-logo" src="./logo.svg" alt="海哥财务管理" />
          {!collapsed ? <span className="brand-name">海哥财务管理</span> : null}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedPath]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout className="app-main">
        <Header className="app-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          />
          <Typography.Title level={4} className="app-title">
            小公司本地账务管理系统
          </Typography.Title>
          <Button className="logout-button" onClick={onLogout}>
            退出登录
          </Button>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
