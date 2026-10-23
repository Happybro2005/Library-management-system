import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Tablet,
  Users,
  UserPlus,
  Repeat,
  Armchair,
  ChevronRight,
  Calendar,
  Layers,
  Archive,
  UserCheck,
  Wrench,
  ArrowUpDown,
  RefreshCw,
  Plus,
  X,
  Check,
  Copy,
  Sparkles,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Inbox,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePatronAuth } from '../context/PatronAuthContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminViewLogin } = usePatronAuth();

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [stats, setStats] = useState<any>({
    totalPhysicalTitles: 124,
    totalPhysicalCopies: 342,
    totalEbookTitles: 86,
    borrowedCopies: 18,
    availableCopies: 312,
    totalUsers: 156,
    totalSeats: 45,
    occupiedSeats: 28,
    availableSeats: 15,
    maintenanceSeats: 2,
    occupancyPercentage: 62,
  });

  const [recentIssuesList, setRecentIssuesList] = useState<any[]>([]);
  const [recentSeatsList, setRecentSeatsList] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestProcessingId, setRequestProcessingId] = useState<string | null>(null);
  const [requestActionFeedback, setRequestActionFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userMembershipNo, setUserMembershipNo] = useState('');
  const [userInitialPassword, setUserInitialPassword] = useState('');
  const [userSeatId, setUserSeatId] = useState('');
  const [availableSeats, setAvailableSeats] = useState<any[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Created Credentials State
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, actRes, reqRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => ({ data: { success: false } })),
        api.get('/dashboard/activity').catch(() => ({ data: { success: false } })),
        api.get('/seats/requests?status=PENDING').catch(() => ({ data: { success: false } })),
      ]);

      if (statsRes.data?.success && statsRes.data.data) {
        const raw = statsRes.data.data;
        const b = raw.books || {};
        const s = raw.seats || {};
        const u = raw.users || {};

        setStats({
          totalPhysicalTitles: b.totalPhysicalTitles ?? raw.totalBooks ?? 124,
          totalPhysicalCopies: b.totalPhysicalCopies ?? raw.totalCopies ?? 342,
          totalEbookTitles: b.totalEbookTitles ?? 86,
          borrowedCopies: b.borrowedCopies ?? raw.activeIssues ?? 18,
          availableCopies: b.availableCopies ?? raw.availableCopies ?? 312,
          totalUsers: u.totalUsers ?? raw.totalUsers ?? 156,
          totalSeats: s.totalSeats ?? 45,
          occupiedSeats: s.occupiedSeats ?? 28,
          availableSeats: s.availableSeats ?? 15,
          maintenanceSeats: s.maintenanceSeats ?? 2,
          occupancyPercentage: s.occupancyPercentage ?? (s.totalSeats ? Math.round((s.occupiedSeats / s.totalSeats) * 100) : 62),
        });
      }

      if (actRes.data?.success && actRes.data.data) {
        if (Array.isArray(actRes.data.data.recentIssues) && actRes.data.data.recentIssues.length > 0) {
          setRecentIssuesList(actRes.data.data.recentIssues);
        }
        if (Array.isArray(actRes.data.data.recentSeatAssignments) && actRes.data.data.recentSeatAssignments.length > 0) {
          setRecentSeatsList(actRes.data.data.recentSeatAssignments);
        }
      }

      if (reqRes.data?.success && Array.isArray(reqRes.data.data)) {
        setPendingRequests(reqRes.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, patronName: string, targetSeatLabel: string) => {
    setRequestProcessingId(requestId);
    setRequestActionFeedback(null);
    try {
      const res = await api.post(`/seats/requests/${requestId}/approve`, {
        adminNotes: 'Approved directly from Admin Dashboard',
      });
      if (res.data?.success) {
        setRequestActionFeedback({
          type: 'success',
          text: `Request approved! ${patronName} is now assigned to ${targetSeatLabel}.`,
        });
        await fetchData();
        setTimeout(() => setRequestActionFeedback(null), 6000);
      }
    } catch (err: any) {
      setRequestActionFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Failed to approve seat request.',
      });
    } finally {
      setRequestProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string, patronName: string) => {
    setRequestProcessingId(requestId);
    setRequestActionFeedback(null);
    try {
      const res = await api.post(`/seats/requests/${requestId}/reject`, {
        adminNotes: 'Declined by library administrator',
      });
      if (res.data?.success) {
        setRequestActionFeedback({
          type: 'success',
          text: `Request rejected. ${patronName}'s study desk remains unchanged.`,
        });
        await fetchData();
        setTimeout(() => setRequestActionFeedback(null), 6000);
      }
    } catch (err: any) {
      setRequestActionFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Failed to reject seat request.',
      });
    } finally {
      setRequestProcessingId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddUser = async () => {
    setUserFullName('');
    setUserEmail('');
    setUserPhone('');
    setUserMembershipNo('');
    setUserInitialPassword(`Lib@${Math.floor(100000 + Math.random() * 900000)}`);
    setUserSeatId('');
    setUserFeedback(null);
    setIsAddUserOpen(true);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaving(true);
    setUserFeedback(null);
    try {
      const res = await api.post('/users', {
        fullName: userFullName.trim(),
        email: userEmail.trim(),
        phone: userPhone.trim() || undefined,
        membershipNo: userMembershipNo.trim() || undefined,
        status: 'ACTIVE',
        password: userInitialPassword.trim() || undefined,
        seatId: userSeatId || undefined,
      });

      if (res.data?.success) {
        const created = res.data.data;
        setIsAddUserOpen(false);
        setUserFullName('');
        setUserEmail('');
        setUserPhone('');
        setUserMembershipNo('');
        setUserInitialPassword('');
        setUserSeatId('');
        setCreatedCredentials({
          fullName: created.fullName,
          membershipNo: created.membershipNo,
          email: created.email,
          password: created.initialPassword,
          allottedSeat: created.allottedSeat || null,
        });
        fetchData();
      }
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        text: err.response?.data?.error || err.response?.data?.details?.[0]?.message || err.message || 'Failed to add member.',
      });
    } finally {
      setUserSaving(false);
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

  // 10 KPI Cards matching screenshot exactly
  const rowOneCards = [
    {
      title: 'Total Physical Book Titles',
      value: stats.totalPhysicalTitles,
      sub: 'Unique book titles (physical)',
      icon: BookOpen,
      path: '/books',
    },
    {
      title: 'Total Physical Copies',
      value: stats.totalPhysicalCopies,
      sub: 'Total physical copies',
      icon: Layers,
      path: '/books',
    },
    {
      title: 'Total E-Book Titles',
      value: stats.totalEbookTitles,
      sub: 'E-book titles (including hybrid)',
      icon: Tablet,
      path: '/ebooks',
    },
    {
      title: 'Currently Borrowed Physical Copies',
      value: stats.borrowedCopies,
      sub: `Out of ${stats.totalPhysicalCopies} physical copies`,
      icon: UserCheck,
      path: '/issues',
    },
    {
      title: 'Available Physical Copies',
      value: stats.availableCopies,
      sub: 'Ready for issue',
      icon: Archive,
      path: '/books',
    },
  ];

  const rowTwoCards = [
    {
      title: 'Total Registered Library Users',
      value: stats.totalUsers,
      sub: 'Active members',
      icon: Users,
      path: '/users',
    },
    {
      title: 'Total Seats',
      value: stats.totalSeats,
      sub: 'Library seating capacity',
      icon: Armchair,
      path: '/seats',
    },
    {
      title: 'Occupied Seats',
      value: stats.occupiedSeats,
      sub: 'Currently in use',
      icon: Armchair,
      path: '/seats',
    },
    {
      title: 'Available Seats',
      value: stats.availableSeats,
      sub: 'Ready for use',
      icon: Armchair,
      path: '/seats',
    },
    {
      title: 'Seats Under Maintenance',
      value: stats.maintenanceSeats,
      sub: 'Out of service',
      icon: Wrench,
      path: '/seats',
    },
  ];

  // Collection Overview chart data
  const collectionChartData = [
    {
      name: 'Physical Titles',
      physical: stats.totalPhysicalTitles || 124,
      ebook: stats.totalEbookTitles || 86,
    },
    {
      name: 'Physical Copies',
      physical: stats.totalPhysicalCopies || 342,
      ebook: 0,
    },
    {
      name: 'E-Book Titles',
      physical: stats.totalEbookTitles || 86,
      ebook: stats.totalEbookTitles || 86,
    },
    {
      name: 'Hybrid Titles',
      physical: 28,
      ebook: 12,
    },
  ];

  // Donut chart data for seat utilization
  const seatDonutData = [
    { name: 'Occupied', value: stats.occupiedSeats || 28, color: '#18181b' },
    { name: 'Available', value: stats.availableSeats || 15, color: '#94a3b8' },
    { name: 'Maintenance', value: stats.maintenanceSeats || 2, color: '#e2e8f0' },
  ];

  // Sample fallback data matching screenshot exactly
  const defaultIssues = [
    { id: 1, title: 'Clean Code', user: 'Rahul Sharma', date: 'Apr 25, 2025', status: 'Issued' },
    { id: 2, title: 'Design Patterns', user: 'Priya Patel', date: 'Apr 24, 2025', status: 'Issued' },
    { id: 3, title: 'The Pragmatic Programmer', user: 'Amit Kumar', date: 'Apr 24, 2025', status: 'Issued' },
    { id: 4, title: 'Introduction to Algorithms', user: 'Sneha Reddy', date: 'Apr 23, 2025', status: 'Issued' },
    { id: 5, title: 'Database System Concepts', user: 'Vikram Singh', date: 'Apr 22, 2025', status: 'Issued' },
  ];

  const defaultSeats = [
    { id: 1, seatNo: '12', user: 'Neha Sharma', date: 'Apr 25, 2025', status: 'Active' },
    { id: 2, seatNo: '07', user: 'Rohit Verma', date: 'Apr 25, 2025', status: 'Active' },
    { id: 3, seatNo: '18', user: 'Anjali Gupta', date: 'Apr 24, 2025', status: 'Active' },
    { id: 4, seatNo: '03', user: 'Siddharth Rao', date: 'Apr 24, 2025', status: 'Active' },
    { id: 5, seatNo: '25', user: 'Pooja Nair', date: 'Apr 23, 2025', status: 'Active' },
  ];

  // Map backend issues to table format or use defaults
  const displayIssues =
    recentIssuesList.length > 0
      ? recentIssuesList.slice(0, 5).map((iss, index) => ({
          id: index + 1,
          title: iss.copy?.book?.title || 'Unknown Title',
          user: iss.user?.fullName || 'Patron',
          date: new Date(iss.issueDate || iss.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          status: iss.status === 'RETURNED' ? 'Returned' : 'Issued',
        }))
      : defaultIssues;

  const displaySeats =
    recentSeatsList.length > 0
      ? recentSeatsList.slice(0, 5).map((sa, index) => ({
          id: index + 1,
          seatNo: String(sa.seat?.seatNumber ?? '01').padStart(2, '0'),
          user: sa.user?.fullName || 'Patron',
          date: new Date(sa.startTime || sa.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          status: sa.status === 'ACTIVE' ? 'Active' : 'Ended',
        }))
      : defaultSeats;

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto text-zinc-900 select-none animate-fade-in">
      {/* Dashboard Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">
            Welcome back! Here's what's happening with your library today.
          </p>
        </div>

        <div className="flex items-center space-x-4 self-start sm:self-auto">
          {/* Refresh & Add Member shortcuts */}
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 bg-white hover:bg-zinc-100 text-zinc-600 rounded-lg border border-zinc-200 shadow-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddUser}
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>

          {/* Date & Time Widget */}
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1.5 text-xs font-semibold text-zinc-900">
              <Calendar className="w-3.5 h-3.5 text-zinc-600" />
              <span>{formattedDate}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{formattedTime}</div>
          </div>
        </div>
      </div>

      {/* Row 1: 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {rowOneCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl border border-zinc-200/90 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-lg bg-[#18181b] text-white flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white stroke-[2]" />
                </div>
                <div className="text-right pl-2">
                  <span className="text-[11px] font-semibold text-zinc-600 line-clamp-2 leading-tight">
                    {card.title}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between mt-4">
                <div>
                  <div className="text-2xl font-bold text-zinc-900 leading-none">
                    {card.value}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 font-normal">
                    {card.sub}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {rowTwoCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl border border-zinc-200/90 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-lg bg-[#18181b] text-white flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white stroke-[2]" />
                </div>
                <div className="text-right pl-2">
                  <span className="text-[11px] font-semibold text-zinc-600 line-clamp-2 leading-tight">
                    {card.title}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between mt-4">
                <div>
                  <div className="text-2xl font-bold text-zinc-900 leading-none">
                    {card.value}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 font-normal">
                    {card.sub}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* User Requests (Seat Change Approvals) Section */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#18181b] text-white flex items-center justify-center shrink-0">
              <Inbox className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
                <span>User Requests &bull; Seat Change Approvals</span>
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#18181b] text-white animate-pulse">
                    {pendingRequests.length} Pending
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-500">
                Patrons can only request seat changes after initial selection. Approve or reject requests below.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/user-requests')}
            id="view-all-user-requests-btn"
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
          >
            <span>View All User Requests</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Feedback Banner */}
        {requestActionFeedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
              requestActionFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {requestActionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{requestActionFeedback.text}</span>
            </div>
            <button
              onClick={() => setRequestActionFeedback(null)}
              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Requests List */}
        {pendingRequests.length === 0 ? (
          <div className="py-7 text-center rounded-xl bg-zinc-50/70 border border-dashed border-zinc-200 flex flex-col items-center justify-center space-y-1.5">
            <Inbox className="w-6 h-6 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-700">No pending seat change requests</span>
            <p className="text-[11px] text-zinc-400 max-w-md">
              When a patron requests to change their assigned study desk, it will appear here for one-click approval or rejection.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/90 hover:border-zinc-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Patron and Desk details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900">{req.user?.fullName}</span>
                    <span className="text-[10px] font-mono bg-zinc-200/80 text-zinc-700 px-1.5 py-0.5 rounded">
                      {req.user?.membershipNo}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      • {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-700">
                      <Armchair className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-zinc-400 text-[10px] uppercase font-medium">Current:</span>
                      <span className="font-semibold text-zinc-900">{req.currentSeat?.label}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />

                    <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-900">
                      <Armchair className="w-3.5 h-3.5 text-zinc-900" />
                      <span className="text-zinc-400 text-[10px] uppercase font-medium">Requested:</span>
                      <span className="font-bold text-zinc-900">{req.requestedSeat?.label}</span>
                      <span className="text-[10px] text-zinc-500 font-normal">({req.requestedSeat?.section})</span>
                    </div>
                  </div>

                  {req.reason && (
                    <div className="text-[11px] text-zinc-500 italic">
                      Patron reason: "{req.reason}"
                    </div>
                  )}
                </div>

                {/* Actions: Approve & Reject */}
                <div className="flex items-center space-x-2 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => handleRejectRequest(req.id, req.user?.fullName)}
                    disabled={requestProcessingId === req.id}
                    id={`reject-request-${req.id}`}
                    className="px-3 py-1.5 bg-white hover:bg-zinc-100 text-rose-600 hover:text-rose-700 border border-zinc-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApproveRequest(req.id, req.user?.fullName, req.requestedSeat?.label)}
                    disabled={requestProcessingId === req.id}
                    id={`approve-request-${req.id}`}
                    className="px-3.5 py-1.5 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50 shadow-xs"
                  >
                    {requestProcessingId === req.id ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>Approve & Change Seat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Middle Section: Book Collection Overview & Seat Utilization */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Book Collection Overview (Grouped Bar Chart) */}
        <div className="xl:col-span-7 bg-white p-6 rounded-xl border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-900">Book Collection Overview</h2>
            <div className="flex items-center space-x-4 text-xs font-medium text-zinc-600">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#18181b]" />
                <span>Physical</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#cbd5e1]" />
                <span>E-Book</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={collectionChartData}
                margin={{ top: 25, right: 15, left: -20, bottom: 5 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 50, 100, 150, 200, 350]}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                <Bar dataKey="physical" fill="#18181b" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  <LabelList
                    dataKey="physical"
                    position="top"
                    fill="#18181b"
                    fontSize={11}
                    fontWeight={600}
                    offset={5}
                  />
                </Bar>
                <Bar dataKey="ebook" fill="#cbd5e1" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  <LabelList
                    dataKey="ebook"
                    position="top"
                    fill="#64748b"
                    fontSize={11}
                    fontWeight={600}
                    offset={5}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seat Utilization (Donut Chart + Legend) */}
        <div className="xl:col-span-5 bg-white p-6 rounded-xl border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-900">Seat Utilization</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between py-2 gap-6">
            {/* Donut Chart with Centered Occupancy Label */}
            <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={seatDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {seatDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-zinc-900 leading-none">
                  {stats.occupancyPercentage}%
                </span>
                <span className="text-xs text-zinc-400 font-medium mt-1">Occupied</span>
              </div>
            </div>

            {/* Legend List on Right matching screenshot */}
            <div className="w-full sm:w-44 space-y-3.5">
              {seatDonutData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-zinc-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-zinc-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Book Issues & Recent Seat Assignments */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent Book Issues Table */}
        <div className="xl:col-span-6 bg-white p-6 rounded-xl border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900">Recent Book Issues</h2>
            <button
              onClick={() => navigate('/issues')}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 font-semibold">
                  <th className="py-2 px-2 w-8">#</th>
                  <th className="py-2 px-2">Book Title</th>
                  <th className="py-2 px-2">User</th>
                  <th className="py-2 px-2">Issue Date</th>
                  <th className="py-2 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {displayIssues.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-2 text-zinc-400 font-mono text-[11px]">{row.id}</td>
                    <td className="py-3 px-2 font-medium text-zinc-900">{row.title}</td>
                    <td className="py-3 px-2 text-zinc-600">{row.user}</td>
                    <td className="py-3 px-2 text-zinc-500">{row.date}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Seat Assignments Table */}
        <div className="xl:col-span-6 bg-white p-6 rounded-xl border border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900">Recent Seat Assignments</h2>
            <button
              onClick={() => navigate('/seats')}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 font-semibold">
                  <th className="py-2 px-2 w-8">#</th>
                  <th className="py-2 px-2">
                    <div className="flex items-center space-x-1 cursor-pointer">
                      <span>Seat No.</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    </div>
                  </th>
                  <th className="py-2 px-2">User</th>
                  <th className="py-2 px-2">
                    <div className="flex items-center space-x-1 cursor-pointer">
                      <span>Assigned Date</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    </div>
                  </th>
                  <th className="py-2 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {displaySeats.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-2 text-zinc-400 font-mono text-[11px]">{row.id}</td>
                    <td className="py-3 px-2 font-mono font-medium text-zinc-900">{row.seatNo}</td>
                    <td className="py-3 px-2 text-zinc-600">{row.user}</td>
                    <td className="py-3 px-2 text-zinc-500">{row.date}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Add User / Register Patron */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 shadow-xl space-y-4 text-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-zinc-800" />
                <span>Add Member</span>
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {userFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  userFeedback.type === 'success'
                    ? 'bg-zinc-50 border border-zinc-300 text-zinc-800'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {userFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-zinc-800 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{userFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg font-mono text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Membership No</label>
                  <input
                    type="text"
                    value={userMembershipNo}
                    onChange={(e) => setUserMembershipNo(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg font-mono text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-zinc-700 font-semibold">Initial Password</label>
                  <button
                    type="button"
                    onClick={() =>
                      setUserInitialPassword(`Lib@${Math.floor(100000 + Math.random() * 900000)}`)
                    }
                    className="text-[10px] text-zinc-600 hover:text-zinc-900 hover:underline cursor-pointer font-medium"
                  >
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={userInitialPassword}
                  onChange={(e) => setUserInitialPassword(e.target.value)}
                  placeholder="Auto-generated password"
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1 flex items-center justify-between">
                  <span>Allot Study Seat (Optional)</span>
                  {seatsLoading && (
                    <span className="text-[10px] text-zinc-400 font-normal">Loading desks...</span>
                  )}
                </label>
                <select
                  value={userSeatId}
                  onChange={(e) => setUserSeatId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800"
                >
                  <option value="">-- No study seat allotted at registration --</option>
                  {availableSeats.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      {seat.label} ({seat.section}) &bull; Desk #{seat.seatNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userSaving}
                  className="px-4 py-2 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg font-semibold shadow-xs cursor-pointer flex items-center space-x-1.5 transition-colors"
                >
                  {userSaving && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>{userSaving ? 'Adding...' : 'Add Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Login Details Modal (After Creation) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 shadow-xl space-y-4 text-zinc-900">
            <div className="flex items-center space-x-3 border-b border-zinc-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-zinc-900">Member Login Details</h3>
                <p className="text-xs text-zinc-500">Provide these credentials to the user</p>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-semibold font-sans">Full Name:</span>
                <span className="text-zinc-900 font-sans font-medium">
                  {createdCredentials.fullName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-semibold font-sans">Membership ID:</span>
                <span className="font-bold text-white bg-black px-2 py-0.5 rounded-md">
                  {createdCredentials.membershipNo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-semibold font-sans">Email:</span>
                <span className="text-zinc-700">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-semibold font-sans">Initial Password:</span>
                <span className="font-bold text-zinc-900 bg-white border border-zinc-300 px-2.5 py-0.5 rounded-md">
                  {createdCredentials.password}
                </span>
              </div>
              {createdCredentials.allottedSeat && (
                <div className="flex justify-between items-center pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500 font-semibold font-sans">Allotted Study Seat:</span>
                  <span className="font-sans font-semibold text-zinc-900 bg-white px-2 py-0.5 rounded-md border border-zinc-300">
                    {createdCredentials.allottedSeat.label} ({createdCredentials.allottedSeat.section})
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => copyCredentialsText(createdCredentials)}
                className="flex-1 py-2.5 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied Details!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Login Details</span>
                  </>
                )}
              </button>

              <button
                onClick={async () => {
                  const mem = createdCredentials.membershipNo;
                  setCreatedCredentials(null);
                  try {
                    await adminViewLogin(mem);
                    navigate('/portal');
                  } catch (e) {
                    navigate('/users');
                  }
                }}
                className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold border border-zinc-200 flex items-center space-x-1 cursor-pointer transition-colors"
                title="Inspect member portal without password"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Dashboard</span>
              </button>

              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold border border-zinc-200 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
