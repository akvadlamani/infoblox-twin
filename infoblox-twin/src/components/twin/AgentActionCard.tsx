import { IconClock } from '@tabler/icons-react';
import type { AgentAction } from '@/lib/types/twin.types';
import type { Agent } from '@/lib/types/agent.types';
import { formatRelativeTime } from '@/lib/scene/colors';
import { iconForAgent } from '@/lib/agent/agent-icons';

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
  agent?: Agent;
  selected?: boolean;
  onClick?: () => void;
}

export function AgentActionCard({ action, agent, selected, onClick }: Props) {
  const v = action.simulation.verdict;
  const Icon = agent ? iconForAgent(agent.id) : null;
  const accent = agent?.color ?? '#3b82f6';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-fast ${
        selected
          ? 'bg-surface2 border-accent/40 ring-1 ring-accent/30'
          : 'bg-surface/60 border-white/5 hover:bg-surface2'
      }`}
      style={selected ? undefined : { boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: `${accent}1a`,
            border: `1px solid ${accent}55`,
            color: accent,
          }}
        >
          {Icon ? <Icon size={15} stroke={1.7} /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[12px] text-text1 font-medium" style={{ color: accent }}>
              {agent?.name ?? action.agentName}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${VERDICT_STYLE[v]}`}
            >
              {VERDICT_LABEL[v]}
            </span>
          </div>
          <div className="text-[12.5px] text-text1 leading-snug mb-1.5">{action.description}</div>
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
