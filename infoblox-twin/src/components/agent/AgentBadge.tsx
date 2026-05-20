import { iconForAgent } from '@/lib/agent/agent-icons';
import type { Agent, AgentId, AutonomyLevel } from '@/lib/types/agent.types';

interface Props {
  agent: Agent;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  showRole?: boolean;
}

export function AgentBadge({ agent, size = 'sm', showName = true, showRole = false }: Props) {
  const Icon = iconForAgent(agent.id);
  const dim = { xs: 18, sm: 22, md: 28, lg: 36 }[size];
  const iconSz = { xs: 11, sm: 13, md: 15, lg: 19 }[size];
  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className="rounded-md flex items-center justify-center shrink-0"
        style={{
          width: dim,
          height: dim,
          background: `${agent.color}22`,
          border: `1px solid ${agent.color}55`,
          color: agent.color,
        }}
      >
        <Icon size={iconSz} stroke={1.7} />
      </span>
      {showName && (
        <div className="leading-tight">
          <div className="text-text1 font-medium text-[12px]">{agent.name}</div>
          {showRole && <div className="text-text3 text-[10px]">{agent.role}</div>}
        </div>
      )}
    </div>
  );
}

export function AutonomyChip({
  level,
  size = 'sm',
}: {
  level: AutonomyLevel;
  size?: 'xs' | 'sm';
}) {
  const map: Record<
    AutonomyLevel,
    { label: string; color: string; dot: string }
  > = {
    advisory: { label: 'Advisory', color: '#a0a0b0', dot: '#a0a0b0' },
    semi: { label: 'Semi', color: '#f59e0b', dot: '#f59e0b' },
    autonomous: { label: 'Autonomous', color: '#10b981', dot: '#10b981' },
  };
  const m = map[level];
  const cls = size === 'xs' ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono uppercase tracking-wider border ${cls}`}
      style={{
        color: m.color,
        background: `${m.color}18`,
        borderColor: `${m.color}40`,
      }}
    >
      <span
        className="rounded-full inline-block"
        style={{ width: 5, height: 5, background: m.dot }}
      />
      {m.label}
    </span>
  );
}

export interface AgentPresenceProps {
  agentId: AgentId;
  status?: string;
  className?: string;
}

// Small "Sentinel watching · 2 min ago" chip used on every view.
export function AgentPresenceChip({
  agent,
  status,
}: {
  agent: Agent;
  status?: string;
}) {
  const Icon = iconForAgent(agent.id);
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface/80 border border-white/8 backdrop-blur-md text-[11px]">
      <span
        className="rounded-full flex items-center justify-center"
        style={{
          width: 18,
          height: 18,
          background: `${agent.color}22`,
          border: `1px solid ${agent.color}55`,
          color: agent.color,
        }}
      >
        <Icon size={10} stroke={1.8} />
      </span>
      <span className="text-text1 font-medium">{agent.name}</span>
      {status && <span className="text-text3">· {status}</span>}
      <span
        className="rounded-full inline-block ml-1"
        style={{ width: 5, height: 5, background: '#10b981' }}
      />
    </div>
  );
}
