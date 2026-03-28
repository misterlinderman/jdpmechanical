import { ReactNode } from 'react';
import { Auth0Provider, AppState } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

interface Auth0ProviderWithNavigateProps {
  children: ReactNode;
}

function Auth0ProviderWithNavigate({ children }: Auth0ProviderWithNavigateProps): JSX.Element {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState): void => {
    const returnTo = appState?.returnTo ?? window.location.pathname;
    navigate(returnTo, { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}

export default Auth0ProviderWithNavigate;
