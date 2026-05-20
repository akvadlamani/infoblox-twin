import { IconRobot, IconClock } from '@tabler/icons-react';
import type { AgentAction } from '@/lib/types/twin.types';
import { formatRelativeTime } from '@/lib/scene/colors';

const VERDICT_STYLE: Record<AgentAction['simulation']['verdict'], string> = {
  safe: 'text-success border-success/40 bg-success/10',
  unsafe: 'text-danger border-danger/40 bg-danger/10',
  'safe-with-audit': 'text-warning border-warning/40 bg-warning/10',
};

const VERDICT_LABEL: Record<AgentAction['simulation']['verdict'], string> = {
  safe: 'safe',
  unsafe: 'unsafe',
  'safe-with-audit': 'safe · with audit',
};

interface Props {
  action: AgentAction;
  selected?: boolean;
  onClick?: () => void;
}

export function AgentActionCard({ action, selected, onClick }: Props) {
  const v = action.simulation.verdict;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-fast ${
        selected
          ? 'bg-surface2 border-accent/40 ring-1 ring-accent/30'
          : 'bg-surface/60 border-white/5 hover:bg-surface2'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-md bg-white/5 flex items-center justify-center shrink-0">
          <IconRobot size={14} className="text-accent2" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-small text-text2 font-medium">{action.agentName}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${VERDICT_STYLE[v]}`}
            >
              {VERDICT_LABEL[v]}
            </span>
          </div>
          <div className="text-body text-text1 leading-snug mb-1.5">{action.description}</div>
          <div className="flex items-center gap-3 text-[10px] text-text3">
            <span className="flex items-center gap-1">
              <IconClock size={10} />
              {formatRelativeTime(action.proposedAt)}
            </span>
            <span>confidence {Math.round(action.simulation.confidence * 100)}%</span>
          </div>
        </div>
      </div>
    </button>
  );
}
