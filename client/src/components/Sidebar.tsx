import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Tablet,
  Users,
  Armchair,
  Repeat,
  BarChart2,
  FileText,
  Settings,
  ChevronDown,
  LogOut,
  Database,
  Library,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  hasDropdown?: boolean;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { logout, dbStatus } = useAuth();
  const navigate = useNavigate();
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await api.get('/seats/requests?status=PENDING');
        if (res.data?.success && Array.isArray(res.data.data)) {
          setPendingRequestsCount(res.data.data.length);
        }
      } catch {
        // Silently ignore if not authorized yet
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Books', path: '/books', icon: BookOpen, hasDropdown: true },
    { name: 'E-Books', path: '/ebooks', icon: Tablet },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Seats', path: '/seats', icon: Armchair },
    {
      name: 'User Requests',
      path: '/user-requests',
      icon: Inbox,
      badge: pendingRequestsCount > 0 ? String(pendingRequestsCount) : undefined,
    },
    { name: 'Issue & Return', path: '/issues', icon: Repeat },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Activity Logs', path: '/activity', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings, hasDropdown: true },
  ];

  return (
    <aside className="w-56 bg-[#111113] text-zinc-300 flex flex-col shrink-0 border-r border-zinc-800 select-none">
      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-[#27272a] text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0 text-zinc-300" />
                <span>{item.name}</span>
              </div>
              {item.hasDropdown ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              ) : item.badge ? (
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-zinc-800 text-zinc-300 rounded">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}

        {/* Secondary utilities (Member Portal & DB setup) */}
        <div className="pt-4 mt-4 border-t border-zinc-800/80 px-1 space-y-1">
          <NavLink
            to="/portal"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-[#27272a] text-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
              }`
            }
          >
            <div className="flex items-center space-x-2.5">
              <Library className="w-3.5 h-3.5 text-zinc-400" />
              <span>Member Portal</span>
            </div>
            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Patron</span>
          </NavLink>

          <NavLink
            to="/database-config"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-[#27272a] text-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
              }`
            }
          >
            <div className="flex items-center space-x-2.5">
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span>Database Config</span>
            </div>
            {dbStatus?.connectionStatus !== 'CONNECTED' && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </NavLink>
        </div>
      </nav>

      {/* Bottom Logout Button matching screenshot */}
      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4 shrink-0 text-zinc-400" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};
