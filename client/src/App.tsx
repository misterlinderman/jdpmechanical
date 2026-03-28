import { Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Loading from './components/Loading';
import { useApiAuth } from './hooks/useApiAuth';
import AdminDashboard from './pages/AdminDashboard';
import AdminImport from './pages/AdminImport';
import QRManager from './pages/QRManager';
import LiveDashboard from './pages/LiveDashboard';
import ScanHandler from './pages/ScanHandler';
import ActivityLog from './pages/ActivityLog';
import AdminAuth0Users from './pages/AdminAuth0Users';

function App(): JSX.Element {
  const { isLoading } = useAuth0();

  useApiAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Routes>
      <Route
        path="/scan/:unitId"
        element={
          <ProtectedRoute>
            <ScanHandler />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <RoleRoute roles={['admin']}>
                    <AdminDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/import"
                element={
                  <RoleRoute roles={['admin']}>
                    <AdminImport />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/qr"
                element={
                  <RoleRoute roles={['admin']}>
                    <QRManager />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/activity"
                element={
                  <RoleRoute roles={['admin']}>
                    <ActivityLog />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RoleRoute roles={['admin']}>
                    <AdminAuth0Users />
                  </RoleRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RoleRoute roles={['admin', 'pm']}>
                    <LiveDashboard />
                  </RoleRoute>
                }
              />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;
