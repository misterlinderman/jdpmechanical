import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useSessionRoles } from '../hooks/useSessionRoles';

function Navbar(): JSX.Element {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const location = useLocation();
  const { isAdmin, isPm, loading } = useSessionRoles();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--gold)] text-[var(--navy)]">
              <span className="font-bold text-sm">F</span>
            </div>
            <span className="font-semibold text-[var(--text)]">FPB Tracker</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/') ? 'text-[var(--gold)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Home
            </Link>
            {!loading && isAuthenticated && (isAdmin || isPm) && (
              <Link
                to="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  isActive('/dashboard') ? 'text-[var(--gold)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Live dashboard
              </Link>
            )}
            {!loading && isAuthenticated && isAdmin && (
              <>
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/admin') ? 'text-[var(--gold)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Admin
                </Link>
                <Link
                  to="/admin/import"
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Import
                </Link>
                <Link
                  to="/admin/qr"
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  QR
                </Link>
                <Link
                  to="/admin/users"
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Users
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link
                to="/profile"
                className={`text-sm font-medium transition-colors ${
                  isActive('/profile') ? 'text-[var(--gold)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Profile
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {user?.picture && (
                    <img src={user.picture} alt={user.name || 'User'} className="w-8 h-8 rounded-full" />
                  )}
                  <span className="text-sm font-medium text-[var(--muted)] hidden sm:inline max-w-[140px] truncate">
                    {user?.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  className="btn-jdp-secondary text-sm"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => loginWithRedirect()} className="btn-jdp-gold text-sm">
                Log in
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
