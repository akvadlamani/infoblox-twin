import { useEffect, useMemo, useState } from 'react';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { NetworkGraph } from '@/components/scene/NetworkGraph';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { AgentActionCard } from '@/components/twin/AgentActionCard';
import { twinClient } from '@/lib/data-clients/factory';
import type { Asset, Edge, AgentAction } from '@/lib/types/twin.types';
import type { Agent } from '@/lib/types/agent.types';
import { iconForAgent } from '@/lib/agent/agent-icons';
import { useAppStore } from '@/lib/state/store';
import { narrate } from '@/lib/llm/narrator-canned';
import {
  IconArrowNarrowRight,
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconUsers,
  IconRoute,
  IconActivity,
} from '@tabler/icons-react';

const VERDICT_INFO = {
  safe: { icon: IconCircleCheck, color: 'text-success', label: 'Safe to proceed' },
  unsafe: { icon: IconCircleX, color: 'text-danger', label: 'Unsafe — reject' },
  'safe-with-audit': {
    icon: IconAlertTriangle,
    color: 'text-warning',
    label: 'Safe — with audit',
  },
};

export function AgentIezView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [autoApprove, setAutoApprove] = useState(false);
  const setNarrator = useAppStore((s) => s.setNarrator);
  const narratorText = useAppStore((s) => s.narratorText);

  useEffect(() => {
    twinClient.listAssets().then(setAssets);
    twinClient.getEdges().then(setEdges);
    twinClient.listAgents().then(setAgents);
    twinClient.listPendingAgentActions().then((list) => {
      setActions(list);
      if (list[0]) setSelectedActionId(list[0].id);
    });
    setNarrator(narrate({ kind: 'view-change', view: 'agent-iez' }));
  }, [setNarrator]);

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const selectedAgent = useMemo(() => {
    const action = actions.find((a) => a.id === selectedActionId);
    return action?.agentId ? agentById.get(action.agentId) : undefined;
  }, [actions, selectedActionId, agentById]);

  const selected = useMemo(
    () => actions.find((a) => a.id === selectedActionId) ?? null,
    [actions, selectedActionId]
  );

  const affectedSet = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(selected.targetAssetIds);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setNarrator(
      narrate({
        kind: 'agent-action',
        agent: selected.agentName,
        verdict: selected.simulation.verdict,
        description: selected.description,
      })
    );
  }, [selected, setNarrator]);

  const handleResolve = async (decision: 'approve' | 'reject' | 'escalate') => {
    if (!selected) return;
    await twinClient.resolveAgentAction(selected.id, decision);
    twinClient.listPendingAgentActions().then(setActions);
  };

  const VInfo = selected ? VERDICT_INFO[selected.simulation.verdict] : null;

  return (
    <div className="absolute inset-0 pt-[100px] grid grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3 px-5 pb-36">
      {/* Top: split twin viz */}
      <div className="relative grid grid-cols-2 gap-3 min-h-0">
        <div className="relative rounded-lg overflow-hidden border border-white/5 bg-surface/30">
          <SceneRoot autoRotate={false} cameraPosition={[24, 14, 24]} cameraTarget={[0, 1, 0]}>
            <group>
              <NetworkGraph assets={assets} edges={edges} />
            </group>
          </SceneRoot>
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface2/90 border border-white/10 text-[11px] flex items-center gap-2 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-text3" />
            <span className="text-text2 font-medium">Production Twin</span>
            <span className="text-text3">·</span>
            <span className="text-text3 text-[10px]">read-only mirror</span>
          </div>
          <div className="absolute inset-0 bg-page/40 pointer-events-none" />
        </div>
        <div className="relative rounded-lg overflow-hidden border border-accent/25 bg-surface/30 ring-1 ring-accent/15">
          <SceneRoot autoRotate={false} cameraPosition={[24, 14, 24]} cameraTarget={[0, 1, 0]}>
            <NetworkGraph
              assets={assets}
              edges={edges}
              compromisedAssetIds={affectedSet}
              blastAssetIds={affectedSet}
              selectedAssetId={selected?.targetAssetIds[0] ?? null}
            />
          </SceneRoot>
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface2/90 border border-accent/40 text-[11px] flex items-center gap-2 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-accent2 anim-pulse-dot" />
            <span className="text-text1 font-medium">Sandbox Twin</span>
            <span className="text-text3">·</span>
            <span className="text-accent2 text-[10px]">simulating action</span>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-3 py-1.5 rounded-full bg-page/95 border border-white/15 text-[11px] text-text2 flex items-center gap-1.5 pointer-events-none shadow-lg">
          <IconArrowNarrowRight size={14} className="text-accent2" />
          <span>Approved actions propagate after Twin verdict</span>
        </div>
      </div>

      {/* Bottom: actions queue + detail */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 min-h-0">
        <div className="rounded-lg bg-surface/40 border border-white/5 p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="eyebrow">pending agent proposals ({actions.filter((a) => a.status === 'pending').length})</div>
            <span className="text-[10px] text-text3">sorted newest first</span>
          </div>
          <div className="flex flex-col gap-2">
            {actions.map((a) => (
              <AgentActionCard
                key={a.id}
                action={a}
                agent={a.agentId ? agentById.get(a.agentId) : undefined}
                selected={selectedActionId === a.id}
                onClick={() => setSelectedActionId(a.id)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-surface/40 border border-white/5 p-4 overflow-y-auto">
          {!selected || !VInfo ? (
            <div className="text-text3 text-small">Select an agent action to see Twin's verdict.</div>
          ) : (
            <div>
              {selectedAgent && (
                <div
                  className="mb-3 p-2.5 rounded-md flex items-center gap-2.5"
                  style={{
                    background: `${selectedAgent.color}10`,
                    border: `1px solid ${selectedAgent.color}40`,
                  }}
                >
                  <div
                    className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: `${selectedAgent.color}26`,
                      color: selectedAgent.color,
                      border: `1px solid ${selectedAgent.color}55`,
                    }}
                  >
                    {(() => {
                      const Icon = iconForAgent(selectedAgent.id);
                      return <Icon size={14} stroke={1.7} />;
                    })()}
                  </div>
                  <div className="leading-tight flex-1 min-w-0">
                    <div className="text-[11px] font-medium" style={{ color: selectedAgent.color }}>
                      {selectedAgent.name} proposed this
                    </div>
                    <div className="text-[10px] text-text3 truncate">{selectedAgent.role}</div>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 text-text3">
                    {selectedAgent.autonomy}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <VInfo.icon size={20} className={VInfo.color} />
                <div className="text-h2 font-medium text-text1">{VInfo.label}</div>
                <span className="ml-auto text-[10px] font-mono text-text3">
                  confidence {Math.round(selected.simulation.confidence * 100)}%
                </span>
              </div>
              <div className="text-small text-text2 mb-3 leading-snug">
                {selected.description}
              </div>
              {selected.rationale && (
                <div className="p-3 rounded-md bg-page/40 border border-white/5 mb-3">
                  <div className="eyebrow mb-1">why this proposal</div>
                  <div className="text-[12px] text-text2 leading-snug">{selected.rationale}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat
                  icon={IconRoute}
                  label="dependencies"
                  value={selected.simulation.dependenciesAffected}
                />
                <Stat icon={IconUsers} label="users" value={selected.simulation.usersAffected} />
                <Stat
                  icon={IconActivity}
                  label="rerouted"
                  value={selected.simulation.servicesRerouted}
                />
              </div>

              <div className="p-3 rounded-md bg-surface/60 border border-white/5 mb-3">
                <div className="eyebrow mb-1">twin rationale</div>
                <div className="text-[12px] text-text1 leading-snug">
                  {selected.simulation.rationale}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {selected.simulation.verdict === 'safe' && (
                  <button
                    onClick={() => handleResolve('approve')}
                    className="px-3 py-1.5 rounded-md bg-success/15 hover:bg-success/25 text-success border border-success/40 text-small font-medium"
                  >
                    Approve and propagate to production
                  </button>
                )}
                {selected.simulation.verdict === 'unsafe' && (
                  <button
                    onClick={() => handleResolve('escalate')}
                    className="px-3 py-1.5 rounded-md bg-danger/15 hover:bg-danger/25 text-danger border border-danger/40 text-small font-medium"
                  >
                    Escalate to human
                  </button>
                )}
                {selected.simulation.verdict === 'safe-with-audit' && (
                  <>
                    <button
                      onClick={() => handleResolve('approve')}
                      className="px-3 py-1.5 rounded-md bg-warning/15 hover:bg-warning/25 text-warning border border-warning/40 text-small font-medium"
                    >
                      Approve and audit
                    </button>
                    <button
                      onClick={() => handleResolve('escalate')}
                      className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-text1 border border-white/10 text-small"
                    >
                      Escalate to human
                    </button>
                    <label className="flex items-center gap-1.5 text-[11px] text-text2 ml-2">
                      <input
                        type="checkbox"
                        checked={autoApprove}
                        onChange={(e) => setAutoApprove(e.target.checked)}
                        className="accent-accent"
                      />
                      Auto-approve future matches
                    </label>
                  </>
                )}
                <span className="ml-auto text-[10px] font-mono text-text3">
                  status: {selected.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <NarratorStrip text={narratorText} />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="p-2 rounded-md bg-surface/60 border border-white/5">
      <div className="flex items-center gap-1.5 text-text3 text-[10px] uppercase tracking-wider mb-1">
        <Icon size={11} />
        {label}
      </div>
      <div className="font-mono text-h2 text-text1">{value.toLocaleString()}</div>
    </div>
  );
}
