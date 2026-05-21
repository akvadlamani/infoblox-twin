import { useEffect, useMemo, useState } from 'react';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { AgentBadge, AutonomyChip } from '@/components/agent/AgentBadge';
import { twinClient } from '@/lib/data-clients/factory';
import { iconForAgent } from '@/lib/agent/agent-icons';
import type { Agent, AgentActivity, AgentId, AutonomyLevel } from '@/lib/types/agent.types';
import { useAppStore } from '@/lib/state/store';
import { formatRelativeTime } from '@/lib/scene/colors';
import {
  IconX,
  IconCircleCheck,
  IconCircleFilled,
  IconArrowRight,
  IconHandStop,
  IconRobot,
  IconActivity,
  IconShield,
  IconLock,
  IconExclamationCircle,
} from '@tabler/icons-react';

const AUTONOMY_ORDER: AutonomyLevel[] = ['advisory', 'semi', 'autonomous'];

export function AgentsView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<AgentId | null>(null);
  const [activitiesAll, setActivitiesAll] = useState<AgentActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const narratorText = useAppStore((s) => s.narratorText);
  const setNarrator = useAppStore((s) => s.setNarrator);

  useEffect(() => {
    twinClient.listAgents().then(setAgents);
    twinClient.listAgentActivities({ limit: 30 }).then(setActivitiesAll);
    setNarrator(
      'Nine agents are working your environment right now. Each has an identity, a scope, and an autonomy level you can raise or lower as trust builds.'
    );
  }, [setNarrator]);

  const sel = useMemo(
    () => (selected ? agents.find((a) => a.id === selected) ?? null : null),
    [selected, agents]
  );
  const selActivities = useMemo(
    () => (selected ? activitiesAll.filter((a) => a.agentId === selected) : []),
    [activitiesAll, selected]
  );

  async function changeAutonomy(id: AgentId, level: AutonomyLevel) {
    setError(null);
    try {
      const next = await twinClient.setAgentAutonomy(id, level);
      setAgents((arr) => arr.map((a) => (a.id === id ? next : a)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Summary stats
  const total = agents.length;
  const autonomous = agents.filter((a) => a.autonomy === 'autonomous').length;
  const semi = agents.filter((a) => a.autonomy === 'semi').length;
  const advisory = agents.filter((a) => a.autonomy === 'advisory').length;
  const proposals = agents.reduce((n, a) => n + a.pendingProposals, 0);
  const tasksToday = agents.reduce((n, a) => n + a.tasksToday, 0);

  return (
    <div className="absolute inset-0 pt-[100px] pb-36 overflow-y-auto">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="eyebrow">your agent team</div>
            <h1 className="text-h1 font-medium text-text1 flex items-center gap-2">
              <IconRobot size={16} className="text-text3" />
              {total} agents working
            </h1>
            <p className="text-small text-text2 max-w-[640px] mt-1 leading-relaxed">
              Each agent has an identity, a defined scope, and an autonomy level. They watch, propose,
              and within scope they act — and every decision is auditable and reversible.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 min-w-[480px]">
            <Stat label="tasks today" value={tasksToday.toLocaleString()} tone="primary" />
            <Stat label="autonomous" value={String(autonomous)} tone="success" />
            <Stat label="semi" value={String(semi)} tone="warning" />
            <Stat label="awaiting human" value={String(proposals)} tone="danger" />
          </div>
        </div>

        <div data-tour="agents-grid" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {agents.map((a) => {
            const Icon = iconForAgent(a.id);
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className="text-left p-4 rounded-xl bg-surface/60 hover:bg-surface2 border border-white/8 transition-all duration-fast group"
                style={{
                  boxShadow: `inset 4px 0 0 ${a.color}`,
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: `${a.color}1a`,
                        border: `1px solid ${a.color}55`,
                        color: a.color,
                      }}
                    >
                      <Icon size={18} stroke={1.7} />
                    </div>
                    <div className="leading-tight">
                      <div className="text-body font-medium text-text1">{a.name}</div>
                      <div className="text-[11px] text-text3">{a.role}</div>
                    </div>
                  </div>
                  <AutonomyChip level={a.autonomy} />
                </div>
                <div className="text-[11px] text-text2 leading-snug mb-3 line-clamp-2">
                  {a.description}
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-text3">
                  <div className="flex items-center gap-2">
                    <span title="model">
                      <span className="text-text2">{a.model.replace('claude-', '')}</span>
                    </span>
                    <span>·</span>
                    <span title="tasks today">
                      <span className="text-text1">{a.tasksToday.toLocaleString()}</span> today
                    </span>
                    {a.pendingProposals > 0 && (
                      <>
                        <span>·</span>
                        <span title="pending human approval" className="text-warning">
                          <span className="font-mono">{a.pendingProposals}</span> pending
                        </span>
                      </>
                    )}
                  </div>
                  <TrustMeter trust={a.trust} />
                </div>
                {a.recentHeadline && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2 text-[11px]">
                    <IconActivity size={11} className="text-text3 mt-0.5 shrink-0" />
                    <span className="text-text2 line-clamp-2">{a.recentHeadline}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-text3 group-hover:text-accent2 transition-colors duration-fast">
                  View profile <IconArrowRight size={11} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-surface/40 border border-white/5 text-[11px] text-text3 leading-snug">
          <span className="text-text2 font-medium">How trust works.</span> Every agent decision is
          either ratified by a human ("you approved this") or backtested ("the Sandbox replayed it
          against a fresh graph and got the same verdict"). Trust climbs with ratifications, drops on
          overrides. An agent must reach <span className="text-text2 font-mono">90%</span> trust
          before it can be promoted to <span className="text-success">Autonomous</span>.
        </div>
      </div>

      {sel && (
        <AgentDetail
          agent={sel}
          activities={selActivities}
          onClose={() => setSelected(null)}
          onChangeAutonomy={(lvl) => changeAutonomy(sel.id, lvl)}
          error={error}
        />
      )}

      <NarratorStrip text={narratorText} />
    </div>
  );
}

function AgentDetail({
  agent,
  activities,
  onClose,
  onChangeAutonomy,
  error,
}: {
  agent: Agent;
  activities: AgentActivity[];
  onClose: () => void;
  onChangeAutonomy: (level: AutonomyLevel) => void;
  error: string | null;
}) {
  const Icon = iconForAgent(agent.id);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-page/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative z-10 w-full max-w-[560px] h-full bg-surface border-l border-white/8 shadow-2xl flex flex-col">
        <header className="px-5 pt-4 pb-3 border-b border-white/8">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${agent.color}1a`,
                  border: `1px solid ${agent.color}55`,
                  color: agent.color,
                }}
              >
                <Icon size={22} stroke={1.6} />
              </div>
              <div className="leading-tight">
                <div className="text-h2 font-medium text-text1">{agent.name}</div>
                <div className="text-[12px] text-text2">{agent.role}</div>
                <div className="text-[10px] text-text3 mt-0.5 font-mono">
                  {agent.model}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-text3 hover:bg-white/5 hover:text-text1 transition-colors duration-fast"
              aria-label="Close"
            >
              <IconX size={14} />
            </button>
          </div>
          <p className="text-small text-text2 leading-relaxed">{agent.description}</p>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section>
            <div className="eyebrow mb-2">autonomy</div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-page/60 border border-white/8">
              {AUTONOMY_ORDER.map((lvl) => {
                const active = agent.autonomy === lvl;
                const idx = AUTONOMY_ORDER.indexOf(lvl);
                const maxIdx = AUTONOMY_ORDER.indexOf(agent.maxAutonomy);
                const disabled = idx > maxIdx;
                return (
                  <button
                    key={lvl}
                    disabled={disabled}
                    onClick={() => onChangeAutonomy(lvl)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-fast capitalize ${
                      active
                        ? 'bg-accent/20 text-text1 ring-1 ring-accent/40'
                        : disabled
                        ? 'text-text3 cursor-not-allowed opacity-50'
                        : 'text-text2 hover:text-text1 hover:bg-white/5'
                    }`}
                  >
                    {lvl === 'semi' ? 'Semi-autonomous' : lvl}
                  </button>
                );
              })}
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-danger">
                <IconExclamationCircle size={11} />
                {error}
              </div>
            )}
            <div className="mt-2 text-[10px] text-text3 leading-snug">
              {autonomyHint(agent)}
            </div>
          </section>

          <section>
            <div className="eyebrow mb-2">trust score</div>
            <TrustHistogram trust={agent.trust} />
          </section>

          <section>
            <div className="eyebrow mb-2">scope</div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <ScopeBlock
                icon={IconActivity}
                label="reads"
                items={agent.scope.reads}
              />
              <ScopeBlock
                icon={IconShield}
                label="writes"
                items={agent.scope.writes}
              />
              <ScopeBlock
                icon={IconLock}
                label="guards"
                items={agent.scope.guards}
              />
            </div>
            <div className="text-[10px] text-text3 italic">Voice: {agent.voice}</div>
          </section>

          <section>
            <div className="eyebrow mb-2">recent activity</div>
            <ActivityTimeline activities={activities} />
          </section>
        </div>

        <footer className="px-5 py-3 border-t border-white/8 flex items-center justify-between text-[11px]">
          <span className="text-text3 font-mono">
            primary surface · {agent.primaryView}
          </span>
          <span className="text-text3 flex items-center gap-1.5">
            <IconCircleFilled size={6} className="text-success" />
            {agent.status === 'active' ? 'Active' : 'Paused'}
          </span>
        </footer>
      </aside>
    </div>
  );
}

function autonomyHint(agent: Agent): string {
  if (agent.autonomy === 'advisory') {
    return `${agent.name} surfaces findings and recommendations. No write actions until you promote.`;
  }
  if (agent.autonomy === 'semi') {
    return `${agent.name} proposes actions; humans approve. Within scope, ${agent.name} can execute pre-approved patterns with audit.`;
  }
  return `${agent.name} acts on its own within scope. Every action is auditable, reversible for 30 days, and blocked by Sandbox if unsafe.`;
}

function ScopeBlock({
  icon: Icon,
  label,
  items,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  items: string[];
}) {
  return (
    <div className="p-2.5 rounded-md bg-page/40 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} className="text-text3" />
        <span className="eyebrow">{label}</span>
      </div>
      <ul className="text-[10px] text-text2 leading-snug flex flex-col gap-0.5">
        {items.map((i) => (
          <li key={i} className="font-mono">
            · {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityTimeline({ activities }: { activities: AgentActivity[] }) {
  if (activities.length === 0) {
    return <div className="text-[11px] text-text3 italic">No recent activity.</div>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {activities.slice(0, 12).map((a) => (
        <li
          key={a.id}
          className="flex items-start gap-2.5 p-2.5 rounded-md bg-page/40 border border-white/5"
        >
          <KindIcon kind={a.kind} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-text1 font-medium leading-tight">
              {a.title}
            </div>
            <div className="text-[11px] text-text2 leading-snug mt-0.5">{a.detail}</div>
            <div className="text-[10px] text-text3 mt-1 font-mono">
              {formatRelativeTime(a.timestamp)}
              {a.handedOffTo && <> · handed off to {a.handedOffTo}</>}
              {a.outcome && <> · {a.outcome}</>}
              {a.confidence !== undefined && (
                <> · confidence {Math.round(a.confidence * 100)}%</>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function KindIcon({ kind }: { kind: AgentActivity['kind'] }) {
  const map = {
    observe: { color: '#3b82f6', char: 'O' },
    classify: { color: '#7F77DD', char: 'C' },
    propose: { color: '#f59e0b', char: 'P' },
    execute: { color: '#10b981', char: 'E' },
    handoff: { color: '#a0a0b0', char: 'H' },
    rollback: { color: '#ef4444', char: 'R' },
    block: { color: '#ef4444', char: 'B' },
  } as const;
  const m = map[kind];
  return (
    <span
      className="rounded-md flex items-center justify-center shrink-0 mt-0.5 font-mono"
      style={{
        width: 18,
        height: 18,
        background: `${m.color}22`,
        border: `1px solid ${m.color}55`,
        color: m.color,
        fontSize: 10,
        fontWeight: 600,
      }}
      title={kind}
    >
      {m.char}
    </span>
  );
}

function TrustMeter({ trust }: { trust: number }) {
  const pct = Math.round(trust * 100);
  const color = pct >= 90 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1">
      <span className="text-text3">trust</span>
      <span className="font-mono" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function TrustHistogram({ trust }: { trust: number }) {
  const pct = Math.round(trust * 100);
  const color = pct >= 90 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <div className="font-mono text-h2 font-medium" style={{ color }}>
          {pct}%
        </div>
        <div className="text-[11px] text-text3">
          {pct >= 90 && 'High — eligible for autonomous promotion.'}
          {pct >= 80 && pct < 90 && 'Solid — keep accumulating ratifications.'}
          {pct < 80 && 'Learning — semi-autonomous max for now.'}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-1">
        <div
          className="h-full transition-all duration-base"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-text3 font-mono">
        <span>0%</span>
        <span className="text-warning">80%</span>
        <span className="text-success">90% · autonomous gate</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'primary' | 'danger';
}) {
  const color =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
      ? 'text-warning'
      : tone === 'danger'
      ? 'text-danger'
      : 'text-accent2';
  return (
    <div className="p-3 rounded-lg bg-surface/60 border border-white/5">
      <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
      <div className={`font-mono text-h1 font-medium ${color} leading-none`}>{value}</div>
    </div>
  );
}
