import React, { useState, useEffect } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { api } from '../api/client';

export const ActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/activity');
      if (res.data?.success) {
        setLogs(res.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Activity Audit Trail</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Immutable system event logs, security actions, and database modifications</p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl border border-zinc-800 shadow-xs self-start sm:self-auto cursor-pointer transition-colors"
          title="Refresh Audit Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-zinc-900/90 rounded-3xl border border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Metadata</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white font-mono text-[11px] bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                        {log.actionType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{log.actorName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{log.actorId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{log.entityType}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    {loading ? 'Loading audit logs...' : 'No activity logs found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
