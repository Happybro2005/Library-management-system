import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Library,
  BookOpen,
  Search,
  FileText,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { usePatronAuth } from '../../context/PatronAuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';

export const PortalLayout: React.FC = () => {
  const { patron, logout, isAdminViewing } = usePatronAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/portal', icon: LayoutDashboard, end: true },
    { name: 'My Loans', path: '/portal/loans', icon: BookOpen },
    { name: 'Browse Catalog', path: '/portal/catalog', icon: Search },
    { name: 'Digital E-Books', path: '/portal/ebooks', icon: FileText },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'MB';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Administrator Preview Mode High-Visibility Amber Banner */}
      {isAdminViewing && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2.5 shadow-xl border-b border-amber-600/30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-slate-950 shrink-0 animate-pulse" />
              <span>
                ADMINISTRATOR PREVIEW MODE &mdash; Viewing Member Portal for{' '}
                <span className="underline decoration-slate-950 font-black">{patron?.fullName}</span> ({patron?.membershipNo}) without password.
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('lms_patron_view_as_admin');
                navigate('/users');
              }}
              className="px-3.5 py-1 bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-white rounded-lg text-xs font-bold self-start sm:self-auto cursor-pointer transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span>Exit Preview to Admin Dashboard</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-1 ring-white/20">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm tracking-tight">Metropolitan Library</span>
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Member Portal</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {patron?.membershipNo || 'Patron Account'}
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Right Side: Patron Pill, Admin Switch & Logout */}
            <div className="flex items-center space-x-3">
              {/* Member Profile Pill */}
              <div className="hidden lg:flex items-center space-x-2.5 pl-3 py-1 pr-1 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="text-xs font-semibold text-white leading-tight">{patron?.fullName}</span>
                    {patron?.status === 'BLOCKED' && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        BLOCKED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-indigo-300 font-mono">{patron?.membershipNo}</div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                  {getInitials(patron?.fullName)}
                </div>
              </div>

              {/* Change Password Button */}
              {!isAdminViewing && (
                <button
                  onClick={() => setChangePasswordOpen(true)}
                  className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-indigo-500/20"
                  title="Change Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-slate-900 rounded-2xl border border-slate-800 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                {getInitials(patron?.fullName)}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-xs text-white">{patron?.fullName}</span>
                  {patron?.status === 'BLOCKED' && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      BLOCKED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-indigo-400 font-mono">{patron?.membershipNo}</div>
              </div>
            </div>

            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            {!isAdminViewing && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setChangePasswordOpen(true);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 flex items-center space-x-2.5 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Change Password</span>
              </button>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-end items-center text-xs">
              <button onClick={handleLogout} className="text-rose-400 font-semibold cursor-pointer">
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

      {/* Portal Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Library Patron Self-Service Portal &bull; Open Mon-Sat 8:00 AM - 9:00 PM</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Circulation Desk: +1 (555) 234-5678</span>
            <span>&bull;</span>
            <span>info@metrolibrary.org</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
