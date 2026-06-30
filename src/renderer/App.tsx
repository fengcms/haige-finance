import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
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

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
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
