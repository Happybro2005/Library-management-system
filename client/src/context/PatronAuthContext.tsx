import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export interface AuthenticatedPatron {
  id: string;
  membershipNo: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  status?: string;
  isAdminViewing?: boolean;
}

interface PatronAuthContextType {
  patron: AuthenticatedPatron | null;
  loading: boolean;
  isAdminViewing: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  adminViewLogin: (membershipNo: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPatron: () => Promise<void>;
}

const PatronAuthContext = createContext<PatronAuthContextType | undefined>(undefined);

export const PatronAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patron, setPatron] = useState<AuthenticatedPatron | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdminViewing = Boolean(
    patron?.isAdminViewing || localStorage.getItem('lms_patron_view_as_admin') === 'true'
  );

  const refreshPatron = async () => {
    try {
      const res = await api.get('/patron/me');
      if (res.data?.success && res.data.data) {
        const isViewing = localStorage.getItem('lms_patron_view_as_admin') === 'true';
        const profile = { ...res.data.data, isAdminViewing: isViewing };
        setPatron(profile);
        localStorage.setItem('lms_patron_profile', JSON.stringify(profile));
      } else {
        setPatron(null);
        localStorage.removeItem('lms_patron_profile');
        localStorage.removeItem('lms_patron_token');
        localStorage.removeItem('lms_patron_view_as_admin');
      }
    } catch {
      setPatron(null);
      localStorage.removeItem('lms_patron_profile');
      localStorage.removeItem('lms_patron_token');
      localStorage.removeItem('lms_patron_view_as_admin');
    }
  };

  useEffect(() => {
    const init = async () => {
      const savedProfile = localStorage.getItem('lms_patron_profile');
      const savedToken = localStorage.getItem('lms_patron_token');

      if (savedProfile && savedToken) {
        try {
          setPatron(JSON.parse(savedProfile));
        } catch {
          // ignore
        }
      }

      if (savedToken) {
        await refreshPatron();
      }
      setLoading(false);
    };

    init();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await api.post('/patron/login', {
      identifier: identifier.trim(),
      password: password.trim(),
    });
    if (res.data?.success) {
      const { patron: patronData, token } = res.data.data;
      localStorage.removeItem('lms_patron_view_as_admin');
      setPatron(patronData);
      localStorage.setItem('lms_patron_token', token);
      localStorage.setItem('lms_patron_profile', JSON.stringify(patronData));
    } else {
      throw new Error(res.data?.error || 'Patron sign in failed');
    }
  };

  const adminViewLogin = async (membershipNo: string) => {
    const res = await api.post('/patron/admin-view', {
      membershipNo: membershipNo.trim(),
    });
    if (res.data?.success) {
      const { patron: patronData, token } = res.data.data;
      const viewingPatron = { ...patronData, isAdminViewing: true };
      localStorage.setItem('lms_patron_view_as_admin', 'true');
      setPatron(viewingPatron);
      localStorage.setItem('lms_patron_token', token);
      localStorage.setItem('lms_patron_profile', JSON.stringify(viewingPatron));
    } else {
      throw new Error(res.data?.error || 'Failed to inspect member dashboard');
    }
  };

  const logout = async () => {
    try {
      await api.post('/patron/logout').catch(() => {});
    } finally {
      setPatron(null);
      localStorage.removeItem('lms_patron_token');
      localStorage.removeItem('lms_patron_profile');
      localStorage.removeItem('lms_patron_view_as_admin');
    }
  };

  return (
    <PatronAuthContext.Provider
      value={{
        patron,
        loading,
        isAdminViewing,
        login,
        adminViewLogin,
        logout,
        refreshPatron,
      }}
    >
      {children}
    </PatronAuthContext.Provider>
  );
};

export const usePatronAuth = () => {
  const context = useContext(PatronAuthContext);
  if (!context) {
    throw new Error('usePatronAuth must be used within a PatronAuthProvider');
  }
  return context;
};
