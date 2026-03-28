import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api, { setAuthToken } from '../services/api';

/**
 * Hook to automatically add Auth0 token to API requests
 * Call this once in a high-level component to set up token handling
 */
export function useApiAuth() {
  const { isAuthenticated, getAccessTokenSilently, user } = useAuth0();

  useEffect(() => {
    const setupToken = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          setAuthToken(token);
          if (user?.email && user.name) {
            try {
              await api.put('/users/me', {
                email: user.email,
                name: user.name,
                picture: user.picture,
              });
            } catch {
              // Profile sync is best-effort; scan flow can still create the user
            }
          }
        } catch (error) {
          console.error('Error getting access token:', error);
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }
    };

    setupToken();
  }, [isAuthenticated, getAccessTokenSilently, user]);

  return api;
}

export default useApiAuth;
