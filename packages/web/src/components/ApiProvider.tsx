import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api-client';

interface ApiProviderProps {
  children: React.ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const { getAccessToken } = useAuth();

  useEffect(() => {
    // Set the auth token provider
    apiClient.setAuthTokenProvider(getAccessToken);
  }, [getAccessToken]);

  return <>{children}</>;
}
