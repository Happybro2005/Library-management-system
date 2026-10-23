import React, { useState, useEffect } from 'react';
import { BarChart3, BookOpen, Repeat, Armchair, FileText, Printer } from 'lucide-react';
import { api } from '../api/client';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'ebooks' | 'borrowed' | 'history' | 'seats'>('inventory');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (tab: string) => {
    setLoading(true);
    try {
      let endpoint = '/reports/inventory';
      if (tab === 'ebooks') endpoint = '/reports/ebooks';
      if (tab === 'borrowed') endpoint = '/reports/borrowed-books';
      if (tab === 'history') endpoint = '/reports/history';
      if (tab === 'seats') endpoint = '/reports/seat-occupancy';

      const res = await api.get(endpoint);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab]);

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Circulation & Statistical Reports</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Comprehensive audit reports and inventory metrics</p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Report</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 space-x-6 text-xs font-medium">
        {[
          { key: 'inventory', label: 'Inventory Breakdown', icon: BookOpen },
          { key: 'ebooks', label: 'Digital E-Books', icon: FileText },
          { key: 'borrowed', label: 'Active Borrowings', icon: Repeat },
          { key: 'history', label: 'Historical Issues', icon: BarChart3 },
          { key: 'seats', label: 'Seat Occupancy', icon: Armchair },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`pb-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-white text-white font-bold'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div className="bg-zinc-900/90 p-6 rounded-3xl border border-zinc-800 shadow-sm space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading statistical report...</div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white capitalize">
              {activeTab} Summary Data
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Metric / Record</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {data && typeof data === 'object' ? (
                    Array.isArray(data) ? (
                      data.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-850/50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-white">
                            {item.title || item.user?.fullName || item.category || `Record #${idx + 1}`}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-300 font-mono text-[11px]">
                            {JSON.stringify(item)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      Object.entries(data).map(([key, val]: any, idx) => (
                        <tr key={idx} className="hover:bg-zinc-850/50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-white capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-300 font-mono">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-zinc-500">
                        No report data generated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
