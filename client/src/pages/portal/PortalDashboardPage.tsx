import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Armchair,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  FileText,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  BookmarkCheck,
  Sparkles,
  Ban,
  ShieldAlert,
  User,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client';
import { usePatronAuth } from '../../context/PatronAuthContext';
import { DigitalLibraryCard } from '../../components/portal/DigitalLibraryCard';

export const PortalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { patron } = usePatronAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Change Seat Modal State
  const [isChangeSeatOpen, setIsChangeSeatOpen] = useState(false);
  const [availableSeats, setAvailableSeats] = useState<any[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [selectedNewSeatId, setSelectedNewSeatId] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [changingSeat, setChangingSeat] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [seatChangeError, setSeatChangeError] = useState<string | null>(null);
  const [seatChangeSuccess, setSeatChangeSuccess] = useState<string | null>(null);

  const handleOpenChangeSeat = async () => {
    setIsChangeSeatOpen(true);
    setSelectedNewSeatId('');
    setRequestReason('');
    setSeatChangeError(null);
    setSeatsLoading(true);
    try {
      const res = await api.get('/patron/available-seats');
      if (res.data?.success) {
        setAvailableSeats(res.data.data || []);
      }
    } catch (err: any) {
      setSeatChangeError(err.response?.data?.error || 'Failed to load available study desks.');
    } finally {
      setSeatsLoading(false);
    }
  };

  const handleConfirmChangeSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewSeatId) {
      setSeatChangeError('Please select a desk from the available seats list.');
      return;
    }
    setChangingSeat(true);
    setSeatChangeError(null);
    try {
      if (activeSeat) {
        // Seat already assigned: Must submit seat change request for admin approval
        const res = await api.post('/patron/seat/request', {
          requestedSeatId: selectedNewSeatId,
          reason: requestReason.trim() || undefined,
        });
        if (res.data?.success) {
          setIsChangeSeatOpen(false);
          setRequestReason('');
          setSeatChangeSuccess(
            'Seat change request submitted! It will appear on the Administrator Dashboard for approval.'
          );
          setTimeout(() => setSeatChangeSuccess(null), 6000);
          await fetchDashboard();
        }
      } else {
        // Initial seat selection
        const res = await api.post('/patron/change-seat', { seatId: selectedNewSeatId });
        if (res.data?.success) {
          setIsChangeSeatOpen(false);
          setSeatChangeSuccess('Study seat allocated successfully!');
          setTimeout(() => setSeatChangeSuccess(null), 5000);
          await fetchDashboard();
        }
      }
    } catch (err: any) {
      setSeatChangeError(err.response?.data?.error || err.message || 'Failed to process seat request.');
    } finally {
      setChangingSeat(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequest(true);
    try {
      const res = await api.post(`/patron/seat/request/${requestId}/cancel`);
      if (res.data?.success) {
        setSeatChangeSuccess('Seat change request has been cancelled.');
        setTimeout(() => setSeatChangeSuccess(null), 5000);
        await fetchDashboard();
      }
    } catch (err: any) {
      setSeatChangeError(err.response?.data?.error || 'Failed to cancel request.');
    } finally {
      setCancellingRequest(false);
    }
  };

  const fetchDashboard = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/patron/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load patron dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading your Member Dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    currentlyBorrowedCount: 0,
    totalReturnedCount: 0,
    overdueCount: 0,
    activeSeat: null,
    nearestDueDays: null,
  };

  const activeLoans = data?.activeLoans || [];
  const borrowingHistory = data?.borrowingHistory || [];
  const newArrivals = data?.newArrivals || [];
  const activeSeat = data?.activeSeat;
  const pendingSeatRequest = data?.pendingSeatRequest;
  const library = data?.library || {
    name: 'Metropolitan Central Library',
    email: 'info@metrolibrary.org',
    phone: '+1 (555) 234-5678',
    address: '742 Evergreen Terrace, Springfield',
  };

  const isBlocked = data?.patron?.status === 'BLOCKED' || data?.isBlocked || patron?.status === 'BLOCKED';
  const adminContact = data?.adminContact || {
    adminName: 'System Administrator',
    adminEmail: 'admin@library.local',
    libraryEmail: library.email,
    libraryPhone: library.phone,
    libraryAddress: library.address,
    helpdeskHours: 'Mon - Fri: 8:00 AM - 9:00 PM | Sat: 9:00 AM - 6:00 PM',
  };

  const statCards = [
    {
      title: 'Active Loans',
      value: stats.currentlyBorrowedCount,
      sub: stats.overdueCount > 0 ? `${stats.overdueCount} book overdue!` : 'In your possession',
      icon: BookOpen,
      color: stats.overdueCount > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      action: () => navigate('/portal/loans'),
    },
    {
      title: 'Books Read & Returned',
      value: stats.totalReturnedCount,
      sub: 'Lifetime reading history',
      icon: BookmarkCheck,
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      action: () => navigate('/portal/loans'),
    },
    {
      title: 'Study Hall Seat',
      value: activeSeat ? `Desk ${activeSeat.seatNumber}` : 'None Allocated',
      sub: activeSeat
        ? `${activeSeat.label} (${activeSeat.section})`
        : isBlocked
        ? 'Account suspended'
        : 'Click to select desk',
      icon: Armchair,
      color: activeSeat
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        : 'bg-slate-800 text-slate-400 border-slate-700',
      action: isBlocked ? undefined : handleOpenChangeSeat,
    },
    {
      title: 'Membership Standing',
      value: isBlocked ? 'BLOCKED' : 'Good Standing',
      sub: isBlocked ? 'Suspended by Library Administration' : 'Zero pending fines / active account',
      icon: isBlocked ? Ban : ShieldCheck,
      color: isBlocked ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      action: undefined,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Patron Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {patron?.fullName || data?.patron?.fullName}!
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Here is your circulation summary, borrowed books status, and current seat reservation at{' '}
              <span className="font-semibold text-white">{library.name}</span>.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchDashboard}
              disabled={refreshing}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-colors cursor-pointer shadow-xs"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/portal/catalog')}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Explore Catalog</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Blocked by Administrator High-Priority Alert Banner */}
      {isBlocked && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950 via-slate-900 to-slate-900 border-2 border-rose-500/60 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 shadow-lg">
                <Ban className="w-6 h-6 text-rose-400" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Account Suspended by Library Administrator</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Your Library Account is Currently Blocked
                </h2>
                <p className="text-xs text-rose-200/90 leading-relaxed max-w-2xl">
                  An administrator has placed a temporary hold on your library account. While suspended, you cannot borrow physical books, access new digital loans, or book study hall desks. Please contact the library administration using the details below to resolve this hold and reinstate your privileges.
                </p>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-rose-600/30 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold tracking-wider self-start sm:self-auto shrink-0">
              STATUS: BLOCKED
            </div>
          </div>

          {/* Administrator Contact Details Section */}
          <div className="pt-5 border-t border-rose-500/30">
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Phone className="w-4 h-4 text-rose-400" />
              <span>Contact Library Administrator to Appeal or Reinstate</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Library Admin</span>
                </div>
                <div className="font-bold text-white text-sm">{adminContact.adminName}</div>
                <div className="text-[11px] text-slate-400 font-mono">{adminContact.adminEmail}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Admin Direct Email</span>
                </div>
                <a
                  href={`mailto:${adminContact.adminEmail}?subject=Account Suspension Inquiry - Membership ${patron?.membershipNo || data?.patron?.membershipNo}`}
                  className="font-bold text-blue-400 hover:text-blue-300 hover:underline text-xs break-all block"
                >
                  {adminContact.adminEmail}
                </a>
                <div className="text-[10px] text-slate-500">Click to compose appeal email</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Circulation Helpdesk</span>
                </div>
                <div className="font-bold text-white font-mono text-xs">{adminContact.libraryPhone}</div>
                <div className="text-[10px] text-slate-500">{adminContact.helpdeskHours}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Circulation Desk Location</span>
                </div>
                <div className="font-medium text-slate-200 text-[11px] leading-tight">{adminContact.libraryAddress}</div>
                <div className="text-[10px] text-slate-500">Visit in person with your ID card</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Warning Alert if any */}
      {stats.overdueCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 flex items-start space-x-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-rose-300">Action Required: Overdue Loan</div>
            <p className="mt-0.5 text-rose-200/90 leading-relaxed">
              You have {stats.overdueCount} book loan past its return date. Please return it to the library circulation desk as soon as possible to avoid fines.
            </p>
          </div>
          <button
            onClick={() => navigate('/portal/loans')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            Review Loans
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={card.action}
              className={`p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg transition-all ${
                card.action ? 'hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer group' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {card.action && (
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-white tracking-tight">{card.value}</div>
                <div className="text-xs font-semibold text-slate-300 mt-0.5">{card.title}</div>
                <div className="text-[11px] text-slate-500 mt-1">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Left (Active Loans + Seat) / Right (Digital Card + Info) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Borrowed Books */}
          <div className="bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Currently Borrowed Books
                  </h2>
                  <p className="text-xs text-slate-400">Due dates, physical copy barcodes, and return countdowns</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/portal/loans')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Full Loan Records</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeLoans.length > 0 ? (
              <div className="space-y-3">
                {activeLoans.map((loan: any) => {
                  const days = loan.daysRemaining;
                  const isOverdue = loan.isOverdue;
                  const isDueSoon = days >= 0 && days <= 3;

                  let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  let badgeText = `${days} days remaining`;

                  if (isOverdue) {
                    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                    badgeText = `${Math.abs(days)} days overdue!`;
                  } else if (isDueSoon) {
                    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                    badgeText = days === 0 ? 'Due today!' : `Due in ${days} days`;
                  }

                  return (
                    <div
                      key={loan.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start space-x-3.5">
                        <div className="w-12 h-16 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-800 border border-indigo-700/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-xs overflow-hidden">
                          {loan.book.coverImageUrl ? (
                            <img
                              src={loan.book.coverImageUrl}
                              alt={loan.book.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="w-6 h-6" />
                          )}
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-white line-clamp-1">{loan.book.title}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">by {loan.book.author}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                            <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                              Barcode: {loan.copy.barcode}
                            </span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                              Shelf: {loan.copy.shelfLocation}
                            </span>
                            <span className="text-indigo-400 font-semibold">{loan.book.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border ${badgeColor}`}
                        >
                          {badgeText}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>Due: {new Date(loan.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 space-y-3 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-slate-300">No books currently checked out.</div>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Ready for your next read? Browse our catalog or read an e-book online.
                </p>
                <button
                  onClick={() => navigate('/portal/catalog')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Browse Available Titles
                </button>
              </div>
            )}
          </div>

          {/* Recently Added Library Books */}
          {newArrivals.length > 0 && (
            <div className="bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Recently Added to Library Catalog
                    </h2>
                    <p className="text-xs text-slate-400">New arrivals in physical stacks and digital repository</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/portal/catalog')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  <span>Explore Catalog ({newArrivals.length}+)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {newArrivals.slice(0, 4).map((book: any) => (
                  <div
                    key={book.id}
                    onClick={() => navigate('/portal/catalog')}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-start space-x-3 cursor-pointer group"
                  >
                    <div className="w-10 h-14 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-800 border border-indigo-700/30 flex items-center justify-center text-indigo-300 shrink-0 overflow-hidden shadow-xs">
                      {book.coverImageUrl ? (
                        <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">by {book.author}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {book.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {book.bookType === 'EBOOK' ? 'Digital E-Book' : `${book.availableCopies} available`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Study Seat Allocation */}
          <div className="bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <Armchair className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Study Hall Desk Reservation
                  </h2>
                  <p className="text-xs text-slate-400">Desk allocation and study seat reservation</p>
                </div>
              </div>

              {!isBlocked && (
                <button
                  onClick={handleOpenChangeSeat}
                  disabled={Boolean(pendingSeatRequest)}
                  id="portal-change-seat-header-btn"
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                    pendingSeatRequest
                      ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700 cursor-not-allowed opacity-80'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                  }`}
                  title={pendingSeatRequest ? 'You have a pending seat change request awaiting approval' : undefined}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {pendingSeatRequest
                      ? 'Request Pending Review'
                      : activeSeat
                      ? 'Request Seat Change'
                      : 'Select Seat'}
                  </span>
                </button>
              )}
            </div>

            {seatChangeSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{seatChangeSuccess}</span>
              </div>
            )}

            {/* Pending Seat Change Request Notice */}
            {pendingSeatRequest && (
              <div className="p-4 rounded-2xl bg-zinc-950/90 border border-amber-500/50 shadow-md space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">
                      Seat Change Request Pending Admin Approval
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    PENDING ADMIN REVIEW
                  </span>
                </div>

                <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-zinc-400">Requested Transfer:</span>
                    <span className="font-semibold text-zinc-300">
                      {pendingSeatRequest.currentSeat?.label || activeSeat?.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-bold text-white">
                      {pendingSeatRequest.requestedSeat?.label}
                    </span>
                    <span className="text-zinc-500 text-[11px]">
                      ({pendingSeatRequest.requestedSeat?.section})
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-500">
                    Submitted {new Date(pendingSeatRequest.createdAt).toLocaleDateString()} at{' '}
                    {new Date(pendingSeatRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {pendingSeatRequest.reason && (
                  <div className="text-xs text-zinc-400 italic px-1">
                    Patron Note: "{pendingSeatRequest.reason}"
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-400 text-[11px]">
                    Your current desk remains active until approved by an administrator.
                  </span>
                  <button
                    onClick={() => handleCancelRequest(pendingSeatRequest.id)}
                    disabled={cancellingRequest}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    {cancellingRequest ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </div>
              </div>
            )}

            {activeSeat ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 to-slate-950 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex flex-col items-center justify-center text-amber-300 shrink-0 shadow-xs">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Desk</span>
                    <span className="text-xl font-black">{activeSeat.seatNumber}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">{activeSeat.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {activeSeat.section}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Occupied since {new Date(activeSeat.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end justify-between gap-2.5 text-xs">
                  <div className="text-emerald-400 font-semibold flex items-center sm:justify-end space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Allocated to your account</span>
                  </div>
                  {pendingSeatRequest ? (
                    <span className="px-3.5 py-1.5 bg-zinc-800/80 text-amber-300 border border-zinc-700 rounded-xl text-xs font-medium flex items-center space-x-1.5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Seat Change Awaiting Admin</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleOpenChangeSeat}
                      disabled={isBlocked}
                      id="portal-change-seat-body-btn"
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto border border-slate-700"
                    >
                      <RefreshCw className="w-3 h-3 text-amber-400" />
                      <span>Request Seat Change</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 text-slate-400">
                  <Armchair className="w-6 h-6 text-slate-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-300">No study desk currently allotted to your account.</div>
                    <div className="text-[11px] text-slate-500">You can select any available study desk below or request assistance.</div>
                  </div>
                </div>
                <button
                  onClick={handleOpenChangeSeat}
                  disabled={isBlocked}
                  id="portal-select-seat-btn"
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors shrink-0 cursor-pointer flex items-center space-x-1.5 shadow-sm"
                >
                  <Armchair className="w-3.5 h-3.5 text-white" />
                  <span>Select Study Seat</span>
                </button>
              </div>
            )}
          </div>

          {/* Past Returned Books History Preview */}
          <div className="bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Recent Reading History
                </h2>
              </div>
              <button
                onClick={() => navigate('/portal/loans')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                All History ({borrowingHistory.length}) &rarr;
              </button>
            </div>

            {borrowingHistory.length > 0 ? (
              <div className="divide-y divide-slate-800/80">
                {borrowingHistory.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{item.book.title}</div>
                      <div className="text-slate-400 text-[11px]">by {item.book.author} &bull; {item.book.category}</div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <span className="text-emerald-400 font-semibold">Returned</span>
                      <div className="text-slate-500">{new Date(item.returnDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                No past returned loans recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Digital Card, Quick Navigation & Library Details */}
        <div className="space-y-6">
          {/* Digital Membership Pass Card */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Your Library Credential
            </h2>
            <DigitalLibraryCard
              patron={{
                membershipNo: patron?.membershipNo || data?.patron?.membershipNo || 'MEM-1001',
                fullName: patron?.fullName || data?.patron?.fullName || 'Alice Walker',
                email: patron?.email || data?.patron?.email || 'alice.walker@example.com',
                status: patron?.status || data?.patron?.status || 'ACTIVE',
                createdAt: data?.patron?.createdAt,
              }}
              libraryName={library.name}
            />
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Patron Services</h3>
            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/portal/catalog')}
                className="w-full p-3 bg-slate-950/60 hover:bg-slate-800/80 rounded-2xl border border-slate-800 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                      Search Book Catalog
                    </div>
                    <div className="text-[10px] text-slate-500">Physical & E-Book collection</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => navigate('/portal/ebooks')}
                className="w-full p-3 bg-slate-950/60 hover:bg-slate-800/80 rounded-2xl border border-slate-800 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-purple-400 transition-colors">
                      Digital E-Books Library
                    </div>
                    <div className="text-[10px] text-slate-500">Read in-browser or download</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={handleOpenChangeSeat}
                disabled={isBlocked}
                className="w-full p-3 bg-slate-950/60 hover:bg-slate-800/80 disabled:opacity-50 rounded-2xl border border-slate-800 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Armchair className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                      Change Study Desk
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {activeSeat ? `Currently: ${activeSeat.label}` : 'Choose available desk'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Library Info Card */}
          <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-3.5 text-xs">
            <h3 className="font-bold text-white uppercase tracking-wider text-xs">Library Contact & Hours</h3>
            
            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed text-slate-300">{library.address}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[11px] font-mono text-slate-300">{library.phone}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[11px] font-mono text-slate-300">{library.email}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Mon &ndash; Fri:</span>
                <span className="font-semibold text-white">8:00 AM &ndash; 9:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday:</span>
                <span className="font-semibold text-white">9:00 AM &ndash; 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday:</span>
                <span className="text-amber-400 font-semibold">Closed for maintenance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Study Seat Modal */}
      {isChangeSeatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>{activeSeat ? 'Request Study Seat Change' : 'Select Study Desk'}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeSeat
                      ? 'Select an available study desk and submit your request for administrator approval'
                      : 'Choose an available study desk to reserve your place'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsChangeSeatOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Seat Banner & Policy Rule */}
            <div className="space-y-2">
              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Currently Allotted Desk:</span>
                <span className="font-bold text-amber-400">
                  {activeSeat ? `${activeSeat.label} (${activeSeat.section})` : 'None Allocated'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2">
                <Armchair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {activeSeat
                    ? 'Policy: Study desk changes require library administrator approval. Your current desk reservation stays active until the request is approved.'
                    : 'Policy: Only 1 study desk can be reserved per member.'}
                </span>
              </div>
            </div>

            {seatChangeError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{seatChangeError}</span>
              </div>
            )}

            {/* Available Seats Selection */}
            <form onSubmit={handleConfirmChangeSeat} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select {activeSeat ? 'Requested' : 'New'} Desk ({availableSeats.length} desks currently available)
                </label>

                {seatsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2 text-xs text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>Loading available study desks...</span>
                  </div>
                ) : availableSeats.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2 text-xs text-slate-400">
                    <Armchair className="w-6 h-6 text-slate-600 mx-auto" />
                    <div>All study desks are currently occupied or undergoing maintenance.</div>
                    <div className="text-[11px] text-slate-500">Please check back later or visit the library front desk.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {availableSeats.map((seat) => {
                      const isSelected = selectedNewSeatId === seat.id;
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          onClick={() => setSelectedNewSeatId(seat.id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/10 ring-2 ring-amber-400/40'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-white">{seat.label}</span>
                            <Armchair className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{seat.section}</div>
                          <div className="text-[10px] text-emerald-400 mt-1 font-semibold">&bull; Available</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason input for seat change requests */}
              {activeSeat && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Reason for Request (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="e.g. Need a desk closer to power outlets or quiet zone"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangeSeatOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingSeat || !selectedNewSeatId || availableSeats.length === 0}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  {changingSeat && <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />}
                  <span>
                    {changingSeat
                      ? 'Submitting...'
                      : activeSeat
                      ? 'Submit Request for Approval'
                      : 'Confirm Desk Selection'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
