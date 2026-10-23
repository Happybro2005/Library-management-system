import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  Phone,
  BookOpen,
  Armchair,
  ExternalLink,
  IdCard,
  Clock,
  Sparkles,
  Ban,
  UserCheck,
  Copy,
  Check,
  LayoutDashboard,
  Eye,
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { usePatronAuth } from '../context/PatronAuthContext';
import { ConfirmModal } from '../components/ConfirmModal';

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminViewLogin } = usePatronAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Detail Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [searchParams] = useSearchParams();

  // Block / Unblock Confirmation State
  const [blockTarget, setBlockTarget] = useState<{ user: any; action: 'BLOCK' | 'UNBLOCK' } | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  // Created / Generated Credentials State
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    membershipNo: string;
    email: string;
    password: string;
    allottedSeat?: {
      id?: string;
      seatNumber: number;
      label: string;
      section: string;
    } | null;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipNo, setMembershipNo] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [selectedSeatId, setSelectedSeatId] = useState('');
  const [availableSeats, setAvailableSeats] = useState<any[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [status, setStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenAddModal = async () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setMembershipNo('');
    setInitialPassword(`Lib@${Math.floor(100000 + Math.random() * 900000)}`);
    setSelectedSeatId('');
    setModalFeedback(null);
    setIsAddOpen(true);
    setSeatsLoading(true);
    try {
      const res = await api.get('/seats');
      if (res.data?.success && res.data.data?.seats) {
        const available = res.data.data.seats.filter((s: any) => s.status === 'AVAILABLE');
        setAvailableSeats(available);
      }
    } catch {
      // ignore
    } finally {
      setSeatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      if (res.data?.success) {
        setUsers(res.data.data.users || res.data.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      handleOpenAddModal();
    }
  }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalFeedback(null);
    setFeedback(null);

    try {
      const res = await api.post('/users', {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        membershipNo: membershipNo.trim() || undefined,
        status,
        password: initialPassword.trim() || undefined,
        seatId: selectedSeatId || undefined,
      });

      if (res.data?.success) {
        const created = res.data.data;
        setIsAddOpen(false);
        setFullName('');
        setEmail('');
        setPhone('');
        setMembershipNo('');
        setInitialPassword('');
        setSelectedSeatId('');
        setModalFeedback(null);
        setCreatedCredentials({
          fullName: created.fullName,
          membershipNo: created.membershipNo,
          email: created.email,
          password: created.initialPassword,
          allottedSeat: created.allottedSeat || null,
        });
        setFeedback({
          type: 'success',
          text: `Member "${created.fullName}" added successfully!${created.allottedSeat ? ` Study desk ${created.allottedSeat.label} allotted.` : ''} Login credentials have been generated.`,
        });
        fetchUsers();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        err.message ||
        'Failed to add member.';
      setModalFeedback({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/users/${userId}`);
      if (res.data?.success) {
        setSelectedUser(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewMemberDashboard = async (memNo: string) => {
    try {
      await adminViewLogin(memNo);
      navigate('/portal');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to open member portal.',
      });
    }
  };



  const copyCredentialsText = (creds: {
    fullName: string;
    membershipNo: string;
    email: string;
    password: string;
    allottedSeat?: {
      id?: string;
      seatNumber: number;
      label: string;
      section: string;
    } | null;
  }) => {
    let text = `Library Member Account Details:\nName: ${creds.fullName}\nMembership ID: ${creds.membershipNo}\nEmail: ${creds.email}\nInitial Password: ${creds.password}`;
    if (creds.allottedSeat) {
      text += `\nAllotted Study Seat: ${creds.allottedSeat.label} (${creds.allottedSeat.section})`;
    }
    text += `\nMember Portal: ${window.location.origin}/portal/login`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleConfirmToggleBlock = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    const targetUser = blockTarget.user;
    const newStatus = blockTarget.action === 'BLOCK' ? 'BLOCKED' : 'ACTIVE';

    try {
      const res = await api.put(`/users/${targetUser.id}`, { status: newStatus });
      if (res.data?.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, status: newStatus } : u))
        );
        if (selectedUser && selectedUser.id === targetUser.id) {
          setSelectedUser((prev: any) => ({ ...prev, status: newStatus }));
        }
        setFeedback({
          type: 'success',
          text: `Patron "${targetUser.fullName}" has been ${newStatus === 'BLOCKED' ? 'blocked' : 'unblocked and restored to active status'}.`,
        });
        setBlockTarget(null);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.error || err.message || `Failed to update patron status.`,
      });
    } finally {
      setBlockLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Library Members</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage member accounts, active borrowings, and individual profiles</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
          id="add-member-btn"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
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

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            placeholder="Search by name, email, or membership number..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 w-full sm:w-auto"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="BLOCKED">Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Patron Name</th>
              <th className="py-3 px-4">Membership No</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Active Borrowings</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length > 0 ? (
              users.map((u) => {
                const activeCount = u.currentlyBorrowedCount || u.bookIssues?.filter((i: any) => i.status === 'ISSUED').length || 0;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{u.fullName}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-700">
                      {u.membershipNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.phone || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={u.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{activeCount} books</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleViewMemberDashboard(u.membershipNo)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer flex items-center space-x-1"
                          title="Inspect member portal without password"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Dashboard</span>
                        </button>

                        <button
                          onClick={() => handleOpenDetail(u.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                          title="View member account details"
                        >
                          Details
                        </button>



                        {u.status === 'BLOCKED' ? (
                          <button
                            onClick={() => setBlockTarget({ user: u, action: 'UNBLOCK' })}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer flex items-center space-x-1"
                            title="Unblock patron account"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Unblock</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setBlockTarget({ user: u, action: 'BLOCK' })}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-colors cursor-pointer flex items-center space-x-1"
                            title="Block patron account"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Block</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  {loading ? 'Loading patrons...' : 'No registered patrons found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Patron */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Add Member</span>
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {modalFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Membership No</label>
                  <input
                    type="text"
                    value={membershipNo}
                    onChange={(e) => setMembershipNo(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">Initial Password</label>
                  <button
                    type="button"
                    onClick={() => setInitialPassword(`Lib@${Math.floor(100000 + Math.random() * 900000)}`)}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer font-medium"
                  >
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  placeholder="Leave empty to auto-generate secure password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Full login credentials will be displayed for you to copy and provide to the member upon creation.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                  <span>Allot Study Seat (Optional)</span>
                  {seatsLoading && <span className="text-[10px] text-slate-400 font-normal">Loading desks...</span>}
                </label>
                <select
                  value={selectedSeatId}
                  onChange={(e) => setSelectedSeatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="">-- No study seat allotted at registration --</option>
                  {availableSeats.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      {seat.label} ({seat.section}) &bull; Desk #{seat.seatNumber}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Member can also change or select their seat anytime directly from their portal dashboard.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg font-semibold shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>{saving ? 'Adding...' : 'Add Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patron Detail & Activity Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-base shadow-xs">
                  {selectedUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedUser.fullName}</h2>
                    <StatusBadge status={selectedUser.status} size="sm" />
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedUser.membershipNo} &bull; {selectedUser.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100">
                <div className="text-xs text-blue-700 font-medium">Currently Borrowed</div>
                <div className="text-xl font-bold text-blue-900 mt-0.5">
                  {selectedUser.activeIssues?.length || 0}
                </div>
              </div>
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                <div className="text-xs text-emerald-700 font-medium">Returned Books</div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">
                  {selectedUser.returnedIssues?.length || 0}
                </div>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100">
                <div className="text-xs text-amber-700 font-medium">Active Study Desk</div>
                <div className="text-xs font-bold text-amber-900 mt-1 truncate">
                  {selectedUser.activeSeat ? `${selectedUser.activeSeat.label}` : 'None Assigned'}
                </div>
              </div>
            </div>

            {/* Active Book Issues */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Currently Issued Books ({selectedUser.activeIssues?.length || 0})</span>
              </h3>

              {selectedUser.activeIssues && selectedUser.activeIssues.length > 0 ? (
                <div className="space-y-2">
                  {selectedUser.activeIssues.map((issue: any) => (
                    <div
                      key={issue.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{issue.copy.book.title}</div>
                        <div className="text-[11px] text-slate-500">
                          by {issue.copy.book.author} &bull; Barcode: {issue.copy.barcode}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        <span>Issued {new Date(issue.issueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  No books currently borrowed.
                </div>
              )}
            </div>

            {/* Reading History */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Past Returned History ({selectedUser.returnedIssues?.length || 0})</span>
              </h3>

              {selectedUser.returnedIssues && selectedUser.returnedIssues.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1">
                  {selectedUser.returnedIssues.map((issue: any) => (
                    <div key={issue.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-slate-800">{issue.copy.book.title}</div>
                        <div className="text-[11px] text-slate-400">by {issue.copy.book.author}</div>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        Returned {new Date(issue.returnDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  No return history yet.
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleViewMemberDashboard(selectedUser.membershipNo)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  title="Inspect member portal without password"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Member Portal (No Password)</span>
                </button>



                {selectedUser.status === 'BLOCKED' ? (
                  <button
                    type="button"
                    onClick={() => setBlockTarget({ user: selectedUser, action: 'UNBLOCK' })}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Unblock Patron</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBlockTarget({ user: selectedUser, action: 'BLOCK' })}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Block Patron</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Login Details Modal (After Registration or Reset) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Member Login Details</h3>
                <p className="text-xs text-slate-500">Credentials to provide to the user</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Member Name:</span>
                <span className="font-bold text-slate-900">{createdCredentials.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Membership ID:</span>
                <span className="font-mono font-bold text-indigo-600">{createdCredentials.membershipNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-700">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-semibold">Initial Password:</span>
                <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {createdCredentials.password}
                </span>
              </div>
              {createdCredentials.allottedSeat && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold">Allotted Study Seat:</span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                    {createdCredentials.allottedSeat.label} ({createdCredentials.allottedSeat.section})
                  </span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/60 p-3 rounded-xl border border-blue-100 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Provide these credentials to the user. The member can log in to the Member Portal and change their password from their dashboard at any time.
              </span>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => copyCredentialsText(createdCredentials)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Block / Unblock Confirmation Modal */}
      {blockTarget && (
        <ConfirmModal
          isOpen={Boolean(blockTarget)}
          title={blockTarget.action === 'BLOCK' ? 'Block Patron Account' : 'Unblock Patron Account'}
          message={
            blockTarget.action === 'BLOCK'
              ? `Are you sure you want to block ${blockTarget.user.fullName} (${blockTarget.user.membershipNo})? They will immediately be prohibited from logging into the Member Portal, checking out books, and booking study desks.`
              : `Are you sure you want to unblock ${blockTarget.user.fullName} (${blockTarget.user.membershipNo})? Their account status will be restored to ACTIVE, allowing them to access the library portal and borrow books.`
          }
          confirmLabel={blockTarget.action === 'BLOCK' ? 'Block Patron' : 'Unblock Patron'}
          cancelLabel="Cancel"
          isDestructive={blockTarget.action === 'BLOCK'}
          isLoading={blockLoading}
          onConfirm={handleConfirmToggleBlock}
          onCancel={() => setBlockTarget(null)}
        />
      )}
    </div>
  );
};
