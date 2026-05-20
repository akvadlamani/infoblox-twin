import { useState } from 'react';
import {
  IconCube,
  IconTarget,
  IconRoute,
  IconShieldBolt,
  IconChartBar,
  IconBandage,
  IconClipboardCheck,
  IconRobot,
} from '@tabler/icons-react';
import { useAppStore } from '@/lib/state/store';
import type { ViewName } from '@/lib/types/twin.types';

interface Tab {
  id: ViewName;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  hint: string;
}

const ALL_TABS: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: IconCube,
    hint: "Today's exposure, the overnight intel brief, and the full network at a glance.",
  },
  {
    id: 'crq',
    label: 'Board CRQ',
    icon: IconChartBar,
    hint: 'Annualized loss expectancy in dollars · Gartner MDP · toggles recompute live.',
  },
  {
    id: 'attack-path',
    label: 'Blast Radius',
    icon: IconRoute,
    hint: 'Click any asset to see inbound paths, blast radius, exposure, and the controls that shrink it.',
  },
  {
    id: 'aev',
    label: 'Breach Replay',
    icon: IconTarget,
    hint: 'Replay a real Infoblox-tracked actor hop-by-hop, with MITRE techniques pinned to the active edge.',
  },
  {
    id: 'patch-risk',
    label: 'Patch Risk',
    icon: IconBandage,
    hint: 'Open CVEs scored against how your network actually behaves — not the CVSS sticker.',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: IconClipboardCheck,
    hint: 'PCI · HIPAA · GDPR · SOX zones auto-classified. Drift surfaced continuously.',
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: IconRobot,
    hint: 'Meet your AI security team. Identity, scope, autonomy, and trust — for each of the nine agents.',
  },
  {
    id: 'agent-iez',
    label: 'Console',
    icon: IconShieldBolt,
    hint: 'Pending agent proposals waiting on a human. Each is attributed to the agent that proposed it.',
  },
];

export function TabNav() {
  const view = useAppStore((s) => s.view);
  const persona = useAppStore((s) => s.persona);
  const setView = useAppStore((s) => s.setView);
  const [hovered, setHovered] = useState<ViewName | null>(null);

  let tabs = ALL_TABS;
  if (persona === 'cro')
    tabs = ALL_TABS.filter((t) => !['aev', 'agent-iez', 'patch-risk', 'agents'].includes(t.id));

  return (
    <nav className="absolute top-[56px] left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-surface/85 border border-white/8 backdrop-blur-md">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          const isHovered = hovered === t.id;
          return (
            <div key={t.id} className="relative">
              <button
                onClick={() => setView(t.id)}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(t.id)}
                onBlur={() => setHovered(null)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-fast ${
                  active
                    ? 'bg-accent/15 text-text1'
                    : 'text-text2 hover:text-text1 hover:bg-white/5'
                }`}
              >
                <Icon size={13} className={active ? 'text-accent2' : ''} />
                <span>{t.label}</span>
              </button>
              {isHovered && !active && (
                <Tooltip label={t.label} hint={t.hint} />
              )}
              {isHovered && active && (
                <Tooltip label={t.label} hint={t.hint} subtle />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function Tooltip({
  label,
  hint,
  subtle,
}: {
  label: string;
  hint: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none ${
        subtle ? 'opacity-90' : 'opacity-100'
      }`}
      role="tooltip"
    >
      <div className="relative">
        <div className="w-[260px] px-3 py-2 rounded-md bg-surface2/95 border border-white/10 backdrop-blur-md shadow-lg">
          <div className="text-[11px] font-medium text-text1 mb-0.5">{label}</div>
          <div className="text-[10px] text-text3 leading-snug">{hint}</div>
        </div>
        {/* arrow */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-surface2/95 border-l border-t border-white/10" />
      </div>
    </div>
  );
}
