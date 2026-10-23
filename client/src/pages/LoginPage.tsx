import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Library, Lock, User, Eye, EyeOff, AlertCircle, Database, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const LoginPage: React.FC = () => {
  const { login, dbStatus } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('AdminPassword123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const connectionStatus = dbStatus?.connectionStatus || 'NOT_CONFIGURED';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-zinc-800 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-white text-black items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.25)] mb-1">
            <Library className="w-7 h-7 text-black stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Library Management System</h1>
          <p className="text-xs text-zinc-400 font-medium">Enterprise Administrator Portal</p>
        </div>

        {/* Database Offline / Unconfigured Notice */}
        {connectionStatus !== 'CONNECTED' && (
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-zinc-300 flex items-start space-x-3 shadow-lg">
            <Database className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="font-semibold text-white">
                {connectionStatus === 'NOT_CONFIGURED' ? 'Database Not Configured' : 'Database Offline'}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                PostgreSQL is currently disconnected. Configure your database credentials to unlock the LMS.
              </p>
              <Link
                to="/setup"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 px-3.5 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                <span>Launch Database Setup Wizard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-2xl text-xs text-white flex items-start space-x-3 shadow-lg">
            <AlertCircle className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-zinc-800 p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Username or Email</span>
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin or admin@library.local"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-sm font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-sm font-mono pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || connectionStatus !== 'CONNECTED'}
              className="w-full py-3 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-3"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            </button>
          </form>

          {/* Database Status footer bar */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center space-x-2">
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span>Database:</span>
              <StatusBadge status={connectionStatus} size="sm" />
            </div>

            <Link
              to="/setup"
              className="text-zinc-300 hover:text-white font-semibold hover:underline transition-colors"
            >
              Database Setup
            </Link>
          </div>
        </div>

        {/* Switch to Patron Portal */}
        <div className="text-center">
          <Link
            to="/portal/login"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-850 px-4 py-2.5 rounded-2xl border border-zinc-800 shadow-lg transition-all"
          >
            <span>Are you a Library Member / Patron?</span>
            <span className="text-white underline underline-offset-4">Open Member Dashboard &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
