import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { IUnit } from '../types/unit';
import { useRealtimeUnits } from '../hooks/useRealtimeUnits';
import { formatTimeAgo, workerShortName } from '../lib/format';

interface RecentRow {
  _id: string;
  action: string;
  timestamp: string;
  unit?: { equipmentId: string; floor: number };
  user?: { name: string };
}

function StageBadge(props: { stage: 'fab' | 'del' | 'ins'; ok: boolean }): JSX.Element {
  const { stage, ok } = props;
  const label = stage === 'fab' ? 'Fab' : stage === 'del' ? 'Del' : 'Ins';
  const cls = ok
    ? stage === 'fab'
      ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
      : stage === 'del'
        ? 'bg-blue-500/20 text-blue-200 border-blue-500/40'
        : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
    : 'bg-slate-600/30 text-slate-300 border-slate-500/40';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{label}</span>
  );
}

export default function AdminDashboard(): JSX.Element {
  const [units, setUnits] = useState<IUnit[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');

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

  const fetchRecent = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: RecentRow[] }>('/events/recent');
      setRecent(res.data.data ?? []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    void fetchUnits();
  }, [fetchUnits]);

  const tableUnits = useMemo(() => {
    return units.filter((u) => {
      if (floorFilter && String(u.floor) !== floorFilter) return false;
      if (!stageFilter) return true;
      if (stageFilter === 'pending') return !u.fabricated;
      if (stageFilter === 'fabricated') return !!u.fabricated;
      if (stageFilter === 'delivered') return !!u.delivered;
      if (stageFilter === 'installed') return !!u.installed;
      return true;
    });
  }, [units, floorFilter, stageFilter]);

  useEffect(() => {
    void fetchRecent();
  }, [fetchRecent]);

  const onUnitUpdated = useCallback((u: IUnit) => {
    setUnits((prev) => {
      const i = prev.findIndex((x) => x._id === u._id);
      if (i < 0) return [...prev, u];
      const n = [...prev];
      n[i] = { ...n[i], ...u };
      return n;
    });
    void fetchRecent();
  }, [fetchRecent]);

  const onImported = useCallback(() => {
    void fetchUnits();
  }, [fetchUnits]);

  useRealtimeUnits(onUnitUpdated, onImported);

  const stats = useMemo(() => {
    const total = units.length;
    const fab = units.filter((u) => u.fabricated).length;
    const del = units.filter((u) => u.delivered).length;
    const ins = units.filter((u) => u.installed).length;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return { total, fab, del, ins, pFab: pct(fab), pDel: pct(del), pIns: pct(ins) };
  }, [units]);

  const floors = useMemo(() => {
    const m = new Map<number, { total: number; fab: number }>();
    for (const u of units) {
      const cur = m.get(u.floor) || { total: 0, fab: 0 };
      cur.total += 1;
      if (u.fabricated) cur.fab += 1;
      m.set(u.floor, cur);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [units]);

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

  const uniqueFloors = useMemo(() => [...new Set(units.map((u) => u.floor))].sort((a, b) => a - b), [units]);

  return (
    <div className="space-y-8 text-[var(--text)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin overview</h1>
          <p className="text-[var(--muted)] text-sm mt-1">FPB Tracker · unit pipeline</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/import" className="btn-jdp-secondary text-sm">
            Import
          </Link>
          <Link to="/admin/qr" className="btn-jdp-secondary text-sm">
            QR manager
          </Link>
          <Link to="/dashboard" className="btn-jdp-secondary text-sm">
            Live table
          </Link>
          <Link to="/admin/activity" className="btn-jdp-secondary text-sm">
            Activity
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total units" value={stats.total} bar={100} barClass="bg-slate-500" sub="100%" />
        <StatCard label="Fabricated" value={stats.fab} bar={stats.pFab} barClass="bg-[var(--gold)]" sub={`${stats.pFab}%`} />
        <StatCard label="Delivered" value={stats.del} bar={stats.pDel} barClass="bg-[#378ADD]" sub={`${stats.pDel}%`} />
        <StatCard label="Installed" value={stats.ins} bar={stats.pIns} barClass="bg-emerald-500" sub={`${stats.pIns}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-jdp">
          <h2 className="text-lg font-semibold mb-4">Progress by floor</h2>
          <div className="space-y-3">
            {floors.length === 0 && <p className="text-sm text-[var(--muted)]">No units yet.</p>}
            {floors.map(([floor, { total, fab }]) => {
              const p = total ? Math.round((fab / total) * 100) : 0;
              return (
                <div key={floor}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Floor {floor}</span>
                    <span className="text-[var(--muted)]">
                      {fab}/{total} fab · {p}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full bg-[var(--gold)] transition-all" style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card-jdp">
          <h2 className="text-lg font-semibold mb-4">Recent activity</h2>
          <ul className="space-y-3">
            {recent.length === 0 && <p className="text-sm text-[var(--muted)]">No scans yet.</p>}
            {recent.map((e) => {
              const badge =
                e.action === 'fabricated'
                  ? 'bg-amber-500/20 text-amber-200'
                  : e.action === 'delivered'
                    ? 'bg-blue-500/20 text-blue-200'
                    : 'bg-emerald-500/20 text-emerald-200';
              return (
                <li key={e._id} className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${badge}`}>{e.action}</span>
                  <span className="font-mono flex-1">{e.unit?.equipmentId ?? '—'}</span>
                  <span className="text-[var(--muted)] hidden sm:inline">{workerShortName(e.user?.name)}</span>
                  <span className="text-[var(--muted)]">{formatTimeAgo(e.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="card-jdp">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Unit status</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="input-jdp text-sm py-2"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
            >
              <option value="">All floors</option>
              {uniqueFloors.map((f) => (
                <option key={f} value={f}>
                  Floor {f}
                </option>
              ))}
            </select>
            <select
              className="input-jdp text-sm py-2"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All stages</option>
              <option value="pending">Pending</option>
              <option value="fabricated">Fabricated</option>
              <option value="delivered">Delivered</option>
              <option value="installed">Installed</option>
            </select>
            <button type="button" className="btn-jdp-gold text-sm" onClick={() => void exportCsv()}>
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                <th className="pb-2 pr-4">Equipment #</th>
                <th className="pb-2 pr-4">Floor</th>
                <th className="pb-2 pr-4">Fab</th>
                <th className="pb-2 pr-4">Del</th>
                <th className="pb-2 pr-4">Ins</th>
                <th className="pb-2 pr-4">Line</th>
                <th className="pb-2">GPM</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                    Loading…
                  </td>
                </tr>
              ) : tableUnits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                    No units match filters.
                  </td>
                </tr>
              ) : (
                tableUnits.map((u) => (
                  <tr key={u._id} className="border-b border-[var(--border)] hover:bg-white/5">
                    <td className="py-2 pr-4 font-mono font-medium">{u.equipmentId}</td>
                    <td className="py-2 pr-4">{u.floor}</td>
                    <td className="py-2 pr-4">
                      <StageBadge stage="fab" ok={!!u.fabricated} />
                    </td>
                    <td className="py-2 pr-4">
                      <StageBadge stage="del" ok={!!u.delivered} />
                    </td>
                    <td className="py-2 pr-4">
                      <StageBadge stage="ins" ok={!!u.installed} />
                    </td>
                    <td className="py-2 pr-4 font-mono">{u.lineSize}</td>
                    <td className="py-2 font-mono text-[var(--muted)]">
                      {u.submittalGPM}/{u.designGPM}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard(props: {
  label: string;
  value: number;
  bar: number;
  barClass: string;
  sub: string;
}): JSX.Element {
  const { label, value, bar, barClass, sub } = props;
  return (
    <div className="card-jdp">
      <p className="text-sm text-[var(--muted)] mb-1">{label}</p>
      <p className="text-3xl font-bold font-mono">{value}</p>
      <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden mt-3">
        <div className={`h-full ${barClass} transition-all`} style={{ width: `${bar}%` }} />
      </div>
      <p className="text-xs text-[var(--muted)] mt-2">{sub}</p>
    </div>
  );
}
