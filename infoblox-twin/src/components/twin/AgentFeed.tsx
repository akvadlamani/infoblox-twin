import { useEffect, useState } from 'react';
import { IconArrowRight, IconRobot, IconSparkles } from '@tabler/icons-react';
import { twinClient } from '@/lib/data-clients/factory';
import { iconForAgent } from '@/lib/agent/agent-icons';
import { useAppStore } from '@/lib/state/store';
import type { Agent, AgentActivity, AgentId } from '@/lib/types/agent.types';
import { formatRelativeTime } from '@/lib/scene/colors';

export function AgentFeed() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const setView = useAppStore((s) => s.setView);
  const username = useAppStore((s) => s.username);

  useEffect(() => {
    twinClient.listAgents().then(setAgents);
    twinClient.listAgentActivities({ limit: 8 }).then(setActivities);
  }, []);

  const agentById = new Map(agents.map((a) => [a.id, a]));
  const pending = activities.filter((a) => a.requiresHuman && !a.humanApproved).length;

  return (
    <div className="absolute top-[110px] left-5 z-20 w-[380px] max-h-[calc(100vh-160px)] overflow-y-auto pr-1 scrollbar-hide">
      <div className="rounded-xl bg-surface/85 border border-white/8 backdrop-blur-md overflow-hidden">
        {/* Header — Brief writes this */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <IconSparkles size={11} className="text-accent2" />
            <span className="eyebrow">Brief · overnight digest</span>
          </div>
          <div className="text-h2 font-medium text-text1 mb-1">
            Good morning, {username || 'admin'}.
          </div>
          <p className="text-[12px] text-text2 leading-snug">
            Your nine agents handled {sum(agents, 'tasksToday')} tasks overnight.{' '}
            {pending > 0 ? (
              <>
                <span className="text-warning font-medium">{pending}</span> need a decision today.
              </>
            ) : (
              <>Nothing waiting on you.</>
            )}
          </p>
        </div>

        {/* Activity feed */}
        <div className="border-t border-white/5">
          {activities.map((a, i) => {
            const agent = agentById.get(a.agentId);
            if (!agent) return null;
            return (
              <FeedItem
                key={a.id}
                agent={agent}
                activity={a}
                isLast={i === activities.length - 1}
                onJump={(v) => setView(v as any)}
              />
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-white/5">
          <button
            onClick={() => setView('agents')}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-accent/10 hover:bg-accent/20 border border-accent/30 text-[12px] text-accent2 font-medium transition-colors duration-fast group"
          >
            <span className="flex items-center gap-1.5">
              <IconRobot size={13} />
              Open the agent console
            </span>
            <IconArrowRight
              size={13}
              className="group-hover:translate-x-0.5 transition-transform duration-fast"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function sum(agents: Agent[], k: 'tasksToday' | 'pendingProposals'): string {
  const n = agents.reduce((acc, a) => acc + a[k], 0);
  return n.toLocaleString();
}

function FeedItem({
  agent,
  activity,
  isLast,
  onJump,
}: {
  agent: Agent;
  activity: AgentActivity;
  isLast: boolean;
  onJump: (view: string) => void;
}) {
  const Icon = iconForAgent(agent.id);
  const pending = activity.requiresHuman && !activity.humanApproved;
  return (
    <button
      onClick={() => activity.linkView && onJump(activity.linkView)}
      className={`w-full text-left px-4 py-2.5 hover:bg-white/[0.03] transition-colors duration-fast ${
        !isLast ? 'border-b border-white/5' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{
            width: 22,
            height: 22,
            background: `${agent.color}1a`,
            border: `1px solid ${agent.color}55`,
            color: agent.color,
          }}
        >
          <Icon size={12} stroke={1.8} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-[11px] font-medium" style={{ color: agent.color }}>
              {agent.name}
            </span>
            <span className="text-[9px] text-text3 font-mono">
              {formatRelativeTime(activity.timestamp)}
            </span>
            {pending && (
              <span className="ml-auto text-[8px] font-mono uppercase tracking-wider px-1 rounded bg-warning/15 text-warning border border-warning/30">
                awaiting human
              </span>
            )}
          </div>
          <div className="text-[12px] text-text1 leading-snug">{activity.title}</div>
        </div>
      </div>
    </button>
  );
}
