import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Bell, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';

export const Navbar: React.FC = () => {
  const { admin, dbStatus } = useAuth();
  const navigate = useNavigate();

  const connectionStatus = dbStatus?.connectionStatus || 'NOT_CONFIGURED';

  return (
    <header className="h-14 bg-[#111113] border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-40 select-none shrink-0">
      {/* Left section: Book icon + Library Management System */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-white">
          <BookOpen className="w-4 h-4 text-white stroke-[2.2]" />
        </div>
        <h1 className="text-sm md:text-base font-semibold text-white tracking-tight">
          Library Management System
        </h1>
      </div>

      {/* Right section: DB status, Notification bell, Admin profile */}
      <div className="flex items-center space-x-5">
        {/* Discrete DB indicator */}
        <div
          onClick={() => navigate('/database-config')}
          title={`Database: ${connectionStatus}`}
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <StatusBadge status={connectionStatus} size="sm" />
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></span>
        </button>

        {/* Admin Profile */}
        <div className="flex items-center space-x-3 pl-2 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-zinc-700 text-white flex items-center justify-center text-xs font-bold border border-zinc-600">
            {admin?.fullName ? admin.fullName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="text-xs font-bold text-white">
              {admin?.fullName || 'Admin'}
            </div>
            <div className="text-[11px] text-zinc-400">
              {admin?.role === 'SUPERADMIN' ? 'Administrator' : admin?.role || 'Administrator'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
