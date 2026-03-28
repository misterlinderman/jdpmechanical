import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { IUnit } from '../types/unit';
import { useSessionRoles } from '../hooks/useSessionRoles';
import { useRealtimeUnits } from '../hooks/useRealtimeUnits';
import { formatScanTableTime, formatTimeAgo, workerShortName } from '../lib/format';

export default function LiveDashboard(): JSX.Element {
  const { isAdmin, isPm } = useSessionRoles();
  const [units, setUnits] = useState<IUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: IUnit[] }>('/units');
      setUnits(res.data.data ?? []);
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUnits();
  }, [fetchUnits]);

  const onUnitUpdated = useCallback(
    (u: IUnit) => {
      setLastEventAt(Date.now());
      setUnits((prev) => {
        const i = prev.findIndex((x) => x._id === u._id);
        if (i < 0) return [...prev, u];
        const n = [...prev];
        n[i] = { ...n[i], ...u };
        return n;
      });
    },
    []
  );

  useRealtimeUnits(onUnitUpdated, fetchUnits);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => {
      if (q && !u.equipmentId.toLowerCase().includes(q)) return false;
      if (floorFilter && String(u.floor) !== floorFilter) return false;
      if (!stageFilter) return true;
      if (stageFilter === 'pending') return !u.fabricated;
      if (stageFilter === 'fabricated') return !!u.fabricated;
      if (stageFilter === 'delivered') return !!u.delivered;
      if (stageFilter === 'installed') return !!u.installed;
      return true;
    });
  }, [units, search, floorFilter, stageFilter]);

  const stats = useMemo(() => {
    const total = units.length;
    const fab = units.filter((u) => u.fabricated).length;
    const del = units.filter((u) => u.delivered).length;
    const ins = units.filter((u) => u.installed).length;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return { total, fab, del, ins, pFab: pct(fab), pDel: pct(del), pIns: pct(ins) };
  }, [units]);

  const uniqueFloors = useMemo(() => [...new Set(units.map((u) => u.floor))].sort((a, b) => a - b), [units]);

  const exportCsv = async () => {
    const params: Record<string, string> = {};
    if (floorFilter) params.floor = floorFilter;
    if (stageFilter) params.stage = stageFilter;
    const res = await api.get('/export/csv', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fpb-status-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const liveLabel = lastEventAt ? `Last scan ${formatTimeAgo(new Date(lastEventAt).toISOString())}` : 'Waiting for events';

  const currentStage = (u: IUnit): string => {
    if (u.installed) return 'Installed';
    if (u.delivered) return 'Delivered';
    if (u.fabricated) return 'Fabricated';
    return 'Pending';
  };

  const stageBadgeClass = (s: string) => {
    if (s === 'Fabricated') return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
    if (s === 'Delivered') return 'bg-blue-500/20 text-blue-200 border-blue-500/40';
    if (s === 'Installed') return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
    return 'bg-slate-600/30 text-slate-300 border-slate-500/40';
  };

  return (
    <div className="space-y-6 text-[var(--text)]">
      {isPm && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 px-4 py-3 text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live — updating in real time · {liveLabel} · Read-only
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Live dashboard</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Filterable status · CSV export</p>
        </div>
        {isAdmin && (
          <Link to="/admin" className="btn-jdp-secondary text-sm">
            Admin home
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MiniStat label="Total" value={stats.total} />
        <MiniStat label="Fabricated" value={stats.fab} sub={`${stats.pFab}%`} />
        <MiniStat label="Delivered" value={stats.del} sub={`${stats.pDel}%`} />
        <MiniStat label="Installed" value={stats.ins} sub={`${stats.pIns}%`} />
      </div>

      <div className="card-jdp flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-[var(--muted)]">Search equipment</label>
          <input className="input-jdp mt-1" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Floor</label>
          <select
            className="input-jdp mt-1 block"
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
          >
            <option value="">All</option>
            {uniqueFloors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Stage</label>
          <select
            className="input-jdp mt-1 block"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="fabricated">Fabricated</option>
            <option value="delivered">Delivered</option>
            <option value="installed">Installed</option>
          </select>
        </div>
        {(isAdmin || isPm) && (
          <button type="button" className="btn-jdp-gold text-sm" onClick={() => void exportCsv()}>
            Export CSV
          </button>
        )}
      </div>

      <div className="card-jdp overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <th className="pb-2 pr-3">Equipment</th>
              <th className="pb-2 pr-3">Floor</th>
              <th className="pb-2 pr-3">Stage</th>
              <th className="pb-2 pr-3">Fab by</th>
              <th className="pb-2 pr-3">Fab time</th>
              <th className="pb-2 pr-3">Del by</th>
              <th className="pb-2 pr-3">Del time</th>
              <th className="pb-2 pr-3">Ins by</th>
              <th className="pb-2">Ins time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[var(--muted)]">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[var(--muted)]">
                  No rows.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const s = currentStage(u);
                return (
                  <tr key={u._id} className="border-b border-[var(--border)] hover:bg-white/5">
                    <td className="py-2 pr-3 font-mono">{u.equipmentId}</td>
                    <td className="py-2 pr-3">{u.floor}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${stageBadgeClass(s)}`}>
                        {s}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{workerShortName(u.fabricated?.completedBy?.name)}</td>
                    <td className="py-2 pr-3 text-[var(--muted)]">
                      {u.fabricated?.completedAt ? formatScanTableTime(u.fabricated.completedAt) : '—'}
                    </td>
                    <td className="py-2 pr-3">{workerShortName(u.delivered?.completedBy?.name)}</td>
                    <td className="py-2 pr-3 text-[var(--muted)]">
                      {u.delivered?.completedAt ? formatScanTableTime(u.delivered.completedAt) : '—'}
                    </td>
                    <td className="py-2 pr-3">{workerShortName(u.installed?.completedBy?.name)}</td>
                    <td className="py-2 text-[var(--muted)]">
                      {u.installed?.completedAt ? formatScanTableTime(u.installed.completedAt) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: number; sub?: string }): JSX.Element {
  return (
    <div className="card-jdp py-4">
      <p className="text-xs text-[var(--muted)]">{props.label}</p>
      <p className="text-2xl font-bold font-mono">{props.value}</p>
      {props.sub && <p className="text-xs text-[var(--muted)] mt-1">{props.sub}</p>}
    </div>
  );
}
