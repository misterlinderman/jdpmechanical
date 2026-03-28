import { useCallback, useState } from 'react';
import api from '../services/api';

interface ColumnMap {
  [header: string]: string | null;
}

export default function AdminImport(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [columnMap, setColumnMap] = useState<ColumnMap | null>(null);
  const [previewErrors, setPreviewErrors] = useState<{ row: number; message: string }[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const [manual, setManual] = useState({
    equipmentId: '',
    floor: '',
    lineSize: '',
    supplyDirection: 'Left' as 'Left' | 'Right',
  });

  const runPreview = useCallback(async (f: File) => {
    setBusy(true);
    setDoneMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('dryRun', 'true');
      const res = await api.post<{
        success: boolean;
        data: { columnMap: ColumnMap; errors: { row: number; message: string }[]; validCount: number; ready: boolean };
      }>('/units/import', fd);
      setColumnMap(res.data.data.columnMap);
      setPreviewErrors(res.data.data.errors ?? []);
      setValidCount(res.data.data.validCount ?? 0);
      setReady(!!res.data.data.ready);
    } catch {
      setColumnMap(null);
      setPreviewErrors([{ row: 0, message: 'Could not parse file.' }]);
      setValidCount(0);
      setReady(false);
    } finally {
      setBusy(false);
    }
  }, []);

  const onFile = (f: File | null) => {
    setFile(f);
    if (f) void runPreview(f);
    else {
      setColumnMap(null);
      setPreviewErrors([]);
      setValidCount(0);
      setReady(false);
    }
  };

  const importFile = async () => {
    if (!file) return;
    setBusy(true);
    setDoneMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post<{ success: boolean; data: { inserted: number; errors: unknown[] } }>(
        '/units/import',
        fd
      );
      const n = res.data.data?.inserted ?? 0;
      setDoneMsg(`Imported ${n} units successfully.`);
      setFile(null);
      setColumnMap(null);
      setPreviewErrors([]);
      setValidCount(0);
      setReady(false);
    } catch {
      setDoneMsg('Import failed. Check the file and try again.');
    } finally {
      setBusy(false);
    }
  };

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.equipmentId.trim() || !manual.floor || !manual.lineSize) return;
    setBusy(true);
    try {
      await api.post('/units', {
        equipmentId: manual.equipmentId.trim(),
        floor: Number(manual.floor),
        lineSize: manual.lineSize.trim(),
        supplyDirection: manual.supplyDirection,
        referenceDocument: '—',
        submittalGPM: 0,
        designGPM: 0,
        ctlSize: manual.lineSize.trim(),
      });
      setManual({ equipmentId: '', floor: '', lineSize: '', supplyDirection: 'Left' });
      setDoneMsg('Unit added.');
    } catch {
      setDoneMsg('Could not add unit (duplicate ID or validation).');
    } finally {
      setBusy(false);
    }
  };

  const mappingRows = columnMap ? Object.entries(columnMap) : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 text-[var(--text)]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Import units</h1>
          <p className="text-sm text-[var(--muted)] mt-1">CSV or Excel · column mapping on the right</p>
        </div>

        <div
          className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center bg-[var(--surface)] hover:border-[var(--gold)]/50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
        >
          <p className="text-[var(--muted)] mb-4">Drag and drop .csv, .xlsx, or .xls</p>
          <label className="btn-jdp-secondary inline-block cursor-pointer">
            Browse files
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && <p className="mt-4 text-sm font-mono text-[var(--muted)]">{file.name}</p>}
        </div>

        <form onSubmit={addManual} className="card-jdp space-y-4">
          <h2 className="text-lg font-semibold">Manual entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Equipment #</label>
              <input
                className="input-jdp"
                value={manual.equipmentId}
                onChange={(e) => setManual((m) => ({ ...m, equipmentId: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Floor</label>
              <input
                className="input-jdp"
                type="number"
                value={manual.floor}
                onChange={(e) => setManual((m) => ({ ...m, floor: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Line size</label>
              <input
                className="input-jdp"
                value={manual.lineSize}
                onChange={(e) => setManual((m) => ({ ...m, lineSize: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Supply</label>
              <select
                className="input-jdp"
                value={manual.supplyDirection}
                onChange={(e) =>
                  setManual((m) => ({ ...m, supplyDirection: e.target.value as 'Left' | 'Right' }))
                }
              >
                <option value="Left">Left</option>
                <option value="Right">Right</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-jdp-gold w-full sm:w-auto" disabled={busy}>
            Add unit
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {doneMsg && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 px-4 py-3 text-sm">
            {doneMsg}
          </div>
        )}

        {!file && (
          <div className="card-jdp text-[var(--muted)] text-sm">Select a file to see column mapping and import.</div>
        )}

        {file && columnMap && (
          <>
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                ready
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
              }`}
            >
              {ready
                ? `Ready to import — ${validCount} units detected · ${previewErrors.length} row issues`
                : `Review required — ${validCount} valid rows · ${previewErrors.length} issues`}
            </div>

            <div className="card-jdp overflow-x-auto">
              <h2 className="text-lg font-semibold mb-4">Column mapping</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                    <th className="pb-2 pr-4">Your column</th>
                    <th className="pb-2 pr-4">Maps to</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mappingRows.map(([h, field]) => (
                    <tr key={h} className="border-b border-[var(--border)]">
                      <td className="py-2 pr-4 font-mono text-xs">{h}</td>
                      <td className="py-2 pr-4">{field ?? '—'}</td>
                      <td className="py-2">{field ? '✓ matched' : '⚠ review'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="text-sm text-[var(--muted)] space-y-1">
              <li>✓ File parsed</li>
              <li>{mappingRows.some(([, f]) => !f) ? '⚠' : '✓'} Columns matched</li>
              <li>✓ Duplicate / type checks (see errors)</li>
            </ul>

            {previewErrors.length > 0 && (
              <div className="text-xs text-amber-200 max-h-32 overflow-y-auto space-y-1">
                {previewErrors.slice(0, 20).map((er, i) => (
                  <div key={i}>
                    Row {er.row}: {er.message}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="btn-jdp-gold w-full min-h-[48px] text-base font-semibold disabled:opacity-50"
              disabled={busy || !ready}
              onClick={() => void importFile()}
            >
              {busy ? 'Working…' : `Import ${validCount} units`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
