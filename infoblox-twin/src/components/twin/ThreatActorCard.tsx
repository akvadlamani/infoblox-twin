import { IconActivity, IconClock } from '@tabler/icons-react';
import type { ThreatActor } from '@/lib/types/twin.types';
import { formatRelativeTime } from '@/lib/scene/colors';

interface Props {
  actor: ThreatActor;
  selected?: boolean;
  onClick?: () => void;
}

const FAMILY_LABEL: Record<ThreatActor['family'], string> = {
  aitm: 'DNS-based AiTM',
  'banking-trojan': 'Banking trojan',
  apt: 'APT · long-dwell',
  'commodity-malware': 'Commodity malware',
};

export function ThreatActorCard({ actor, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-fast hover:bg-surface2 ${
        selected
          ? 'bg-surface2 border-accent/50 ring-1 ring-accent/30'
          : 'bg-surface/60 border-white/5'
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-danger anim-pulse-dot" />
          <span className="text-body font-medium text-text1">{actor.name}</span>
        </div>
        <span className="text-[10px] font-mono text-text3">{actor.campaignCount} campaigns</span>
      </div>
      <div className="text-[11px] text-text2 mb-2">{FAMILY_LABEL[actor.family]}</div>
      <div className="text-[10px] text-text3 leading-tight mb-2 line-clamp-2">
        Tracked by {actor.tigSource}.
      </div>
      <div className="flex items-center gap-3 text-[10px] text-text3">
        <div className="flex items-center gap-1">
          <IconActivity size={11} />
          <span>{actor.mitreTactics.length} tactics</span>
        </div>
        <div className="flex items-center gap-1">
          <IconClock size={11} />
          <span>{formatRelativeTime(actor.lastObserved)}</span>
        </div>
      </div>
    </button>
  );
}
