import { useEffect, useState } from 'react';
import {
  IconCircleFilled,
  IconCommand,
  IconShieldCheck,
  IconSettings,
  IconLogout,
  IconRoute,
} from '@tabler/icons-react';
import { twinClient, DATA_MODE } from '@/lib/data-clients/factory';
import type { OrgInfo, DataSourceHealth } from '@/lib/types/twin.types';
import { formatRelativeTime } from '@/lib/scene/colors';
import { PersonaSwitcher } from './PersonaSwitcher';
import { useAppStore } from '@/lib/state/store';

export function TopBar() {
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [health, setHealth] = useState<DataSourceHealth[]>([]);
  const [edgeCount, setEdgeCount] = useState(0);
  const setView = useAppStore((s) => s.setView);
  const view = useAppStore((s) => s.view);
  const logout = useAppStore((s) => s.logout);
  const username = useAppStore((s) => s.username);
  const startTour = useAppStore((s) => s.startTour);

  useEffect(() => {
    twinClient.getOrgInfo().then(setOrg);
    twinClient.getDataSourceHealth().then(setHealth);
    twinClient.getEdges().then((es) => setEdgeCount(es.length));
  }, []);

  const allHealthy = health.every((h) => h.healthy);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-5 py-3 flex items-center gap-4 bg-gradient-to-b from-page/95 via-page/80 to-transparent">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-accent/15 border border-accent/40 flex items-center justify-center">
            <IconShieldCheck size={14} className="text-accent2" />
          </div>
          <span className="text-[13px] font-medium text-text1">Infoblox Twin</span>
        </div>
        <div className="h-5 w-px bg-text3/20" />
        <div className="text-small flex items-center gap-2 min-w-0">
          <span className="text-text1 font-medium">{org?.name ?? 'Loading…'}</span>
          <span className="text-text3">·</span>
          <span
            className="font-mono text-[12px] text-text2"
            title="Rendered in the graph · total in inventory"
          >
            <span className="text-text1">{org?.assetCount ?? '—'}</span>
            <span className="text-text3"> / 4,247</span> assets
          </span>
          <span className="text-text3">·</span>
          <span className="font-mono text-[12px] text-text2">{edgeCount} relationships</span>
          {DATA_MODE === 'mock' && (
            <>
              <span className="text-text3">·</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-warning/15 text-warning border border-warning/30">
                demo data
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <button
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface/70 hover:bg-surface2 border border-white/5 transition-colors duration-fast text-[11px] text-text3"
        title="Command palette (Cmd+K)"
        onClick={() => alert('Command palette — coming in v2')}
      >
        <IconCommand size={12} />
        <span>Quick find…</span>
        <span className="ml-2 px-1 py-0.5 rounded bg-white/5 font-mono text-[9px] text-text3">⌘K</span>
      </button>

      <div
        className="hidden lg:flex items-center gap-1.5 text-[11px]"
        title={health.map((h) => h.source).join(', ')}
      >
        <IconCircleFilled size={7} className={allHealthy ? 'text-success' : 'text-warning'} />
        <span className="text-text3">
          {allHealthy ? 'All sources healthy' : 'Degraded'} · {org ? formatRelativeTime(org.lastSyncAt) : '—'}
        </span>
      </div>

      <button
        onClick={() => startTour()}
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent2 text-[11px] font-medium transition-colors duration-fast"
        title="Take the guided tour"
      >
        <IconRoute size={12} />
        <span>Take the tour</span>
      </button>

      <PersonaSwitcher />

      <button
        onClick={() => setView('settings')}
        className={`p-1.5 rounded-md border transition-colors duration-fast ${
          view === 'settings'
            ? 'bg-accent/15 border-accent/40 text-accent2'
            : 'bg-surface/70 border-white/5 text-text3 hover:text-text1'
        }`}
        title="Settings — discovery sources"
      >
        <IconSettings size={14} />
      </button>

      <button
        onClick={logout}
        className="p-1.5 rounded-md bg-surface/70 border border-white/5 text-text3 hover:text-text1 transition-colors duration-fast"
        title={`Sign out · ${username}`}
      >
        <IconLogout size={14} />
      </button>
    </header>
  );
}
