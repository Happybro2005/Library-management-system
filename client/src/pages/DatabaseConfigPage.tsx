import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Server,
  Shield,
  Layers,
  Sparkles,
  PowerOff,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';

interface TestResultData {
  reachable: boolean;
  latencyMs: number;
  schemaStatus: 'EMPTY' | 'COMPATIBLE' | 'INCOMPATIBLE';
  tableCount: number;
  tables: string[];
  hasAdminUser: boolean;
  privileges: {
    canConnect: boolean;
    canCreate: boolean;
    canUsage: boolean;
  };
  message: string;
}

export const DatabaseConfigPage: React.FC = () => {
  const { dbStatus, refreshDbStatus, admin } = useAuth();

  // Form State
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [database, setDatabase] = useState('library_db');
  const [user, setUser] = useState('postgres');
  const [password, setPassword] = useState('');
  const [sslMode, setSslMode] = useState<'disable' | 'require' | 'verify-ca' | 'verify-full'>('disable');
  const [sslCa, setSslCa] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Operation States
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Feedback Messages
  const [testResult, setTestResult] = useState<TestResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [initSteps, setInitSteps] = useState<any[] | null>(null);

  // Confirmation Modals
  const [isConfirmConnectOpen, setIsConfirmConnectOpen] = useState(false);
  const [isConfirmDisconnectOpen, setIsConfirmDisconnectOpen] = useState(false);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  // Sync with current status
  useEffect(() => {
    if (dbStatus?.currentConfig) {
      if (dbStatus.currentConfig.host) setHost(dbStatus.currentConfig.host);
      if (dbStatus.currentConfig.port) setPort(dbStatus.currentConfig.port);
      if (dbStatus.currentConfig.database) setDatabase(dbStatus.currentConfig.database);
      if (dbStatus.currentConfig.user) setUser(dbStatus.currentConfig.user);
      if (dbStatus.currentConfig.sslMode) setSslMode(dbStatus.currentConfig.sslMode as any);
      // Mask password for existing config
      if (dbStatus.isConfigured) {
        setPassword('••••••••••••');
      }
    }
  }, [dbStatus]);

  const handleResetForm = () => {
    if (dbStatus?.currentConfig) {
      setHost(dbStatus.currentConfig.host || 'localhost');
      setPort(dbStatus.currentConfig.port || 5432);
      setDatabase(dbStatus.currentConfig.database || 'library_db');
      setUser(dbStatus.currentConfig.user || 'postgres');
      setSslMode((dbStatus.currentConfig.sslMode as any) || 'disable');
      setPassword(dbStatus.isConfigured ? '••••••••••••' : '');
    }
    setTestResult(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setInitSteps(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTestResult(null);

    try {
      const payload: any = {
        host: host.trim(),
        port: Number(port),
        database: database.trim(),
        user: user.trim(),
        sslMode,
        sslCa: sslCa.trim() || undefined,
      };

      // If user hasn't changed the masked password, omit or leave as is
      if (password !== '••••••••••••') {
        payload.password = password;
      }

      const res = await api.post('/setup/database/test', payload);
      if (res.data?.success) {
        setTestResult(res.data.data);
        setSuccessMsg(res.data.data.message);
      } else {
        setErrorMsg(res.data?.error || 'Connection failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const executeConnect = async () => {
    setConnecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        host: host.trim(),
        port: Number(port),
        database: database.trim(),
        user: user.trim(),
        sslMode,
        sslCa: sslCa.trim() || undefined,
        adminPassword: adminPasswordConfirm || undefined,
      };

      if (password !== '••••••••••••') {
        payload.password = password;
      }

      const res = await api.post('/setup/database/connect', payload);
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setIsConfirmConnectOpen(false);
        setAdminPasswordConfirm('');
        await refreshDbStatus();
      } else {
        setErrorMsg(res.data?.error || 'Failed to connect database.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  const handleInitializeSchema = async () => {
    setInitializing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/setup/database/initialize');
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setInitSteps(res.data.steps);
        await refreshDbStatus();
      } else {
        setErrorMsg(res.data?.error || 'Schema initialization failed.');
        if (res.data?.steps) setInitSteps(res.data.steps);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Schema initialization failed.');
    } finally {
      setInitializing(false);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/setup/database/seed');
      if (res.data?.success) {
        setSuccessMsg(
          `Demo data populated: ${res.data.details?.booksCreated || 0} books, ${
            res.data.details?.usersCreated || 0
          } patrons, and ${res.data.details?.seatsCreated || 0} seats created.`
        );
        await refreshDbStatus();
      } else {
        setErrorMsg(res.data?.error || 'Seeding failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to seed demo data.');
    } finally {
      setSeeding(false);
    }
  };

  const executeDisconnect = async () => {
    setDisconnecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/setup/database/disconnect');
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setIsConfirmDisconnectOpen(false);
        await refreshDbStatus();
      } else {
        setErrorMsg(res.data?.error || 'Disconnection failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to disconnect.');
    } finally {
      setDisconnecting(false);
    }
  };

  const connectionStatus = dbStatus?.connectionStatus || 'NOT_CONFIGURED';

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-zinc-100">
      {/* Page Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Database Configuration</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connect and manage PostgreSQL database credentials, schema migration, and pooling.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refreshDbStatus()}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs text-zinc-400 font-medium">Status:</span>
            <StatusBadge status={connectionStatus} />
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-2xl text-xs text-white flex items-start space-x-3 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-zinc-300 flex items-start space-x-3 shadow-xs">
          <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Credentials Form */}
        <div className="lg:col-span-2 bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-white" />
              <h2 className="text-sm font-bold text-white">PostgreSQL Connection Parameters</h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">Encrypted at rest (AES-256-GCM)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Host */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Database Host <span className="text-zinc-500">*</span>
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g. localhost or postgres.host.com"
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1">Hostname or IP address of the PostgreSQL server.</p>
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Port <span className="text-zinc-500">*</span>
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 5432)}
                placeholder="5432"
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1">Default PostgreSQL port is 5432.</p>
            </div>

            {/* Database Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Database Name <span className="text-zinc-500">*</span>
              </label>
              <input
                type="text"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="library_db"
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1">Target PostgreSQL database catalog name.</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Username <span className="text-zinc-500">*</span>
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="postgres"
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1">User must have CONNECT and CREATE privileges.</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter database password"
                  className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Never logged or returned in API responses.</p>
            </div>

            {/* SSL Mode */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                SSL Mode
              </label>
              <select
                value={sslMode}
                onChange={(e) => setSslMode(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              >
                <option value="disable">Disabled (Plain TCP / Localhost)</option>
                <option value="require">Required (TLS encrypted, skip CA verify)</option>
                <option value="verify-ca">Verify CA (Validate server certificate)</option>
                <option value="verify-full">Verify Full (Validate certificate & hostname)</option>
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">Use 'Required' for AWS RDS, Supabase, Neon, etc.</p>
            </div>
          </div>

          {/* SSL CA Certificate textarea if verify-ca or verify-full */}
          {(sslMode === 'verify-ca' || sslMode === 'verify-full') && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Custom SSL CA Certificate (PEM Format)
              </label>
              <textarea
                rows={3}
                value={sslCa}
                onChange={(e) => setSslCa(e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                className="w-full px-3.5 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white font-mono"
              />
            </div>
          )}

          {/* Form Actions: Test, Connect, Cancel */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel / Reset
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || connecting}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {testing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Shield className="w-3.5 h-3.5" />
                )}
                <span>{testing ? 'Testing Connection...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmConnectOpen(true)}
                disabled={connecting || testing}
                className="px-5 py-2.5 text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {connecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-black" />
                )}
                <span>{connecting ? 'Connecting...' : 'Connect Database'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Diagnostics & Schema Management */}
        <div className="space-y-6">
          {/* Active Connection Summary */}
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Server className="w-4 h-4 text-zinc-400" />
              <span>Current Status</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Connection:</span>
                <StatusBadge status={connectionStatus} size="sm" />
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Active Host:</span>
                <span className="font-mono text-white font-semibold">{dbStatus?.currentConfig?.host || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Database:</span>
                <span className="font-mono text-white font-semibold">{dbStatus?.currentConfig?.database || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Schema Status:</span>
                <StatusBadge status={dbStatus?.schemaStatus || 'UNKNOWN'} size="sm" />
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">LMS Tables:</span>
                <span className="font-semibold text-white">{dbStatus?.tableCount || 0} / 9 detected</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Security:</span>
                <span className="text-zinc-200 font-semibold flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-white" />
                  <span>AES-256-GCM Encrypted</span>
                </span>
              </div>
            </div>

            {connectionStatus === 'CONNECTED' && (
              <button
                type="button"
                onClick={() => setIsConfirmDisconnectOpen(true)}
                disabled={disconnecting}
                className="w-full mt-2 px-3 py-2 text-xs font-medium text-zinc-300 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Disconnect Database</span>
              </button>
            )}
          </div>

          {/* Schema & Data Actions */}
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-white" />
              <span>Database Operations</span>
            </h3>

            <p className="text-xs text-zinc-400">
              Apply version-controlled Prisma DDL schema or seed initial library data.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleInitializeSchema}
                disabled={initializing || connectionStatus !== 'CONNECTED'}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-white" />
                  <span>Initialize Schema</span>
                </div>
                {initializing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              </button>

              <button
                type="button"
                onClick={handleSeedDemoData}
                disabled={seeding || connectionStatus !== 'CONNECTED'}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Seed Demo Library Data</span>
                </div>
                {seeding && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              </button>
            </div>
          </div>

          {/* Managed Hosting Advisory Note */}
          <div className="bg-zinc-950 text-zinc-300 rounded-2xl p-4 text-xs space-y-2 border border-zinc-800 shadow-sm">
            <div className="flex items-center space-x-2 text-white font-semibold">
              <HelpCircle className="w-4 h-4 text-zinc-300" />
              <span>Managed Cloud Environments</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              When hosting on cloud platforms (AWS RDS, GCP Cloud SQL, Supabase, Neon, Railway):
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400">
              <li>Set <strong>SSL Mode</strong> to <code className="text-white font-mono">Required</code>.</li>
              <li>Ensure your cloud database security group allows inbound connections from this server's IP address.</li>
              <li>Metadata IP endpoints (e.g. 169.254.169.254) are strictly blocked for SSRF protection.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Test Result Inspector Card */}
      {testResult && (
        <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 shadow-sm animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Connection Test Diagnostics</span>
            </h3>
            <span className="text-xs font-mono text-white bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
              Latency: {testResult.latencyMs}ms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 block mb-1">Schema Status:</span>
              <StatusBadge status={testResult.schemaStatus} />
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 block mb-1">Detected Tables:</span>
              <span className="font-semibold text-white">{testResult.tableCount} tables found</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 block mb-1">Privileges:</span>
              <span className="text-white">
                Connect: {testResult.privileges.canConnect ? '✅' : '❌'} | Create:{' '}
                {testResult.privileges.canCreate ? '✅' : '❌'}
              </span>
            </div>
          </div>

          {testResult.tables.length > 0 && (
            <div className="text-xs text-zinc-400">
              <span className="font-medium text-white">Public Schema Tables: </span>
              <span className="font-mono text-[11px] text-zinc-300">
                {testResult.tables.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Migration Step Diagnostics Card */}
      {initSteps && initSteps.length > 0 && (
        <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-white" />
            <span>Schema Initialization Execution Steps</span>
          </h3>
          <div className="space-y-2">
            {initSteps.map((step, idx) => (
              <div key={idx} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs flex items-start space-x-3">
                <span className="font-mono font-bold text-white">{idx + 1}.</span>
                <div className="flex-1">
                  <div className="font-semibold text-white">{step.step}</div>
                  <div className="text-zinc-400 mt-0.5">{step.message}</div>
                </div>
                <StatusBadge status={step.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Connect & Switch Database */}
      <ConfirmModal
        isOpen={isConfirmConnectOpen}
        title="Confirm Database Configuration Change"
        message={`Are you sure you want to switch the application to PostgreSQL database '${database}' on host '${host}:${port}'?`}
        warningNote="Switching databases will cause active sessions and current library data to reflect the new target database. The previous configuration will remain backed up and recoverable if the new connection fails."
        confirmLabel="Connect & Apply Configuration"
        cancelLabel="Keep Current Configuration"
        requirePassword={dbStatus?.hasAdmin && Boolean(admin)}
        passwordValue={adminPasswordConfirm}
        onPasswordChange={setAdminPasswordConfirm}
        isLoading={connecting}
        onConfirm={executeConnect}
        onCancel={() => {
          setIsConfirmConnectOpen(false);
          setAdminPasswordConfirm('');
        }}
      />

      {/* Confirmation Dialog: Disconnect Database */}
      <ConfirmModal
        isOpen={isConfirmDisconnectOpen}
        title="Confirm Database Disconnection"
        message="Are you sure you want to disconnect the active PostgreSQL database? The LMS will enter an unconfigured state until a database is reconnected."
        warningNote="Active library operations and user sessions will be paused until a working PostgreSQL database is connected."
        confirmLabel="Disconnect Database"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={disconnecting}
        onConfirm={executeDisconnect}
        onCancel={() => setIsConfirmDisconnectOpen(false)}
      />
    </div>
  );
};
