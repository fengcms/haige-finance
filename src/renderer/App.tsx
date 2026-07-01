import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import { AppLayout } from './layouts/AppLayout';
import { AccountsPage } from './pages/AccountsPage';
import { ContractsPage } from './pages/ContractsPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { FinancePage } from './pages/FinancePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [passwordSet, setPasswordSet] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    void authApi
      .status()
      .then((status) => {
        setPasswordSet(status.passwordSet);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="auth-loading">
        <Spin tip="正在检查登录状态..." />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <LoginPage
        passwordSet={passwordSet}
        onPasswordSet={() => setPasswordSet(true)}
        onAuthenticated={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout onLogout={() => setAuthenticated(false)} />}>
          <Route index element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
