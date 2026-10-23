import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Library,
  IdCard,
  ArrowRight,
  AlertCircle,
  Sparkles,
  BookOpen,
  Armchair,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { usePatronAuth } from '../../context/PatronAuthContext';

export const PatronLoginPage: React.FC = () => {
  const { login } = usePatronAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('MEM-1001');
  const [password, setPassword] = useState('Library@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const demoPatrons = [
    { name: 'Alice Walker', id: 'MEM-1001', note: 'Active loan (Computer Science)' },
    { name: 'Robert Chen', id: 'MEM-1002', note: 'Active loan (Astrophysics)' },
    { name: 'Sophia Rodriguez', id: 'MEM-1003', note: 'Active loan & Study Seat' },
    { name: 'David Kim', id: 'MEM-1004', note: 'Active loan (Clean Architecture)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your Membership Number or registered Email.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password provided by the library administrator.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await login(identifier, password);
      navigate('/portal');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Patron login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (id: string) => {
    setIdentifier(id);
    setPassword('Library@123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 items-center justify-center text-white shadow-xl shadow-indigo-500/25 ring-1 ring-white/20">
            <Library className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Patron Self-Service Portal</span>
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Member Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Access your digital library card, track borrowed books, monitor due dates, and explore the catalog.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-rose-950/70 border border-rose-500/50 rounded-2xl text-xs text-rose-200 flex items-start space-x-3 shadow-lg animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl p-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <IdCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Membership No or Registered Email</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">e.g. MEM-1001</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="MEM-1001 or member@example.com"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono tracking-wide"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Account Password</span>
                </span>
                <span className="text-[10px] text-slate-500">Issued by Administrator</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your member password"
                  className="w-full pl-4 pr-11 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Admin-Only Registration Notice */}
            <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/20 text-indigo-200 text-[11px] flex items-start space-x-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Admin Provisioned Account:</strong> Only library administrators can register member accounts and provide initial login credentials. Once logged in, you can change your password.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-semibold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <>
                  <span>Open Member Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Helper */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Instant Demo Logins
              </span>
              <span className="text-[10px] text-indigo-400 font-medium">Click to select</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoPatrons.map((patron) => {
                const isSelected = identifier === patron.id;
                return (
                  <button
                    key={patron.id}
                    type="button"
                    onClick={() => handleQuickSelect(patron.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-xs'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate">{patron.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5">{patron.id}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portal Features Highlights */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950/30 border border-slate-800/50">
              <BookOpen className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-[10px] font-medium text-slate-400">Loan Tracking</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/30 border border-slate-800/50">
              <Armchair className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-[10px] font-medium text-slate-400">Seat Allocations</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/30 border border-slate-800/50">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-[10px] font-medium text-slate-400">Digital Library ID</div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Link */}
        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span>Are you a librarian or library staff?</span>
            <span className="text-indigo-400 font-semibold underline underline-offset-4">
              Librarian Sign In &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};
