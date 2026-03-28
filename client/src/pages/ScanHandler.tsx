import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import type { IUnit } from '../types/unit';
import { useSessionRoles } from '../hooks/useSessionRoles';
import StageTimeline, { type WorkerAction } from '../components/StageTimeline';
import Loading from '../components/Loading';

function roleToAction(roles: string[]): WorkerAction {
  if (roles.includes('fabricator')) return 'fabricated';
  if (roles.includes('driver')) return 'delivered';
  if (roles.includes('installer')) return 'installed';
  return null;
}

function ctaForAction(a: WorkerAction): { label: string; className: string } | null {
  if (a === 'fabricated') return { label: 'Mark fabricated', className: 'bg-[var(--gold)] text-[var(--navy)]' };
  if (a === 'delivered') return { label: 'Mark delivered', className: 'bg-[#378ADD] text-white' };
  if (a === 'installed') return { label: 'Mark installed', className: 'bg-emerald-600 text-white' };
  return null;
}

export default function ScanHandler(): JSX.Element {
  const { unitId } = useParams<{ unitId: string }>();
  const { roles, loading: rolesLoading } = useSessionRoles();
  const [unit, setUnit] = useState<IUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const action = roleToAction(roles);
  const cta = action ? ctaForAction(action) : null;

  const load = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: IUnit }>(`/units/${unitId}`);
      setUnit(res.data.data);
    } catch {
      setError('Could not load this unit.');
      setUnit(null);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async () => {
    if (!unitId || !unit || !action) return;
    setSubmitting(true);
    setBanner(null);
    const prev = unit;
    const optimistic: IUnit = {
      ...unit,
      [action]: {
        completedAt: new Date().toISOString(),
        completedBy: { _id: 'temp', name: 'You' },
      },
    } as IUnit;
    setUnit(optimistic);
    try {
      const res = await api.post<{ success: boolean; unit?: IUnit; error?: string; code?: string }>(
        `/scan/${unitId}`
      );
      if (res.data.success && res.data.unit) {
        setUnit(res.data.unit as IUnit);
        setBanner('Saved successfully.');
      } else {
        setUnit(prev);
        setBanner(res.data.error || 'Could not update.');
      }
    } catch (err: unknown) {
      setUnit(prev);
      const ax = err as { response?: { data?: { error?: string; code?: string } } };
      const msg = ax.response?.data?.error || 'Could not update.';
      setBanner(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (rolesLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[var(--bg)]">
        <Loading />
      </div>
    );
  }

  if (!roles.includes('fabricator') && !roles.includes('driver') && !roles.includes('installer')) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-[var(--text)]">
        <h1 className="text-xl font-semibold mb-2">Wrong role</h1>
        <p className="text-[var(--muted)]">
          This scan page is for field roles (fabricator, driver, installer). Sign in with a worker account or ask an
          admin to assign the correct role in Auth0.
        </p>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-[var(--text)]">
        <h1 className="text-xl font-semibold mb-2">Unit not found</h1>
        <p className="text-[var(--muted)]">{error || 'Invalid link.'}</p>
      </div>
    );
  }

  const canAct =
    action === 'fabricated'
      ? !unit.fabricated
      : action === 'delivered'
        ? !!unit.fabricated && !unit.delivered
        : action === 'installed'
          ? !!unit.delivered && !unit.installed
          : false;

  const showCta = cta && canAct;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pb-28 px-4 pt-6 max-w-lg mx-auto">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)] mb-1">Scanned unit</p>
      <h1 className="text-3xl font-bold font-mono tracking-tight">{unit.equipmentId}</h1>
      <p className="text-[var(--muted)] mt-1">
        Floor {unit.floor} · {unit.lineSize} · Supply {unit.supplyDirection}
      </p>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted)]">Submittal GPM</span>
          <span className="font-mono">{unit.submittalGPM}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted)]">Design GPM</span>
          <span className="font-mono">{unit.designGPM}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted)]">CTL size</span>
          <span className="font-mono">{unit.ctlSize}</span>
        </div>
        <div className="text-sm pt-2 border-t border-[var(--border)]">
          <span className="text-[var(--muted)]">Reference</span>
          <p className="mt-1">{unit.referenceDocument}</p>
        </div>
      </div>

      <div className="mt-6">
        <StageTimeline unit={unit} activeAction={action} />
      </div>

      {banner && (
        <div className="mt-4 text-sm rounded-lg px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)]">
          {banner}
        </div>
      )}

      {showCta && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg)]/95 border-t border-[var(--border)] backdrop-blur-sm">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onSubmit()}
            className={`w-full min-h-[48px] rounded-xl font-semibold text-lg shadow-lg disabled:opacity-60 ${cta.className}`}
          >
            {submitting ? 'Saving…' : cta.label}
          </button>
        </div>
      )}
    </div>
  );
}
