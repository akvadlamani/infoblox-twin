import type { Segment } from '@/lib/types/twin.types';

export const SEGMENT_COLORS: Record<Segment, string> = {
  external: '#888780',
  identity: '#7F77DD',
  finance: '#D85A30',
  engineering: '#1D9E75',
  sales: '#D4537E',
  it: '#378ADD',
  ot: '#E24B4A',
  endpoint: '#B4B2A9',
};

export const SEMANTIC = {
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  accent: '#3b82f6',
  accentHover: '#60a5fa',
};

export const EDGE_COLORS = {
  default: '#2a2a3a',
  identity: '#5a5a8a',
  attack: '#ef4444',
  blast: '#ef4444',
};

export function formatDollars(n: number): string {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
