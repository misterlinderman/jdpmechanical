import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import type { IUnit } from '../types/unit';

export default function QRManager(): JSX.Element {
  const [units, setUnits] = useState<IUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
    void load();
  }, [load]);

  const withQr = useMemo(() => units.filter((u) => u.qrCodeUrl && u.qrCodeUrl.length > 0), [units]);
  const pending = units.length - withQr.length;

  const generateBatch = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post<{ success: boolean; data: { generated: number } }>('/qr/generate', {
        all: true,
      });
      setMsg(`Generated ${res.data.data?.generated ?? 0} QR codes.`);
      await load();
    } catch {
      setMsg('QR generation failed. Check AWS/S3 env or use dev mode (inline SVG).');
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async (floor?: string) => {
    setBusy(true);
    try {
      const params: Record<string, string> = {};
      if (floor) params.floor = floor;
      const res = await api.get('/qr/sheet', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fpb-stickers-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setMsg('PDF download failed (Puppeteer/Chromium or no QR URLs).');
    } finally {
      setBusy(false);
    }
  };

  const previewUnits = withQr.slice(0, 18);

  return (
    <div className="space-y-8 text-[var(--text)]">
      <div>
        <h1 className="text-2xl font-bold">QR manager</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Generate stickers · Avery 5160 PDF</p>
      </div>

      {msg && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">{msg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-jdp">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">QR grid</h2>
              <p className="text-sm text-[var(--muted)]">
                {withQr.length} of {units.length} generated · {pending} pending
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-jdp-secondary text-sm" onClick={() => void load()} disabled={busy}>
                Refresh
              </button>
              <button type="button" className="btn-jdp-gold text-sm" onClick={() => void generateBatch()} disabled={busy}>
                Generate batch
              </button>
            </div>
          </div>
          {loading ? (
            <p className="text-[var(--muted)]">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {units.slice(0, 50).map((u) => (
                <div
                  key={u._id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 flex flex-col items-center"
                >
                  <div className="w-full aspect-square bg-white rounded flex items-center justify-center overflow-hidden mb-2">
                    {u.qrCodeUrl ? (
                      <img src={u.qrCodeUrl} alt="" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-[var(--muted)] text-center px-1">Pending</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-center truncate w-full">{u.equipmentId}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card-jdp">
            <h2 className="text-lg font-semibold mb-2">Avery 5160 preview</h2>
            <p className="text-xs text-[var(--muted)] mb-4">Sample layout (first units with QR)</p>
            <div className="grid grid-cols-3 gap-2">
              {previewUnits.slice(0, 6).map((u) => (
                <div
                  key={u._id}
                  className="border border-[var(--border)] rounded p-1 bg-white flex flex-col items-center"
                >
                  <div className="w-10 h-10 bg-white flex items-center justify-center">
                    <img src={u.qrCodeUrl} alt="" className="max-w-full max-h-full" />
                  </div>
                  <p className="text-[8px] font-bold text-black text-center leading-tight mt-1">{u.equipmentId}</p>
                  <p className="text-[7px] text-gray-600">Fl {u.floor}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-jdp-gold w-full mt-4"
              disabled={busy || withQr.length === 0}
              onClick={() => void downloadPdf()}
            >
              Download PDF — all
            </button>
            <button
              type="button"
              className="btn-jdp-secondary w-full mt-2 text-sm"
              disabled={busy || withQr.length === 0}
              onClick={() => {
                const f = prompt('Floor number for PDF filter?');
                if (f) void downloadPdf(f);
              }}
            >
              Download by floor
            </button>
          </div>

          <div className="card-jdp">
            <h2 className="text-lg font-semibold mb-2">S3 storage</h2>
            <div className="h-3 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className="h-full bg-[var(--gold)] transition-all"
                style={{ width: `${units.length ? (withQr.length / units.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">
              {withQr.length}/{units.length} stored
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
