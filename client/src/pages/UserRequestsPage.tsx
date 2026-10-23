import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Armchair,
  ArrowRight,
  User,
  MessageSquare,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { api } from '../api/client';

export interface SeatChangeRequestItem {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    membershipNo: string;
    email: string;
    phone?: string;
    status: string;
  };
  currentSeatId: string;
  currentSeat: {
    id: string;
    seatNumber: number;
    label: string;
    section: string;
    status: string;
  };
  requestedSeatId: string;
  requestedSeat: {
    id: string;
    seatNumber: number;
    label: string;
    section: string;
    status: string;
  };
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  adminNotes?: string;
  reviewedByAdmin?: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const UserRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SeatChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Action Dialog State
  const [selectedRequest, setSelectedRequest] = useState<SeatChangeRequestItem | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRequests = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/seats/requests');
      if (res.data?.success) {
        setRequests(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch seat change requests:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to fetch user requests.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenAction = (req: SeatChangeRequestItem, type: 'APPROVE' | 'REJECT') => {
    setSelectedRequest(req);
    setActionType(type);
    setAdminNotes('');
  };

  const handleCloseAction = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAdminNotes('');
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;
    setActionSubmitting(true);
    setFeedback(null);

    try {
      const endpoint =
        actionType === 'APPROVE'
          ? `/seats/requests/${selectedRequest.id}/approve`
          : `/seats/requests/${selectedRequest.id}/reject`;

      const res = await api.post(endpoint, { adminNotes: adminNotes.trim() || undefined });
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message:
            actionType === 'APPROVE'
              ? `Seat change approved! ${selectedRequest.user.fullName} is now assigned to ${selectedRequest.requestedSeat.label}.`
              : `Seat change request rejected. ${selectedRequest.user.fullName}'s seat remains unchanged.`,
        });
        handleCloseAction();
        await fetchRequests();
        setTimeout(() => setFeedback(null), 6000);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || `Failed to ${actionType.toLowerCase()} request.`,
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    // Tab filter
    if (activeTab === 'PENDING' && req.status !== 'PENDING') return false;
    if (activeTab === 'APPROVED' && req.status !== 'APPROVED') return false;
    if (activeTab === 'REJECTED' && req.status !== 'REJECTED') return false;

    // Search filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.user.fullName.toLowerCase().includes(q) ||
      req.user.membershipNo.toLowerCase().includes(q) ||
      req.currentSeat.label.toLowerCase().includes(q) ||
      req.requestedSeat.label.toLowerCase().includes(q) ||
      (req.reason && req.reason.toLowerCase().includes(q))
    );
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
              <Inbox className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2.5">
                <span>User Requests</span>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-white text-black rounded-full">
                    {pendingCount} Pending
                  </span>
                )}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Review and approve or reject patron study desk change requests
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchRequests}
            disabled={refreshing}
            id="refresh-requests-btn"
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-zinc-900 border-emerald-500/50 text-emerald-300'
              : 'bg-zinc-900 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'PENDING'
              ? 'bg-zinc-800/80 border-white text-white'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{pendingCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Awaiting decision</div>
        </div>

        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'ALL'
              ? 'bg-zinc-800/80 border-white text-white'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium">Total Requests</span>
            <Inbox className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-white">{requests.length}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">All time submissions</div>
        </div>

        <div
          onClick={() => setActiveTab('APPROVED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'APPROVED'
              ? 'bg-zinc-800/80 border-white text-white'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{approvedCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Seat assigned</div>
        </div>

        <div
          onClick={() => setActiveTab('REJECTED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'REJECTED'
              ? 'bg-zinc-800/80 border-white text-white'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white">{rejectedCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Seat unchanged</div>
        </div>
      </div>

      {/* Search & Tabs Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'PENDING'
                ? 'bg-white text-black shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'PENDING' ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-white text-black shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <span>All Requests</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'ALL' ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300'}`}>
              {requests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'APPROVED'
                ? 'bg-white text-black shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <span>Approved</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'APPROVED' ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300'}`}>
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'REJECTED'
                ? 'bg-white text-black shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <span>Rejected</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'REJECTED' ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300'}`}>
              {rejectedCount}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search patron, ID, or desk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Loading seat change requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-dashed border-zinc-800 space-y-3">
          <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
          <div className="text-sm font-semibold text-zinc-300">No requests found</div>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No seat change requests match your search criteria.'
              : activeTab === 'PENDING'
              ? 'Great! There are no pending seat change requests awaiting review.'
              : 'No seat requests recorded in this section.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-[#111113] border border-zinc-800 hover:border-zinc-700 transition-all space-y-4"
              >
                {/* Header row: Patron info + Status badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {req.user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{req.user.fullName}</span>
                        <span className="text-[11px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                          {req.user.membershipNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {req.user.email} {req.user.phone ? `• ${req.user.phone}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    {isPending && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>PENDING APPROVAL</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>APPROVED</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>REJECTED</span>
                      </span>
                    )}
                    {req.status === 'CANCELLED' && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                        <span>CANCELLED</span>
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-500">
                      {new Date(req.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Desk Transfer Visualizer */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Current Seat */}
                  <div className="md:col-span-5 p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                        <Armchair className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase font-semibold">Current Desk</div>
                        <div className="text-xs font-bold text-white">{req.currentSeat.label}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      {req.currentSeat.section}
                    </span>
                  </div>

                  {/* Transfer Indicator */}
                  <div className="md:col-span-2 flex justify-center py-1 md:py-0">
                    <div className="flex items-center space-x-1 text-zinc-400 text-xs font-semibold">
                      <ArrowRight className="w-4 h-4 text-white" />
                      <span className="hidden md:inline text-[10px] uppercase text-zinc-500">Change To</span>
                    </div>
                  </div>

                  {/* Requested Seat */}
                  <div className="md:col-span-5 p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <Armchair className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">Requested Desk</div>
                        <div className="text-xs font-bold text-white">{req.requestedSeat.label}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        {req.requestedSeat.section}
                      </span>
                      {req.requestedSeat.status === 'AVAILABLE' ? (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Available
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {req.requestedSeat.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason / Admin Notes */}
                {(req.reason || req.adminNotes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {req.reason && (
                      <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80 space-y-1">
                        <div className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center space-x-1">
                          <MessageSquare className="w-3 h-3 text-zinc-400" />
                          <span>Patron Reason</span>
                        </div>
                        <p className="text-zinc-300 italic">"{req.reason}"</p>
                      </div>
                    )}
                    {req.adminNotes && (
                      <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80 space-y-1">
                        <div className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 text-zinc-400" />
                          <span>Admin Decision Note</span>
                          {req.reviewedByAdmin && (
                            <span className="text-zinc-500">by {req.reviewedByAdmin.fullName}</span>
                          )}
                        </div>
                        <p className="text-zinc-300">"{req.adminNotes}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons (only for PENDING requests) */}
                {isPending && (
                  <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-zinc-800/60">
                    <button
                      onClick={() => handleOpenAction(req, 'REJECT')}
                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-rose-300 hover:text-rose-200 border border-zinc-700/80 hover:border-rose-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5"
                    >
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reject Request</span>
                    </button>
                    <button
                      onClick={() => handleOpenAction(req, 'APPROVE')}
                      className="px-4 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 text-black" />
                      <span>Approve & Change Seat</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Action Modal */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {actionType === 'APPROVE' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {actionType === 'APPROVE' ? 'Approve Seat Change Request' : 'Reject Seat Change Request'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {actionType === 'APPROVE'
                      ? 'Will atomically release old desk and assign requested desk'
                      : "Patron will remain on their currently assigned desk"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseAction}
                disabled={actionSubmitting}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transfer details summary */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Patron:</span>
                <span className="font-bold text-white">
                  {selectedRequest.user.fullName} ({selectedRequest.user.membershipNo})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Current Study Desk:</span>
                <span className="text-zinc-300 font-semibold">{selectedRequest.currentSeat.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Requested Study Desk:</span>
                <span className="text-white font-bold">{selectedRequest.requestedSeat.label}</span>
              </div>
              {selectedRequest.reason && (
                <div className="pt-2 border-t border-zinc-800 text-zinc-400 italic">
                  Patron's Reason: "{selectedRequest.reason}"
                </div>
              )}
            </div>

            {/* Admin Note Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Admin Note / Decision Remarks (Optional)
              </label>
              <textarea
                rows={3}
                placeholder={
                  actionType === 'APPROVE'
                    ? 'e.g. Approved as requested, reassigned to quiet zone.'
                    : 'e.g. Desk is reserved for group study; please choose another desk.'
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleCloseAction}
                disabled={actionSubmitting}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionSubmitting}
                className={`px-5 py-2 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  actionType === 'APPROVE'
                    ? 'bg-white hover:bg-zinc-200 text-black shadow-sm'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {actionSubmitting && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span>
                  {actionSubmitting
                    ? 'Processing...'
                    : actionType === 'APPROVE'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
