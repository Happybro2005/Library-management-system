import React, { useState, useEffect } from 'react';
import { Database, Building2, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { api } from '../api/client';
import { DatabaseConfigPage } from './DatabaseConfigPage';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'database'>('general');

  // Library Settings State
  const [libraryName, setLibraryName] = useState('City Central Library');
  const [email, setEmail] = useState('contact@citylibrary.org');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [address, setAddress] = useState('100 Library Square, Suite 400');
  const [defaultSeatCapacity, setDefaultSeatCapacity] = useState(30);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.success && res.data.data) {
        const s = res.data.data;
        if (s.libraryName) setLibraryName(s.libraryName);
        if (s.email) setEmail(s.email);
        if (s.phone) setPhone(s.phone);
        if (s.address) setAddress(s.address);
        if (s.defaultSeatCapacity) setDefaultSeatCapacity(s.defaultSeatCapacity);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.put('/settings', {
        libraryName,
        email,
        phone,
        address,
        defaultSeatCapacity: Number(defaultSeatCapacity),
      });

      if (res.data?.success) {
        setFeedback({ type: 'success', text: 'Library configuration saved successfully!' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">System Settings</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Configure institutional preferences and PostgreSQL database connection</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 space-x-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Library Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'database'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Database Configuration</span>
        </button>
      </div>

      {activeTab === 'database' ? (
        <DatabaseConfigPage />
      ) : (
        <div className="bg-zinc-900/90 rounded-3xl border border-zinc-800 shadow-sm p-6 max-w-2xl space-y-6">
          {feedback && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center space-x-2 bg-zinc-950 border border-zinc-800 text-zinc-200`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Library Name *</label>
              <input
                type="text"
                required
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Default Study Desk Capacity</label>
              <input
                type="number"
                min={1}
                value={defaultSeatCapacity}
                onChange={(e) => setDefaultSeatCapacity(parseInt(e.target.value, 10) || 30)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl font-semibold shadow-xs flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
