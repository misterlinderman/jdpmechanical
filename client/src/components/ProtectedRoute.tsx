import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Loading from './Loading';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    loginWithRedirect({ appState: { returnTo } });
    return <Loading />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
