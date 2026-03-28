import type { IUnit } from '../types/unit';
import { formatScanTableTime, workerShortName } from '../lib/format';

export type WorkerAction = 'fabricated' | 'delivered' | 'installed' | null;

interface StageTimelineProps {
  unit: IUnit;
  activeAction: WorkerAction;
}

function StepRow(props: {
  label: string;
  done: boolean;
  active: boolean;
  locked: boolean;
  who?: string;
  when?: string;
}): JSX.Element {
  const { label, done, active, locked, who, when } = props;
  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0 ${
        locked && !done ? 'opacity-60' : ''
      }`}
    >
      <div className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-2)]">
        {done ? (
          <span className="text-emerald-500 text-lg leading-none">✓</span>
        ) : active ? (
          <span className="text-[var(--gold)] text-lg leading-none">→</span>
        ) : (
          <span className="text-[var(--muted)] text-xs">○</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--text)]">{label}</p>
        {done && who && when && (
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {workerShortName(who)} · {formatScanTableTime(when)}
          </p>
        )}
        {active && <p className="text-sm text-[var(--gold)] mt-1">Tap below to confirm</p>}
        {locked && !done && !active && (
          <p className="text-sm text-[var(--muted)] mt-1">Awaiting prior stage</p>
        )}
      </div>
    </div>
  );
}

export default function StageTimeline({ unit, activeAction }: StageTimelineProps): JSX.Element {
  const fab = unit.fabricated;
  const del = unit.delivered;
  const ins = unit.installed;
  const fabDone = !!fab;
  const delDone = !!del;
  const insDone = !!ins;

  const r1Active = activeAction === 'fabricated' && !fabDone;
  const r2Active = activeAction === 'delivered' && !delDone && fabDone;
  const r3Active = activeAction === 'installed' && !insDone && delDone;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">Stage timeline</h2>
      <StepRow
        label="Fabricated"
        done={fabDone}
        active={r1Active}
        locked={false}
        who={fab?.completedBy?.name}
        when={fab?.completedAt}
      />
      <StepRow
        label="Delivered"
        done={delDone}
        active={r2Active}
        locked={!fabDone}
        who={del?.completedBy?.name}
        when={del?.completedAt}
      />
      <StepRow
        label="Installed"
        done={insDone}
        active={r3Active}
        locked={!delDone}
        who={ins?.completedBy?.name}
        when={ins?.completedAt}
      />
    </div>
  );
}
