import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Loading from './Loading';
import { useSessionRoles } from '../hooks/useSessionRoles';

interface RoleRouteProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

export default function RoleRoute({ children, roles: allowed, fallback }: RoleRouteProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();
  const { roles, loading } = useSessionRoles();

  if (isLoading || loading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    loginWithRedirect({ appState: { returnTo: `${location.pathname}${location.search}` } });
    return <Loading />;
  }

  const ok = allowed.some((r) => roles.includes(r));
  if (!ok) {
    return (
      fallback ?? (
        <div className="max-w-lg mx-auto card border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
          <h1 className="text-xl font-semibold mb-2">Access denied</h1>
          <p className="text-[var(--muted)]">
            You do not have permission to view this page. Contact an administrator if you need access.
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
