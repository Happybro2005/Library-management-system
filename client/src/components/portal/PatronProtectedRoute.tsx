import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePatronAuth } from '../../context/PatronAuthContext';

export const PatronProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { patron, loading } = usePatronAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading Patron Portal...</p>
        </div>
      </div>
    );
  }

  if (!patron) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
};
