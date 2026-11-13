import { Navigate, Route, Routes } from 'react-router-dom';
import { MarketingLayout } from './layouts/MarketingLayout';
import { PublicShell } from './layouts/PublicShell';
import { LandingPage } from './pages/LandingPage';
import { PublicDashboardPage } from './pages/PublicDashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { LoginPage } from './pages/LoginPage';
import { AdminHomePage } from './pages/AdminHomePage';
import { RequireAdmin } from './components/RequireAdmin';
import { ServersPage } from './pages/ServersPage';
import { DockerPage } from './pages/DockerPage';
import { DockerContainerDetailPage } from './pages/DockerContainerDetailPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { LogsPage } from './pages/LogsPage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { AwsResourcesPage } from './pages/AwsResourcesPage';
import { AwsResourceDetailPage } from './pages/AwsResourceDetailPage';
import { AdminAlertManagementPage } from './pages/AdminAlertManagementPage';

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<LandingPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminHomePage />
          </RequireAdmin>
        }
      />
      <Route path="/admin/alerts" element={<RequireAdmin><AdminAlertManagementPage /></RequireAdmin>} />

      <Route path="/dashboard" element={<PublicShell />}>
        <Route index element={<PublicDashboardPage />} />
        <Route path="servers" element={<ServersPage />} />
        <Route path="aws-resources" element={<AwsResourcesPage />} />
        <Route path="aws-resources/:id" element={<AwsResourceDetailPage />} />
        <Route path="docker" element={<DockerPage />} />
        <Route path="docker/:id" element={<DockerContainerDetailPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="deployments" element={<DeploymentsPage />} />
        <Route path="apis" element={<PlaceholderPage title="API Monitoring" description="API uptime and latency monitoring — coming soon." />} />
        <Route path="network" element={<PlaceholderPage title="Network Monitoring" description="Network traffic charts — coming soon." />} />
        <Route path="costs" element={<PlaceholderPage title="Cost Monitoring" description="Infrastructure cost tracking — coming soon." />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
