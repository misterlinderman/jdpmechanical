export function formatTimeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

export function formatScanTableTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayMs = 86400000;
  const diffDays = Math.round((startOfToday.getTime() - startOfThat.getTime()) / dayMs);
  const t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: false });
  if (diffDays === 0) return `Today ${t}`;
  if (diffDays === 1) return `Yesterday ${t}`;
  return d.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export function workerShortName(name: string | undefined): string {
  if (!name?.trim()) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}
