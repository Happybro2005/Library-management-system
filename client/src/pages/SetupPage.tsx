import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library,
  Database,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Server,
  UserPlus,
  Sparkles,
  Layers,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { dbStatus, refreshDbStatus } = useAuth();

  const [step, setStep] = useState(1);

  // Step 2: Database Config
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [database, setDatabase] = useState('library_db');
  const [user, setUser] = useState('postgres');
  const [password, setPassword] = useState('');
  const [sslMode, setSslMode] = useState<'disable' | 'require' | 'verify-ca' | 'verify-full'>('disable');
  const [showPassword, setShowPassword] = useState(false);

  // Step 3: Test Connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Step 4: Save Connection
  const [savingConfig, setSavingConfig] = useState(false);

  // Step 5: Initialize Schema & Seed
  const [initializing, setInitializing] = useState(false);
  const [seedDemo, setSeedDemo] = useState(true);
  const [schemaInitialized, setSchemaInitialized] = useState(false);
  const [schemaSteps, setSchemaSteps] = useState<any[]>([]);

  // Step 6: Create First Admin
  const [adminFullName, setAdminFullName] = useState('System Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@library.local');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('AdminPassword123!');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Error / Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // If system is already fully configured with admin, redirect to login
    if (dbStatus?.isConfigured && dbStatus?.hasAdmin) {
      navigate('/login');
    }
  }, [dbStatus, navigate]);

  const handleTestConnection = async () => {
    setTesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/setup/database/test', {
        host: host.trim(),
        port: Number(port),
        database: database.trim(),
        user: user.trim(),
        password,
        sslMode,
      });

      if (res.data?.success) {
        setTestResult(res.data.data);
        setSuccessMsg(res.data.data.message);
      } else {
        setErrorMsg(res.data?.error || 'Database connection failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConnection = async () => {
    setSavingConfig(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/setup/database/connect', {
        host: host.trim(),
        port: Number(port),
        database: database.trim(),
        user: user.trim(),
        password,
        sslMode,
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        await refreshDbStatus();
        setStep(5);
      } else {
        setErrorMsg(res.data?.error || 'Failed to save database configuration.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Database connection failed.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleInitializeDatabase = async () => {
    setInitializing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/setup/database/initialize');
      if (res.data?.success) {
        setSchemaInitialized(true);
        setSchemaSteps(res.data.steps || []);
        setSuccessMsg('Database schema successfully verified and initialized!');

        if (seedDemo) {
          try {
            await api.post('/setup/database/seed');
          } catch (seedErr) {
            console.warn('Seed demo error:', seedErr);
          }
        }

        await refreshDbStatus();
        setStep(6);
      } else {
        setErrorMsg(res.data?.error || 'Schema initialization failed.');
        if (res.data?.steps) setSchemaSteps(res.data.steps);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Initialization failed.');
    } finally {
      setInitializing(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAdmin(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/setup/admin', {
        fullName: adminFullName.trim(),
        email: adminEmail.trim(),
        username: adminUsername.trim(),
        password: adminPassword,
      });

      if (res.data?.success) {
        await refreshDbStatus();
        setStep(7);
      } else {
        setErrorMsg(res.data?.error || 'Failed to provision administrator.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to provision admin.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-2xl w-full mx-auto space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-2">
            <Library className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Library Management System</h1>
          <p className="text-xs text-slate-400">First-Run Configuration & Setup Wizard</p>
        </div>

        {/* Wizard Stepper Bar (Steps 1 to 7) */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 shadow-xl">
          <div className="flex items-center justify-between text-xs font-medium">
            {[
              { num: 1, title: 'Welcome' },
              { num: 2, title: 'PostgreSQL' },
              { num: 3, title: 'Test' },
              { num: 4, title: 'Connect' },
              { num: 5, title: 'Schema' },
              { num: 6, title: 'Admin' },
              { num: 7, title: 'Complete' },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    step === s.num
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span
                  className={`mt-1.5 text-[10px] hidden sm:block ${
                    step === s.num ? 'text-blue-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Alert Banners */}
        {errorMsg && (
          <div className="p-4 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-xs text-rose-200 flex items-start space-x-3 shadow-lg animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-start space-x-3 shadow-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* Wizard Main Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/60 p-8 shadow-2xl space-y-6">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Welcome to your LMS</h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  Connect your PostgreSQL database to store book catalogs, physical copies, e-books, patrons, seat
                  allocations, and activity audit trails.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700/60 text-xs text-slate-400 text-left space-y-2 max-w-md mx-auto">
                <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span>Setup Overview</span>
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Configure host, port, database name, and credentials.</li>
                  <li>Verify connection reachability and user privileges.</li>
                  <li>Safely initialize LMS tables without overwriting existing data.</li>
                  <li>Create your initial Superadmin account.</li>
                </ul>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all inline-flex items-center space-x-2 cursor-pointer"
                >
                  <span>Begin Database Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE POSTGRESQL */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-700 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  <span>Configure PostgreSQL Credentials</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Specify connection details for your target PostgreSQL server.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Database Host *
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="localhost or db.server.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Port *
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10) || 5432)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Database Name *
                  </label>
                  <input
                    type="text"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="library_db"
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="postgres"
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    SSL Mode
                  </label>
                  <select
                    value={sslMode}
                    onChange={(e) => setSslMode(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="disable">Disabled (Localhost / Docker)</option>
                    <option value="require">Required (Cloud SSL)</option>
                    <option value="verify-ca">Verify CA</option>
                    <option value="verify-full">Verify Full</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-blue-600/30"
                >
                  <span>Proceed to Test Connection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: TEST CONNECTION */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-700 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span>Test PostgreSQL Connectivity</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Validate target reachability, credentials, and schema privileges before saving.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Server:</span>
                  <span className="font-mono text-white font-semibold">{host}:{port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Database:</span>
                  <span className="font-mono text-white font-semibold">{database}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">User:</span>
                  <span className="font-mono text-white font-semibold">{user}</span>
                </div>
              </div>

              {testResult && (
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700 space-y-3 text-xs animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{testResult.message}</span>
                    </span>
                    <span className="text-slate-400 font-mono">{testResult.latencyMs}ms</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400">Schema State: </span>
                      <StatusBadge status={testResult.schemaStatus} size="sm" />
                    </div>
                    <div>
                      <span className="text-slate-400">Tables Found: </span>
                      <span className="font-semibold text-white">{testResult.tableCount} tables</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Edit Credentials</span>
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-2"
                  >
                    {testing && <Server className="w-3.5 h-3.5 animate-spin" />}
                    <span>{testing ? 'Testing...' : 'Run Test Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={!testResult?.reachable}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Proceed to Save</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SAVE & CONNECT */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-700 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  <span>Save Configuration & Connect</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Encrypt credentials into server-side storage and establish connection pool.
                </p>
              </div>

              <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-xs text-blue-200 leading-relaxed">
                Credentials will be encrypted with AES-256-GCM using your server's secret encryption key. The
                plaintext password will never be stored in browser files or logged to the console.
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConnection}
                  disabled={savingConfig}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  {savingConfig && <Database className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingConfig ? 'Saving & Connecting...' : 'Connect Database'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: INITIALIZE SCHEMA */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="border-b border-slate-700 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  <span>Initialize or Verify Database Schema</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ensure required tables and relations (Books, Copies, Users, Seats, Issues) are present.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700 space-y-3 text-xs">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedDemo}
                    onChange={(e) => setSeedDemo(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500"
                  />
                  <span className="text-slate-300 font-medium">
                    Seed sample demo library data (books, copies, categories, seats, patrons)
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-7">
                  Existing records will not be overwritten.
                </p>
              </div>

              {schemaSteps.length > 0 && (
                <div className="space-y-2 text-xs">
                  {schemaSteps.map((st, i) => (
                    <div key={i} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-start space-x-2">
                      <span className="font-mono text-blue-400">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{st.step}</div>
                        <div className="text-[11px] text-slate-400">{st.message}</div>
                      </div>
                      <StatusBadge status={st.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleInitializeDatabase}
                  disabled={initializing}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  {initializing && <Layers className="w-3.5 h-3.5 animate-spin" />}
                  <span>{initializing ? 'Initializing Schema...' : 'Initialize Schema & Continue'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: CREATE FIRST ADMIN */}
          {step === 6 && (
            <form onSubmit={handleCreateAdmin} className="space-y-6">
              <div className="border-b border-slate-700 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  <span>Provision Primary Administrator</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Create the initial Superadmin account to manage books, patrons, and settings.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Full Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Username *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Admin Password (Min 8 characters) *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  {creatingAdmin && <UserPlus className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creatingAdmin ? 'Creating Administrator...' : 'Create Admin Account'}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 7: SETUP COMPLETED */}
          {step === 7 && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Setup Successfully Completed!</h2>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your PostgreSQL database is connected and initialized. Your primary administrator account is ready.
                  You may now sign in to access the administration portal.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700/60 max-w-sm mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Database:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{database}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admin User:</span>
                  <span className="font-mono text-white font-semibold">{adminUsername}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Security:</span>
                  <span className="text-emerald-400 font-semibold">Configured</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center space-x-2 cursor-pointer"
                >
                  <span>Open Admin Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
