import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookmarkCheck,
  Search,
  Barcode,
  Layers,
  ArrowLeft,
  Clock,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { usePatronAuth } from '../../context/PatronAuthContext';

export const PortalLoansPage: React.FC = () => {
  const navigate = useNavigate();
  const { patron } = usePatronAuth();
  const [tab, setTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [borrowingHistory, setBorrowingHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLoans = async () => {
      setLoading(true);
      try {
        const res = await api.get('/patron/dashboard');
        if (res.data?.success) {
          setActiveLoans(res.data.data.activeLoans || []);
          setBorrowingHistory(res.data.data.borrowingHistory || []);
        }
      } catch (err) {
        console.error('Failed to load loans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, []);

  const filteredHistory = borrowingHistory.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.book.title?.toLowerCase().includes(q) ||
      item.book.author?.toLowerCase().includes(q) ||
      item.book.isbn?.toLowerCase().includes(q) ||
      item.copy.barcode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/portal')}
            className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Borrowed Books & Loans</h1>
          <p className="text-xs text-slate-400">
            Track active library loans, return due dates, and your reading journey
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
              tab === 'ACTIVE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Active Loans ({activeLoans.length})</span>
          </button>
          <button
            onClick={() => setTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
              tab === 'HISTORY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Returned History ({borrowingHistory.length})</span>
          </button>
        </div>
      </div>

      {patron?.status === 'BLOCKED' && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 flex items-start space-x-3 shadow-lg">
          <Ban className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-rose-300">Account Blocked by Administrator</div>
            <p className="mt-0.5 text-rose-200/90 leading-relaxed">
              Your borrowing privileges are currently suspended by library administration. You cannot check out new physical or digital books. Please contact the administrator to resolve this hold.
            </p>
          </div>
          <button
            onClick={() => navigate('/portal')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            View Admin Contacts
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading loan records...</p>
          </div>
        </div>
      ) : tab === 'ACTIVE' ? (
        <div className="space-y-4">
          {activeLoans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLoans.map((loan) => {
                const days = loan.daysRemaining;
                const isOverdue = loan.isOverdue;
                const isDueSoon = days >= 0 && days <= 3;

                let statusBadge = (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {days} days remaining
                  </span>
                );

                if (isOverdue) {
                  statusBadge = (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{Math.abs(days)} days overdue</span>
                    </span>
                  );
                } else if (isDueSoon) {
                  statusBadge = (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{days === 0 ? 'Due Today' : `Due in ${days} days`}</span>
                    </span>
                  );
                }

                return (
                  <div
                    key={loan.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 shadow-xl transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-22 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-800 border border-indigo-700/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-md overflow-hidden">
                        {loan.book.coverImageUrl ? (
                          <img
                            src={loan.book.coverImageUrl}
                            alt={loan.book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-7 h-7" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {loan.book.category}
                          </span>
                          {statusBadge}
                        </div>

                        <h2 className="text-base font-bold text-white tracking-tight mt-2 line-clamp-1">
                          {loan.book.title}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">by {loan.book.author}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">ISBN: {loan.book.isbn}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <div className="text-slate-500 text-[10px] uppercase font-semibold">Copy Barcode</div>
                        <div className="font-mono font-bold text-slate-200 mt-0.5">{loan.copy.barcode}</div>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <div className="text-slate-500 text-[10px] uppercase font-semibold">Shelf Location</div>
                        <div className="font-medium text-slate-200 mt-0.5">{loan.copy.shelfLocation}</div>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 col-span-2 sm:col-span-1">
                        <div className="text-slate-500 text-[10px] uppercase font-semibold">Due Return Date</div>
                        <div className="font-bold text-indigo-300 mt-0.5">
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3 text-[11px] text-indigo-200 flex items-center justify-between">
                      <span>Standard 14-day loan policy</span>
                      <span className="text-slate-400">Return at Circulation Desk</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Active Borrowings</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  You currently have no books checked out from the library. Visit our catalog to find your next book!
                </p>
              </div>
              <button
                onClick={() => navigate('/portal/catalog')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Browse Catalog
              </button>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search returned books by title, author, barcode..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Book Title & Author</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 font-mono">Barcode</th>
                  <th className="py-3.5 px-4">Issued On</th>
                  <th className="py-3.5 px-4">Returned On</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-white">{item.book.title}</div>
                        <div className="text-[11px] text-slate-400">by {item.book.author}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {item.book.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{item.copy.barcode}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(item.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {new Date(item.returnDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Returned
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No reading history matches your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
