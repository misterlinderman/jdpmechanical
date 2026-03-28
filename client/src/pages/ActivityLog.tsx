import { useEffect, useState } from 'react';
import api from '../services/api';
import { formatScanTableTime, workerShortName } from '../lib/format';

interface LogEvent {
  _id: string;
  action: string;
  timestamp: string;
  unit?: { equipmentId: string; floor: number };
  user?: { name: string; email?: string };
}

export default function ActivityLog(): JSX.Element {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: LogEvent[]; total: number }>('/events', {
          params: { page, limit },
        });
        const rows = res.data.data ?? [];
        setEvents((prev) => (page === 1 ? rows : [...prev, ...rows]));
        setTotal(res.data.total ?? 0);
      } catch {
        if (page === 1) setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const canLoadMore = page * limit < total;

  return (
    <div className="space-y-6 text-[var(--text)]">
      <div>
        <h1 className="text-2xl font-bold">Activity log</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Scan events · newest first</p>
      </div>

      <div className="card-jdp overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <th className="pb-2 pr-4">Time</th>
              <th className="pb-2 pr-4">Equipment</th>
              <th className="pb-2 pr-4">Floor</th>
              <th className="pb-2 pr-4">Stage</th>
              <th className="pb-2">Worker</th>
            </tr>
          </thead>
          <tbody>
            {loading && page === 1 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  Loading…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  No events.
                </td>
              </tr>
            ) : (
              events.map((e) => {
                const badge =
                  e.action === 'fabricated'
                    ? 'bg-amber-500/20 text-amber-200'
                    : e.action === 'delivered'
                      ? 'bg-blue-500/20 text-blue-200'
                      : 'bg-emerald-500/20 text-emerald-200';
                return (
                  <tr key={e._id} className="border-b border-[var(--border)]">
                    <td className="py-2 pr-4 text-[var(--muted)]">{formatScanTableTime(e.timestamp)}</td>
                    <td className="py-2 pr-4 font-mono">{e.unit?.equipmentId ?? '—'}</td>
                    <td className="py-2 pr-4">{e.unit?.floor ?? '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs capitalize ${badge}`}>{e.action}</span>
                    </td>
                    <td className="py-2">{workerShortName(e.user?.name)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {canLoadMore && (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn-jdp-secondary text-sm"
            disabled={loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
