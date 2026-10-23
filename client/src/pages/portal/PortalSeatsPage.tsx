import React, { useState, useEffect } from 'react';
import {
  Armchair,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Info,
  ShieldCheck,
  Sparkles,
  MapPin,
  Ban,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { usePatronAuth } from '../../context/PatronAuthContext';

export const PortalSeatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { patron } = usePatronAuth();
  const isBlocked = patron?.status === 'BLOCKED';

  const [seats, setSeats] = useState<any[]>([]);
  const [activeSeat, setActiveSeat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [seatsRes, dashRes] = await Promise.all([
          api.get('/patron/seats').catch(() => api.get('/seats')).catch(() => ({ data: { success: false } })),
          api.get('/patron/dashboard').catch(() => ({ data: { success: false } })),
        ]);

        if (seatsRes.data?.success) {
          const raw = seatsRes.data.data;
          const list = Array.isArray(raw) ? raw : raw?.seats || [];
          setSeats(list);
        }
        if (dashRes.data?.success) {
          setActiveSeat(dashRes.data.data.activeSeat);
        }
      } catch (err) {
        console.error('Failed to load seats map:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalDesks = seats.length || 30;
  const occupiedDesks = seats.filter((s) => s.status === 'OCCUPIED').length;
  const availableDesks = seats.filter((s) => s.status === 'AVAILABLE').length;

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
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Study Hall Floor Map</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              30 Study Desks
            </span>
          </div>
          <p className="text-xs text-slate-400">
            View live study desk capacity, quiet study zones, and your assigned seat reservation
          </p>
        </div>

        {/* Occupancy Stats Pill */}
        <div className="flex items-center space-x-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 self-start sm:self-auto text-xs">
          <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold border border-emerald-500/20">
            {availableDesks} Available
          </div>
          <div className="px-3 py-1 bg-slate-800 text-slate-400 rounded-xl font-semibold">
            {occupiedDesks} Occupied
          </div>
        </div>
      </div>

      {/* Account Blocked Alert Banner */}
      {isBlocked && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Ban className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Desk Reservations Suspended</div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Your library account is currently blocked by the administrator. Desk booking and study hall reservations are disabled until the administrative hold is resolved.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/portal')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-md shadow-rose-600/30"
          >
            View Admin Contact Details
          </button>
        </div>
      )}

      {/* Patron's Current Active Desk Banner */}
      {activeSeat ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex flex-col items-center justify-center text-amber-300 shadow-lg shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider">Desk</span>
              <span className="text-2xl font-black">{activeSeat.seatNumber}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white">{activeSeat.label}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeSeat.section}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  YOUR RESERVED SEAT
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Check-in time: {new Date(activeSeat.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400">
            <div className="text-amber-400 font-semibold flex items-center sm:justify-end space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Power outlets & High-Speed WiFi available</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Desk reserved exclusively for you during this session</div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              You do not have a study desk checked out. Study desks can be allocated at the library front desk.
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Free for all active members</span>
        </div>
      )}

      {/* Visual Desk Grid */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Armchair className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Main Study Hall & Quiet Zone Map
            </h2>
          </div>

          {/* Map Legend */}
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/20 border border-emerald-500/50" />
              <span className="text-slate-400">Available</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-md bg-slate-800 border border-slate-700" />
              <span className="text-slate-400">Occupied</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-md bg-amber-500/30 border border-amber-400 shadow-xs" />
              <span className="text-amber-400 font-bold">Your Desk</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            Loading desks map...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-3.5">
            {seats.map((seat) => {
              const isMySeat = activeSeat && activeSeat.seatNumber === seat.seatNumber;
              const isOccupied = seat.status === 'OCCUPIED';

              let style = 'bg-slate-950/60 border-slate-800 text-slate-400';
              let badge = 'Available';
              let badgeStyle = 'text-emerald-400';

              if (isMySeat) {
                style =
                  'bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-amber-400 text-white shadow-lg shadow-amber-500/10 scale-102 ring-2 ring-amber-400/40';
                badge = 'YOUR DESK';
                badgeStyle = 'text-amber-300 font-bold';
              } else if (isOccupied) {
                style = 'bg-slate-950/90 border-slate-800/80 text-slate-600 opacity-60';
                badge = 'In Use';
                badgeStyle = 'text-slate-500';
              } else {
                style = 'bg-slate-950 border-slate-800 hover:border-emerald-500/40 text-slate-300';
              }

              return (
                <div
                  key={seat.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-2 text-center ${style}`}
                >
                  <Armchair
                    className={`w-6 h-6 ${
                      isMySeat ? 'text-amber-400' : isOccupied ? 'text-slate-600' : 'text-emerald-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{seat.label || `Desk ${seat.seatNumber}`}</div>
                    <div className="text-[10px] text-slate-500">{seat.section || 'Main Hall'}</div>
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wider ${badgeStyle}`}>{badge}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Study Hall Etiquette */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Study Hall Etiquette: Keep phones on silent mode. Beverages in closed containers only.
            </span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">Free WiFi: MetroLib_Patron</span>
        </div>
      </div>
    </div>
  );
};
