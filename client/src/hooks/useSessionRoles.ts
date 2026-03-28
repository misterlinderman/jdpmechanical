import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api';

export function useSessionRoles(): {
  roles: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isPm: boolean;
  isFabricator: boolean;
  isDriver: boolean;
  isInstaller: boolean;
} {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setRoles([]);
      setLoading(false);
      return;
    }
    try {
      await getAccessTokenSilently();
      const res = await api.get<{ success: boolean; data: { roles: string[] } }>('/users/me/session');
      setRoles(res.data.data?.roles ?? []);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    roles,
    loading,
    refresh,
    isAdmin: roles.includes('admin'),
    isPm: roles.includes('pm'),
    isFabricator: roles.includes('fabricator'),
    isDriver: roles.includes('driver'),
    isInstaller: roles.includes('installer'),
  };
}
