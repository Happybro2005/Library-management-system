import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Database } from 'lucide-react';

export const Layout: React.FC = () => {
  const { dbStatus } = useAuth();
  const navigate = useNavigate();

  const isDisconnected = dbStatus?.connectionStatus === 'DISCONNECTED';
  const isUnconfigured = dbStatus?.connectionStatus === 'NOT_CONFIGURED';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-zinc-100 font-sans">
      {/* Top Navbar spans full width */}
      <Navbar />

      {/* Global Warning Banner if Database is not connected */}
      {(isDisconnected || isUnconfigured) && (
        <div className="bg-zinc-900 border-b border-zinc-800 text-zinc-200 px-6 py-2 flex items-center justify-between shrink-0 shadow-xs z-30">
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-white" />
            <span>
              {isUnconfigured
                ? 'Database is not yet configured. The LMS is currently offline.'
                : 'Cannot reach PostgreSQL database. Active operations may fail until restored.'}
            </span>
          </div>
          <button
            onClick={() => navigate('/database-config')}
            className="px-3 py-1 bg-white text-black rounded-lg text-xs font-semibold hover:bg-zinc-200 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Configure Database</span>
          </button>
        </div>
      )}

      {/* Main Body: Sidebar on left + Clean Light Grey Canvas on right */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-[#f4f5f7] text-zinc-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
