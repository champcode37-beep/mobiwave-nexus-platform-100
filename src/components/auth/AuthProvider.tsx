import React from 'react';
import { AuthContext, AuthContextType } from './auth-provider/AuthContext';
import { useAuthState } from './auth-provider/useAuthState';
import { useAuthActions } from './auth-provider/useAuthActions';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    session,
    clientProfile,
    isLoading,
    userRole,
    setUser,
    setSession,
    setClientProfile,
    setUserRole,
    setIsLoading
  } = useAuthState();

  const { login, logout } = useAuthActions(setIsLoading, setUser, setSession, setUserRole, setClientProfile);

  const value: AuthContextType = {
    user,
    session,
    clientProfile,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user || !!clientProfile,
    userRole,
    isClientProfile: !!clientProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { useAuth } from './auth-provider/AuthContext';
