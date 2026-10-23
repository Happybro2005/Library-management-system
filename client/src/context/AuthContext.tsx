import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: 'SUPERADMIN' | 'ADMIN';
}

export interface DbStatusInfo {
  isConfigured: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  currentConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    sslMode: string;
    source: string;
  };
  schemaStatus: 'EMPTY' | 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN';
  hasAdmin: boolean;
  isFirstRun: boolean;
  tableCount: number;
  lastChecked: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  dbStatus: DbStatusInfo | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
  refreshDbStatus: () => Promise<DbStatusInfo | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshDbStatus = async (): Promise<DbStatusInfo | null> => {
    try {
      const res = await api.get('/setup/status');
      if (res.data?.success) {
        setDbStatus(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.warn('Failed to fetch DB status:', err);
    }
    return null;
  };

  const refreshAdmin = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setAdmin(res.data.data);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshDbStatus();
      await refreshAdmin();
      setLoading(false);
    };
    init();
  }, []);

  const login = async (identifier: string, pass: string) => {
    const res = await api.post('/auth/login', { identifier, password: pass });
    if (res.data?.success) {
      setAdmin(res.data.data.admin);
      await refreshDbStatus();
    } else {
      throw new Error(res.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        dbStatus,
        loading,
        login,
        logout,
        refreshAdmin,
        refreshDbStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
