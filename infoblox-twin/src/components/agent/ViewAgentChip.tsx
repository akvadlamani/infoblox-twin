import { useEffect, useState } from 'react';
import { twinClient } from '@/lib/data-clients/factory';
import { iconForAgent } from '@/lib/agent/agent-icons';
import type { Agent, AgentId } from '@/lib/types/agent.types';
import type { ViewName } from '@/lib/types/twin.types';
import { useAppStore } from '@/lib/state/store';

// Maps every view to the agent (or agents) that "lives" there.
const VIEW_AGENT: Record<ViewName, { id: AgentId; status: string }[]> = {
  overview: [
    { id: 'sentinel', status: 'watching' },
    { id: 'mystique', status: 'narrating' },
  ],
  crq: [{ id: 'mystique', status: 'computing ALE' }],
  'attack-path': [{ id: 'hunter', status: 'tracing paths' }],
  aev: [
    { id: 'hunter', status: 'replaying' },
    { id: 'takedown', status: 'monitoring' },
  ],
  'patch-risk': [{ id: 'pilot', status: 'triaging' }],
  compliance: [{ id: 'scope', status: 'classifying' }],
  'agent-iez': [
    { id: 'sandbox', status: 'verdict pending' },
    { id: 'action', status: 'awaiting approval' },
  ],
  agents: [],
  mythos: [{ id: 'mythos', status: 'red-teaming · continuous' }],
  settings: [],
};

export function ViewAgentChip() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const [agents, setAgents] = useState<Map<AgentId, Agent>>(new Map());

  useEffect(() => {
    twinClient.listAgents().then((list) => {
      setAgents(new Map(list.map((a) => [a.id, a])));
    });
  }, []);

  const entries = VIEW_AGENT[view] ?? [];
  if (entries.length === 0 || agents.size === 0) return null;

  return (
    <div className="absolute top-[58px] right-5 z-30 flex items-center gap-2 pointer-events-none">
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {entries.map((e) => {
          const agent = agents.get(e.id);
          if (!agent) return null;
          const Icon = iconForAgent(agent.id);
          return (
            <button
              key={e.id}
              onClick={() => setView('agents')}
              title={`${agent.name} · ${agent.role}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface/85 border border-white/8 backdrop-blur-md text-[10px] hover:bg-surface2 transition-colors duration-fast"
            >
              <span
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 16,
                  height: 16,
                  background: `${agent.color}22`,
                  border: `1px solid ${agent.color}55`,
                  color: agent.color,
                }}
              >
                <Icon size={9} stroke={1.9} />
              </span>
              <span className="font-medium" style={{ color: agent.color }}>
                {agent.name}
              </span>
              <span className="text-text3">· {e.status}</span>
              <span
                className="rounded-full inline-block ml-0.5"
                style={{ width: 4, height: 4, background: '#10b981' }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
