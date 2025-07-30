import { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

export interface ClientProfile {
  id: string;
  client_name: string;
  email: string;
  phone?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  clientProfile: ClientProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  userRole: string | null;
  isClientProfile: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
