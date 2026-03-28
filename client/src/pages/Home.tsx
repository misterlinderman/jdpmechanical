import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Loading from '../components/Loading';
import { useSessionRoles } from '../hooks/useSessionRoles';

function Home(): JSX.Element {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { roles, loading: rolesLoading, isAdmin, isPm, isFabricator, isDriver, isInstaller } = useSessionRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !isAuthenticated || rolesLoading) return;
    if (isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }
    if (isPm) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [isLoading, isAuthenticated, rolesLoading, isAdmin, isPm, navigate]);

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 py-16 text-[var(--text)]">
        <h1 className="text-3xl font-bold">FPB Tracker</h1>
        <p className="text-[var(--muted)]">
          Track fabricated pump boxes from shop through delivery and install. Sign in with your JDP account.
        </p>
        <button type="button" className="btn-jdp-gold" onClick={() => loginWithRedirect()}>
          Log in
        </button>
      </div>
    );
  }

  if (rolesLoading) {
    return <Loading />;
  }

  if (isAdmin || isPm) {
    return <Loading />;
  }

  if (isFabricator || isDriver || isInstaller) {
    return (
      <div className="max-w-xl mx-auto card-jdp text-[var(--text)]">
        <h1 className="text-xl font-semibold mb-2">Field worker</h1>
        <p className="text-[var(--muted)] text-sm">
          Scan the QR code on your unit sticker with your phone camera. After signing in, you will mark the correct
          stage for your role.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto card-jdp text-[var(--text)]">
      <h1 className="text-xl font-semibold mb-2">No role assigned</h1>
      <p className="text-[var(--muted)] text-sm">
        Your account is missing an Auth0 role (admin, pm, fabricator, driver, installer). Ask an administrator to add
        you to the correct role and ensure RBAC includes roles in the access token.
      </p>
      <p className="text-xs font-mono text-[var(--muted)] mt-4">Token roles: {roles.length ? roles.join(', ') : 'none'}</p>
    </div>
  );
}

export default Home;
