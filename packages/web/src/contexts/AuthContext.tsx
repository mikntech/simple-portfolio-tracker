import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, signOut, signInWithRedirect, fetchAuthSession } from 'aws-amplify/auth';
import type { AuthUser } from 'aws-amplify/auth';
import { clearBackendUserCache } from '../hooks/useBackendUser';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn() {
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Error signing in:', error);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
      clearBackendUserCache();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  async function getAccessToken() {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn: handleSignIn,
    signOut: handleSignOut,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
