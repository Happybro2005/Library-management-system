import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Armchair,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  RefreshCw,
  Wrench,
  Sliders,
  Check,
  Search,
  Inbox,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export const SeatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [seats, setSeats] = useState<any[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [summary, setSummary] = useState({
    totalSeats: 0,
    occupiedSeats: 0,
    availableSeats: 0,
    maintenanceSeats: 0,
    occupancyPercentage: 0,
  });
  const [patrons, setPatrons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCapacityOpen, setIsCapacityOpen] = useState(false);

  // Form State
  const [selectedPatronId, setSelectedPatronId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [targetCapacity, setTargetCapacity] = useState(30);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSeats = async () => {
    setLoading(true);
    try {
      const [res, reqRes] = await Promise.all([
        api.get('/seats'),
        api.get('/seats/requests?status=PENDING').catch(() => ({ data: { success: false } })),
      ]);

      if (reqRes.data?.success && Array.isArray(reqRes.data.data)) {
        setPendingRequestsCount(reqRes.data.data.length);
      }

      if (res.data?.success) {
        if (Array.isArray(res.data.data)) {
          setSeats(res.data.data);
          const total = res.data.data.length;
          const occupied = res.data.data.filter((s: any) => s.status === 'OCCUPIED').length;
          const available = res.data.data.filter((s: any) => s.status === 'AVAILABLE').length;
          setSummary({
            totalSeats: total,
            occupiedSeats: occupied,
            availableSeats: available,
            maintenanceSeats: total - occupied - available,
            occupancyPercentage: total > 0 ? Math.round((occupied / total) * 100) : 0,
          });
        } else if (res.data.data?.seats) {
          setSeats(res.data.data.seats);
          if (res.data.data.summary) {
            setSummary(res.data.data.summary);
            setTargetCapacity(res.data.data.summary.totalSeats);
          }
        }
      }
    } catch (err: any) {
      console.error('Fetch seats failed:', err);
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to load seats.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatrons = async () => {
    try {
      const res = await api.get('/users?status=ACTIVE');
      if (res.data?.success && res.data.data.length > 0) {
        setPatrons(res.data.data);
        const availablePatron = res.data.data.find((p: any) => !p.activeSeat);
        if (availablePatron) {
          setSelectedPatronId(availablePatron.id);
        } else {
          setSelectedPatronId('');
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchSeats();
    fetchPatrons();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !selectedPatronId) return;

    // Invariant check: only 1 seat can be reserved by one person
    const targetPatron = patrons.find((p) => p.id === selectedPatronId);
    if (targetPatron?.activeSeat) {
      setFeedback({
        type: 'error',
        text: `Only one seat can be reserved by one person! ${targetPatron.fullName} already has an active seat assigned (${targetPatron.activeSeat}).`,
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.post('/seats/assign', {
        seatId: selectedSeat.id,
        userId: selectedPatronId,
        notes: assignNotes.trim() || undefined,
      });

      if (res.data?.success) {
        setIsAssignOpen(false);
        setAssignNotes('');
        setSelectedSeat(null);
        setFeedback({ type: 'success', text: `Seat #${selectedSeat.seatNumber} successfully assigned!` });
        await fetchSeats();
        await fetchPatrons();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to assign seat.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async (seatId: string) => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.post(`/seats/${seatId}/release`);
      if (res.data?.success) {
        setIsDetailOpen(false);
        setSelectedSeat(null);
        setFeedback({ type: 'success', text: 'Seat successfully released and marked available.' });
        await fetchSeats();
        await fetchPatrons();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to release seat.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async (seat: any) => {
    setSaving(true);
    setFeedback(null);

    const newStatus = seat.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';

    try {
      const res = await api.put(`/seats/${seat.id}/status`, { status: newStatus });
      if (res.data?.success) {
        setIsDetailOpen(false);
        setSelectedSeat(null);
        setFeedback({
          type: 'success',
          text: `Seat #${seat.seatNumber} marked as ${newStatus.toLowerCase()}.`,
        });
        await fetchSeats();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to update seat status.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.post('/seats/adjust-capacity', { targetCapacity: Number(targetCapacity) });
      if (res.data?.success) {
        setIsCapacityOpen(false);
        setFeedback({ type: 'success', text: res.data.data.message || 'Capacity adjusted successfully.' });
        await fetchSeats();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to adjust capacity.' });
    } finally {
      setSaving(false);
    }
  };

  // Filtered seats
  const filteredSeats = seats.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchLabel = s.label?.toLowerCase().includes(q) || String(s.seatNumber).includes(q);
      const matchUser = s.currentAssignment?.user?.fullName?.toLowerCase().includes(q);
      return matchLabel || matchUser;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Seat Management</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Visual study hall layout, patron desk allocation, and capacity control
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/user-requests')}
            id="seats-user-requests-btn"
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Inbox className="w-3.5 h-3.5 text-zinc-300" />
            <span>User Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-black font-bold text-[10px] rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsCapacityOpen(true)}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-300" />
            <span>Adjust Capacity ({summary.totalSeats})</span>
          </button>

          <button
            onClick={fetchSeats}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl border border-zinc-800 shadow-xs cursor-pointer transition-colors"
            title="Refresh Seats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pending Seat Requests Alert Banner */}
      {pendingRequestsCount > 0 && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-zinc-200">
              There {pendingRequestsCount === 1 ? 'is' : 'are'}{' '}
              <strong className="text-white">{pendingRequestsCount}</strong> pending seat change request(s) awaiting administrator review.
            </span>
          </div>
          <button
            onClick={() => navigate('/user-requests')}
            className="text-xs font-semibold text-white hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Review in User Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Desks</div>
          <div className="text-2xl font-extrabold text-white mt-1">{summary.totalSeats}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Active capacity</div>
        </div>

        <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">Available</div>
          <div className="text-2xl font-extrabold text-white mt-1">{summary.availableSeats}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Ready for assignment</div>
        </div>

        <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">Occupied</div>
          <div className="text-2xl font-extrabold text-white mt-1">{summary.occupiedSeats}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{summary.occupancyPercentage}% occupied</div>
        </div>

        <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Maintenance</div>
          <div className="text-2xl font-extrabold text-zinc-400 mt-1">{summary.maintenanceSeats}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Desks out of service</div>
        </div>
      </div>

      {feedback && (
        <div
          className="p-4 rounded-2xl text-xs flex items-center space-x-2 bg-zinc-950 border border-zinc-800 text-zinc-200"
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by desk number (e.g. 12) or patron name..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-zinc-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-white w-full sm:w-auto"
          >
            <option value="">All Desks</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Interactive Visual Hall Map */}
      <div className="bg-zinc-900/90 p-6 rounded-3xl border border-zinc-800 shadow-sm space-y-4">
        <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Armchair className="w-4 h-4 text-white" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Study Hall Floor Plan ({filteredSeats.length} Desks Displayed)
            </h2>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <span className="text-zinc-400">Available</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span className="text-white font-medium">Occupied</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <span className="text-zinc-500">Maintenance</span>
            </span>
          </div>
        </div>

        {filteredSeats.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-3">
            {filteredSeats.map((seat) => {
              const isAvailable = seat.status === 'AVAILABLE';
              const isOccupied = seat.status === 'OCCUPIED';
              const isMaint = seat.status === 'MAINTENANCE';
              const activeUser = seat.currentAssignment?.user;

              let cardBg = 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-60';
              if (isAvailable) cardBg = 'bg-zinc-900 border-zinc-700/80 text-zinc-200 hover:border-white hover:bg-zinc-850 shadow-sm';
              if (isOccupied) cardBg = 'bg-white border-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.25)]';

              return (
                <div
                  key={seat.id}
                  onClick={() => {
                    setSelectedSeat(seat);
                    if (isAvailable) {
                      setIsAssignOpen(true);
                    } else {
                      setIsDetailOpen(true);
                    }
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer relative group min-h-[96px] ${cardBg}`}
                >
                  <Armchair
                    className={`w-6 h-6 mb-1 ${
                      isOccupied ? 'text-black stroke-[2.5]' : isAvailable ? 'text-zinc-300 group-hover:text-white' : 'text-zinc-600'
                    }`}
                  />
                  <div className="font-bold text-xs">{seat.label || `Seat ${seat.seatNumber}`}</div>

                  {isOccupied && activeUser ? (
                    <div className="mt-1 text-[10px] font-semibold truncate w-full text-white bg-black rounded px-1.5 py-0.5">
                      {activeUser.fullName?.split(' ')[0]}
                    </div>
                  ) : (
                    <div
                      className={`text-[10px] font-medium mt-1 uppercase tracking-wider ${
                        isAvailable ? 'text-zinc-400 group-hover:text-zinc-300' : 'text-zinc-600 line-through'
                      }`}
                    >
                      {seat.status.toLowerCase()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-zinc-500">
            {loading ? 'Loading study hall desks...' : 'No seats match your search or filter.'}
          </div>
        )}
      </div>

      {/* Modal: Assign Seat */}
      {isAssignOpen && selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 rounded-3xl p-6 max-w-md w-full border border-zinc-800 shadow-2xl space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Armchair className="w-4 h-4 text-white" />
                <span>Assign {selectedSeat.label || `Desk #${selectedSeat.seatNumber}`}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAssignOpen(false);
                  setSelectedSeat(null);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-zinc-300 font-semibold">Select Registered Patron *</label>
                  <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    Rule: 1 Seat Per Person
                  </span>
                </div>

                {patrons.length > 0 ? (
                  <select
                    required
                    value={selectedPatronId}
                    onChange={(e) => setSelectedPatronId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white font-medium"
                  >
                    <option value="">-- Choose eligible patron (Without existing seat) --</option>
                    {patrons.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={Boolean(p.activeSeat)}
                        className={p.activeSeat ? 'text-zinc-500 bg-zinc-950' : 'text-white bg-zinc-900'}
                      >
                        {p.fullName} ({p.membershipNo})
                        {p.activeSeat ? ` — Already holds [${p.activeSeat}]` : ' — Ready for desk'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-zinc-950 text-zinc-400 border border-zinc-800 rounded-xl text-xs">
                    No active patrons found. Register patrons in the Library Users section first.
                  </div>
                )}

                <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                  Only one seat can be reserved by one person at a time. Patrons who already have an active seat cannot be allotted another desk.
                </p>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">Session Notes (Optional)</label>
                <input
                  type="text"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Quiet study, research session"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleToggleMaintenance(selectedSeat)}
                  className="text-zinc-400 hover:text-white text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Mark Maintenance</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssignOpen(false);
                      setSelectedSeat(null);
                    }}
                    className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-medium cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !selectedPatronId ||
                      Boolean(patrons.find((p) => p.id === selectedPatronId)?.activeSeat)
                    }
                    className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl font-semibold shadow-xs disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    {saving ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Seat Details (Occupied / Maintenance) */}
      {isDetailOpen && selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 rounded-3xl p-6 max-w-md w-full border border-zinc-800 shadow-2xl space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Armchair className="w-4 h-4 text-white" />
                <span>{selectedSeat.label || `Desk #${selectedSeat.seatNumber}`}</span>
              </h3>
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedSeat(null);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Current Status:</span>
                <StatusBadge status={selectedSeat.status} size="sm" />
              </div>

              {selectedSeat.currentAssignment && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-400">Occupant:</span>
                    <span className="font-semibold text-white">
                      {selectedSeat.currentAssignment.user?.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-400">Membership No:</span>
                    <span className="font-mono text-zinc-300">
                      {selectedSeat.currentAssignment.user?.membershipNo}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-400">Session Started:</span>
                    <span className="text-zinc-300">
                      {new Date(selectedSeat.currentAssignment.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handleToggleMaintenance(selectedSeat)}
                disabled={saving || selectedSeat.status === 'OCCUPIED'}
                className="text-zinc-400 hover:text-white text-xs font-medium flex items-center space-x-1 disabled:opacity-40 cursor-pointer transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>
                  {selectedSeat.status === 'MAINTENANCE' ? 'Restore to Available' : 'Set Maintenance'}
                </span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailOpen(false);
                    setSelectedSeat(null);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-medium cursor-pointer transition-colors"
                >
                  Close
                </button>

                {selectedSeat.status === 'OCCUPIED' && (
                  <button
                    type="button"
                    onClick={() => handleRelease(selectedSeat.id)}
                    disabled={saving}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    {saving ? 'Releasing...' : 'Release Desk'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adjust Hall Capacity */}
      {isCapacityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 rounded-3xl p-6 max-w-md w-full border border-zinc-800 shadow-2xl space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-white" />
                <span>Adjust Study Hall Capacity</span>
              </h3>
              <button onClick={() => setIsCapacityOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustCapacity} className="space-y-4 text-xs">
              <p className="text-zinc-300 leading-relaxed">
                Change the total number of study desks in the hall. Increasing capacity automatically creates new
                numbered desks; reducing capacity safely archives unoccupied desks.
              </p>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Target Capacity (Minimum 1 desk)
                </label>
                <input
                  type="number"
                  min={summary.occupiedSeats || 1}
                  max={200}
                  value={targetCapacity}
                  onChange={(e) => setTargetCapacity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white font-mono text-sm"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Cannot be lower than currently occupied desks ({summary.occupiedSeats}).
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCapacityOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  {saving ? 'Updating...' : 'Apply Capacity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
