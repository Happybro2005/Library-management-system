import React, { useState, useEffect } from 'react';
import { Repeat, Plus, CheckCircle2, AlertCircle, X, Search, Check } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export const IssuesPage: React.FC = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [returningIssue, setReturningIssue] = useState<any | null>(null);

  // Issue Form
  const [userId, setUserId] = useState('');
  const [copyBarcode, setCopyBarcode] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [patrons, setPatrons] = useState<any[]>([]);

  // Return Form
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await api.get('/book-issues', {
        params: { status: statusFilter || undefined, limit: 100 },
      });
      if (res.data?.success) {
        const list = res.data.data?.issues || (Array.isArray(res.data.data) ? res.data.data : []);
        setIssues(list);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPatrons = async () => {
    try {
      const res = await api.get('/users?status=ACTIVE&limit=100');
      if (res.data?.success) {
        const list = res.data.data?.users || (Array.isArray(res.data.data) ? res.data.data : []);
        setPatrons(list);
        if (list.length > 0) {
          setUserId(list[0].id);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchIssues();
    fetchPatrons();
  }, [statusFilter]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.post('/book-issues/issue', {
        userId,
        copyBarcode: copyBarcode.trim(),
        notes: issueNotes.trim() || undefined,
      });

      if (res.data?.success) {
        setIsIssueOpen(false);
        setCopyBarcode('');
        setIssueNotes('');
        setFeedback({ type: 'success', text: 'Book copy issued to patron successfully!' });
        fetchIssues();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to issue book.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningIssue) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.post(`/book-issues/${returningIssue.id}/return`, {
        copyCondition: returnCondition,
        notes: returnNotes.trim() || undefined,
      });

      if (res.data?.success) {
        setReturningIssue(null);
        setReturnNotes('');
        setFeedback({ type: 'success', text: 'Book returned and checked back into inventory!' });
        fetchIssues();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to return book.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Book Issues & Circulation</h1>
          <p className="text-xs text-slate-500 mt-0.5">Simple issue and return tracking (no dues or penalties)</p>
        </div>

        <button
          onClick={() => setIsIssueOpen(true)}
          className="px-4 py-2.5 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Issue Book to Patron</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-zinc-100 text-zinc-900 border border-zinc-300'
              : 'bg-zinc-900 text-white border border-zinc-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-zinc-800 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-zinc-500">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-800 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800"
          >
            <option value="">All Issues</option>
            <option value="ISSUED">Currently Borrowed</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-xl border border-zinc-200/90 shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Book Title & Barcode</th>
              <th className="py-3 px-4">Patron</th>
              <th className="py-3 px-4">Issued On</th>
              <th className="py-3 px-4">Returned On</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {issues.length > 0 ? (
              issues.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{i.copy?.book?.title}</div>
                    <div className="text-[11px] font-mono text-slate-500">Barcode: {i.copy?.barcode}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{i.user?.fullName}</div>
                    <div className="text-[11px] font-mono text-slate-400">{i.user?.membershipNo}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{new Date(i.issueDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {i.returnDate ? new Date(i.returnDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        i.status === 'ISSUED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {i.status === 'ISSUED' ? 'Borrowed' : 'Returned'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {i.status === 'ISSUED' && (
                      <button
                        onClick={() => setReturningIssue(i)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Return</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  {loading ? 'Loading issue records...' : 'No circulation records found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Issue Book */}
      {isIssueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Repeat className="w-4 h-4 text-blue-600" />
                <span>Issue Book to Patron</span>
              </h3>
              <button onClick={() => setIsIssueOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssue} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Patron *</label>
                <select
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {patrons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.membershipNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Book Copy Barcode *</label>
                <input
                  type="text"
                  required
                  value={copyBarcode}
                  onChange={(e) => setCopyBarcode(e.target.value)}
                  placeholder="e.g. BAR-7320-1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Optional Notes</label>
                <input
                  type="text"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="e.g. Issued for reading assignment"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIssueOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  {saving ? 'Processing...' : 'Confirm Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Return Book */}
      {returningIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Return Book: {returningIssue.copy?.book?.title}</span>
              </h3>
              <button onClick={() => setReturningIssue(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReturn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Returned Copy Condition *</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Return Notes</label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Optional check-in inspection notes"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturningIssue(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {saving ? 'Processing...' : 'Complete Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
