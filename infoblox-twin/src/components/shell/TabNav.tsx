import {
  IconCube,
  IconTarget,
  IconRoute,
  IconShieldBolt,
  IconChartBar,
  IconBandage,
  IconClipboardCheck,
} from '@tabler/icons-react';
import { useAppStore } from '@/lib/state/store';
import type { ViewName } from '@/lib/types/twin.types';

interface Tab {
  id: ViewName;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

const ALL_TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: IconCube },
  { id: 'attack-path', label: 'Blast Radius', icon: IconRoute },
  { id: 'aev', label: 'Breach Replay', icon: IconTarget },
  { id: 'patch-risk', label: 'Patch Risk', icon: IconBandage },
  { id: 'compliance', label: 'Compliance', icon: IconClipboardCheck },
  { id: 'agent-iez', label: 'Agent IEZ', icon: IconShieldBolt },
  { id: 'crq', label: 'Board CRQ', icon: IconChartBar },
];

export function TabNav() {
  const view = useAppStore((s) => s.view);
  const persona = useAppStore((s) => s.persona);
  const setView = useAppStore((s) => s.setView);

  let tabs = ALL_TABS;
  if (persona === 'cro') tabs = ALL_TABS.filter((t) => !['aev', 'agent-iez', 'patch-risk'].includes(t.id));

  return (
    <nav className="absolute top-[56px] left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-surface/85 border border-white/8 backdrop-blur-md">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-fast ${
                active
                  ? 'bg-accent/15 text-text1'
                  : 'text-text2 hover:text-text1 hover:bg-white/5'
              }`}
            >
              <Icon size={13} className={active ? 'text-accent2' : ''} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
