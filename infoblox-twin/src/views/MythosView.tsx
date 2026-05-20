import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconFlame,
  IconBoltFilled,
  IconPlayerPlayFilled,
  IconPlayerPause,
  IconCircleCheck,
  IconRefresh,
  IconClock,
  IconShield,
  IconAlertTriangle,
  IconCircleFilled,
} from '@tabler/icons-react';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { NetworkGraph } from '@/components/scene/NetworkGraph';
import { AttackTracer, type ActiveHop } from '@/components/scene/AttackTracer';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { twinClient } from '@/lib/data-clients/factory';
import { iconForAsset } from '@/components/scene/assetIcon';
import { SEGMENT_COLORS, formatDollars, formatRelativeTime } from '@/lib/scene/colors';
import { useAppStore } from '@/lib/state/store';
import type { Asset, Edge } from '@/lib/types/twin.types';

// Infoblox brand green.
const INFOBLOX_GREEN = '#1aae9f';
const INFOBLOX_GREEN_DIM = '#1aae9f';
const HOP_MS = 1600;

interface SimHop {
  sourceId: string;
  targetId: string;
  technique: string;
  mitreId?: string;
  disposition: 'observed' | 'contained' | 'blocked';
  control: string;
}

interface Simulation {
  id: string;
  startAssetId: string;
  hops: SimHop[];
  // What we discovered through the sim
  compromised: string[];
  crownJewelsReached: string[];
  dollarImpact: number;
  downtimeDays: { min: number; max: number };
  controlsThatCatchIt: string[];
  realWorldEcho: string;
  startedAt: number;
}

interface FeedEntry {
  id: string;
  startAssetName: string;
  reachedName?: string;
  hops: number;
  dollar: number;
  timestamp: number;
}

// Curated targets to choose from — these are the assets worth simulating.
const CURATED_TARGETS: Record<string, { label: string; assetIds: string[] }> = {
  'crown jewels': {
    label: 'Crown jewels',
    assetIds: ['ast_fin-db', 'ast_ad-primary', 'ast_sap-prod', 'ast_rd-vault', 'ast_dc-core', 'ast_mfg-scada'],
  },
  workstations: {
    label: 'Exec workstations',
    assetIds: ['ast_cfo-ws', 'ast_ceo-ws', 'ast_finmob-1', 'ast_finmob-2'],
  },
  servers: {
    label: 'Servers',
    assetIds: ['ast_build-svr', 'ast_git-primary', 'ast_eng-jump', 'ast_file-svr'],
  },
  cloud: {
    label: 'Cloud workloads',
    assetIds: ['ast_wl-api', 'ast_wl-data', 'ast_saas-aws', 'ast_saas-365'],
  },
  ot: {
    label: 'OT / ICS',
    assetIds: ['ast_mfg-scada', 'ast_plc1', 'ast_plc2', 'ast_hmi-1'],
  },
};

export function MythosView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [category, setCategory] = useState<keyof typeof CURATED_TARGETS>('crown jewels');
  const [sim, setSim] = useState<Simulation | null>(null);
  const [hopIndex, setHopIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [continuous, setContinuous] = useState(true);
  const [feed, setFeed] = useState<FeedEntry[]>(seedFeed());
  const [simsToday, setSimsToday] = useState(312);
  const setNarrator = useAppStore((s) => s.setNarrator);
  const narratorText = useAppStore((s) => s.narratorText);
  const hopTimerRef = useRef<number | null>(null);
  const contTimerRef = useRef<number | null>(null);
  const hopStartRef = useRef<number>(0);

  useEffect(() => {
    twinClient.listAssets().then(setAssets);
    twinClient.getEdges().then(setEdges);
    setNarrator(
      'Mythos is your continuous red team. Every organization with this stack would face the vulnerabilities Mythos surfaces. Pick a starting point — or let Mythos pick for you.'
    );
  }, [setNarrator]);

  const assetById = useMemo(() => {
    const m = new Map<string, Asset>();
    for (const a of assets) m.set(a.id, a);
    return m;
  }, [assets]);

  // Auto-run mythos simulations every ~25s when continuous mode is on
  useEffect(() => {
    if (!continuous || assets.length === 0) {
      if (contTimerRef.current) {
        window.clearInterval(contTimerRef.current);
        contTimerRef.current = null;
      }
      return;
    }
    const tick = () => {
      // Pick a random asset from any curated list
      const allIds = Object.values(CURATED_TARGETS).flatMap((c) => c.assetIds);
      const id = allIds[Math.floor(Math.random() * allIds.length)];
      const a = assetById.get(id);
      if (!a) return;
      const path = computePath(a, assets, edges);
      const last = path.length > 1 ? assetById.get(path[path.length - 1].targetId) : undefined;
      const dollar = approxImpact(a);
      setFeed((arr) =>
        [
          {
            id: Math.random().toString(36).slice(2, 10),
            startAssetName: a.name,
            reachedName: last?.name,
            hops: path.length,
            dollar,
            timestamp: Date.now(),
          },
          ...arr,
        ].slice(0, 20)
      );
      setSimsToday((n) => n + 1);
    };
    contTimerRef.current = window.setInterval(tick, 18000);
    return () => {
      if (contTimerRef.current) window.clearInterval(contTimerRef.current);
    };
  }, [continuous, assets, edges, assetById]);

  function runSim(startAssetId: string) {
    if (hopTimerRef.current) window.clearTimeout(hopTimerRef.current);
    const start = assetById.get(startAssetId);
    if (!start) return;
    const path = computePath(start, assets, edges);
    const compromised = [startAssetId, ...path.map((h) => h.targetId)];
    const crownJewelsReached = compromised.filter(
      (id) => assetById.get(id)?.criticality === 5
    );
    const dollar = approxImpact(start);
    const downtime = approxDowntime(start);
    const realWorldEcho = pickRealWorld(start);
    const newSim: Simulation = {
      id: Math.random().toString(36).slice(2, 10),
      startAssetId,
      hops: path,
      compromised,
      crownJewelsReached,
      dollarImpact: dollar,
      downtimeDays: downtime,
      controlsThatCatchIt: ['Threat Defense (DNS layer)', 'SOC Insights (token replay)', 'Segment R&D from corporate AD'],
      realWorldEcho,
      startedAt: performance.now(),
    };
    setSim(newSim);
    setHopIndex(-1);
    setPlaying(true);
    setSimsToday((n) => n + 1);

    const advance = (i: number) => {
      if (i >= newSim.hops.length) {
        setPlaying(false);
        const last = assetById.get(newSim.hops[newSim.hops.length - 1]?.targetId ?? startAssetId);
        // Append to feed
        setFeed((arr) =>
          [
            {
              id: Math.random().toString(36).slice(2, 10),
              startAssetName: start.name,
              reachedName: last?.name,
              hops: newSim.hops.length,
              dollar: newSim.dollarImpact,
              timestamp: Date.now(),
            },
            ...arr,
          ].slice(0, 20)
        );
        return;
      }
      setHopIndex(i);
      hopStartRef.current = performance.now();
      hopTimerRef.current = window.setTimeout(() => advance(i + 1), HOP_MS);
    };
    setTimeout(() => advance(0), 320);
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (hopTimerRef.current) window.clearTimeout(hopTimerRef.current);
      if (contTimerRef.current) window.clearInterval(contTimerRef.current);
    };
  }, []);

  const compromisedSet = useMemo(() => {
    if (!sim || hopIndex < 0) return new Set<string>();
    const ids = new Set<string>([sim.startAssetId]);
    for (let i = 0; i <= hopIndex; i++) ids.add(sim.hops[i].targetId);
    return ids;
  }, [sim, hopIndex]);

  const activeHops: ActiveHop[] = useMemo(() => {
    if (!sim || hopIndex < 0 || !playing) return [];
    const step = sim.hops[hopIndex];
    return [
      {
        sourceId: step.sourceId,
        targetId: step.targetId,
        startedAt: hopStartRef.current,
        durationMs: HOP_MS,
        disposition: step.disposition,
        technique: step.technique,
        mitreId: step.mitreId,
        control: step.control,
      },
    ];
  }, [sim, hopIndex, playing]);

  return (
    <div
      className="absolute inset-0 pt-[100px] pb-24"
      style={{
        background:
          'radial-gradient(ellipse at top, rgba(26, 174, 159, 0.15), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(26, 174, 159, 0.08), transparent 60%), #0a0a0f',
      }}
    >
      {/* Hero banner */}
      <div className="px-5 pb-3" data-tour="mythos-hero">
        <div
          className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
          style={{
            background:
              'linear-gradient(90deg, rgba(26, 174, 159, 0.16), rgba(26, 174, 159, 0.04))',
            border: `1px solid ${INFOBLOX_GREEN}55`,
          }}
        >
          <div
            className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${INFOBLOX_GREEN}26`,
              border: `1px solid ${INFOBLOX_GREEN}88`,
              color: INFOBLOX_GREEN,
            }}
          >
            <IconFlame size={20} stroke={1.7} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-h2 font-medium text-text1">Mythos Simulator</span>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider"
                style={{
                  background: `${INFOBLOX_GREEN}26`,
                  color: INFOBLOX_GREEN,
                  border: `1px solid ${INFOBLOX_GREEN}55`,
                }}
              >
                continuous red team
              </span>
            </div>
            <p className="text-[12px] text-text2 leading-snug max-w-[680px]">
              Mythos asks one question: <em>what happens if this asset falls?</em> The vulnerabilities
              it surfaces would affect every organization running this stack — they just don't know
              yet.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-text3 uppercase tracking-wider">sims today</div>
              <div className="font-mono text-h2" style={{ color: INFOBLOX_GREEN }}>
                {simsToday}
              </div>
            </div>
            <button
              onClick={() => setContinuous((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors duration-fast"
              style={{
                background: continuous ? `${INFOBLOX_GREEN}1f` : 'rgba(255,255,255,0.04)',
                borderColor: continuous ? `${INFOBLOX_GREEN}80` : 'rgba(255,255,255,0.1)',
                color: continuous ? INFOBLOX_GREEN : '#a0a0b0',
              }}
            >
              <IconCircleFilled size={6} className={continuous ? 'anim-pulse-dot' : ''} />
              {continuous ? 'Continuous on' : 'Continuous off'}
            </button>
          </div>
        </div>
      </div>

      {/* Main grid: targets | scene | impact */}
      <div className="px-5 grid grid-cols-[260px_minmax(0,1fr)_320px] gap-3 h-[calc(100%-220px)]">
        {/* Left — pick a target */}
        <aside data-tour="mythos-target-list" className="rounded-lg bg-surface/40 border border-white/5 p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="eyebrow">pick a starting point</div>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {Object.entries(CURATED_TARGETS).map(([k, c]) => (
              <button
                key={k}
                onClick={() => setCategory(k as keyof typeof CURATED_TARGETS)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors duration-fast ${
                  category === k
                    ? 'text-page'
                    : 'bg-white/5 text-text2 hover:text-text1'
                }`}
                style={
                  category === k
                    ? { background: INFOBLOX_GREEN }
                    : undefined
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {CURATED_TARGETS[category].assetIds
              .map((id) => assetById.get(id))
              .filter((a): a is Asset => !!a)
              .map((a) => {
                const Icon = iconForAsset(a);
                const segColor = SEGMENT_COLORS[a.segment];
                const active = sim?.startAssetId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => runSim(a.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-md border text-left transition-colors duration-fast ${
                      active
                        ? 'bg-surface2'
                        : 'bg-surface/60 hover:bg-surface2 border-white/5'
                    }`}
                    style={{
                      borderColor: active ? INFOBLOX_GREEN : undefined,
                      boxShadow: active ? `0 0 0 1px ${INFOBLOX_GREEN}66` : undefined,
                    }}
                  >
                    <span
                      className="rounded-md flex items-center justify-center shrink-0"
                      style={{
                        width: 28,
                        height: 28,
                        background: `${segColor}1a`,
                        border: `1px solid ${segColor}55`,
                        color: segColor,
                      }}
                    >
                      <Icon size={13} stroke={1.7} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-text1 truncate">{a.name}</div>
                      <div className="text-[10px] text-text3 capitalize">
                        {a.segment} · crit {a.criticality}
                      </div>
                    </div>
                    <IconBoltFilled
                      size={11}
                      style={{ color: active ? INFOBLOX_GREEN : '#6f6f80' }}
                    />
                  </button>
                );
              })}
          </div>
          <div className="mt-3 p-2.5 rounded-md text-[10px] text-text3 leading-snug bg-page/40 border border-white/5">
            Click any asset to start a simulation. Mythos runs hop-by-hop and reports impact, who
            gets reached, and which controls would stop it.
          </div>
        </aside>

        {/* Center — 3D scene */}
        <div
          className="relative rounded-lg overflow-hidden border"
          style={{ borderColor: `${INFOBLOX_GREEN}44` }}
        >
          <SceneRoot autoRotate={!sim} cameraPosition={[22, 13, 22]} cameraTarget={[0, 1, 0]}>
            <NetworkGraph
              assets={assets}
              edges={edges}
              compromisedAssetIds={compromisedSet}
              selectedAssetId={sim?.startAssetId ?? null}
            />
            <AttackTracer assets={assetById} hops={activeHops} />
          </SceneRoot>
          {/* Hop banner */}
          {sim && hopIndex >= 0 && playing && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-2 rounded-lg backdrop-blur-md flex items-center gap-3 max-w-[560px] shadow-lg anim-stream-in"
              style={{
                background: `${INFOBLOX_GREEN}1a`,
                border: `1px solid ${INFOBLOX_GREEN}80`,
              }}
            >
              <div className="flex flex-col items-center min-w-[42px]">
                <span className="text-[9px] uppercase tracking-wider text-text3">hop</span>
                <span className="font-mono text-body text-text1">
                  {hopIndex + 1}/{sim.hops.length}
                </span>
              </div>
              <div className="h-7 w-px bg-white/15" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-0.5">
                  {sim.hops[hopIndex].mitreId && (
                    <span className="font-mono text-[9px] text-text3 tracking-wider">
                      {sim.hops[hopIndex].mitreId}
                    </span>
                  )}
                </div>
                <div className="text-body font-medium text-text1 leading-tight">
                  {sim.hops[hopIndex].technique}
                </div>
              </div>
              <span
                className="ml-2 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider border"
                style={{
                  color:
                    sim.hops[hopIndex].disposition === 'blocked'
                      ? '#10b981'
                      : sim.hops[hopIndex].disposition === 'contained'
                      ? '#f59e0b'
                      : '#ef4444',
                  background:
                    sim.hops[hopIndex].disposition === 'blocked'
                      ? 'rgba(16,185,129,0.15)'
                      : sim.hops[hopIndex].disposition === 'contained'
                      ? 'rgba(245,158,11,0.15)'
                      : 'rgba(239,68,68,0.15)',
                  borderColor:
                    sim.hops[hopIndex].disposition === 'blocked'
                      ? 'rgba(16,185,129,0.4)'
                      : sim.hops[hopIndex].disposition === 'contained'
                      ? 'rgba(245,158,11,0.4)'
                      : 'rgba(239,68,68,0.45)',
                }}
              >
                {sim.hops[hopIndex].disposition}
              </span>
            </div>
          )}
          {/* Control bar */}
          {sim && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface/85 border border-white/10 backdrop-blur-md text-[11px]">
              <span className="text-text2 font-medium">
                {assetById.get(sim.startAssetId)?.name}
              </span>
              <span className="text-text3">→</span>
              <span className="text-text2 font-mono">
                hop {Math.max(0, hopIndex + 1)} / {sim.hops.length}
              </span>
              <div className="h-3 w-px bg-white/15 mx-1" />
              <button
                onClick={() => (playing ? setPlaying(false) : runSim(sim.startAssetId))}
                className="flex items-center gap-1 text-text2 hover:text-text1"
              >
                {playing ? (
                  <>
                    <IconPlayerPause size={11} /> pause
                  </>
                ) : (
                  <>
                    <IconRefresh size={11} /> replay
                  </>
                )}
              </button>
            </div>
          )}
          {!sim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="px-4 py-3 rounded-lg backdrop-blur-md text-center max-w-[420px]"
                style={{
                  background: `${INFOBLOX_GREEN}10`,
                  border: `1px dashed ${INFOBLOX_GREEN}88`,
                }}
              >
                <IconBoltFilled
                  size={20}
                  className="mx-auto mb-1.5"
                  style={{ color: INFOBLOX_GREEN }}
                />
                <div className="text-body text-text1 font-medium mb-0.5">
                  Pick a starting point on the left
                </div>
                <div className="text-[11px] text-text3 leading-snug">
                  Or watch the feed below — Mythos is already running.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — impact report */}
        <aside data-tour="mythos-impact" className="rounded-lg bg-surface/60 border border-white/8 p-4 overflow-y-auto">
          {sim ? (
            <ImpactReport sim={sim} assetById={assetById} />
          ) : (
            <div className="text-text3 text-[12px] leading-snug">
              <div className="eyebrow mb-2">impact report</div>
              <p>
                Once a simulation runs, this panel will show you who gets compromised, how much it
                costs, downtime, compliance impact, and which Infoblox controls would stop it.
              </p>
              <div className="mt-3 p-2.5 rounded-md bg-page/40 border border-white/5">
                <div className="text-[10px] uppercase tracking-wider text-text3 mb-1">
                  why this matters
                </div>
                <p className="text-[11px]">
                  The compromise paths Mythos walks are real. Every organization with similar
                  topology has these paths — most don't know which ones exist or what they cost
                  until after the breach.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom — Mythos feed */}
      <div className="absolute bottom-16 left-5 right-5">
        <div
          className="rounded-lg p-3 backdrop-blur-md"
          style={{
            background: 'rgba(26, 174, 159, 0.06)',
            border: `1px solid ${INFOBLOX_GREEN}40`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <IconFlame size={12} style={{ color: INFOBLOX_GREEN }} />
            <span className="text-[11px] font-medium" style={{ color: INFOBLOX_GREEN }}>
              Mythos feed
            </span>
            <span className="text-[10px] text-text3">
              {continuous ? 'auto-picking high-value targets every ~18s' : 'paused'}
            </span>
            <span className="ml-auto text-[10px] font-mono text-text3">
              {feed.length} recent
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {feed.slice(0, 8).map((f) => (
              <div
                key={f.id}
                className="shrink-0 w-[260px] p-2.5 rounded-md bg-page/60 border border-white/8"
              >
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[9px] font-mono text-text3 uppercase tracking-wider">
                    Sim
                  </span>
                  <span className="text-[9px] font-mono text-text3">
                    {formatRelativeTime(new Date(f.timestamp).toISOString())}
                  </span>
                  <span
                    className="ml-auto text-[9px] font-mono"
                    style={{ color: INFOBLOX_GREEN }}
                  >
                    {f.hops} hops
                  </span>
                </div>
                <div className="text-[11px] text-text1 leading-snug">
                  <span className="font-medium">{f.startAssetName}</span>
                  {f.reachedName && (
                    <>
                      {' '}
                      <span className="text-text3">→</span>{' '}
                      <span className="font-medium">{f.reachedName}</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] mt-0.5 font-mono" style={{ color: INFOBLOX_GREEN }}>
                  {formatDollars(f.dollar)} at risk
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NarratorStrip text={narratorText} />
    </div>
  );
}

function ImpactReport({
  sim,
  assetById,
}: {
  sim: Simulation;
  assetById: Map<string, Asset>;
}) {
  const start = assetById.get(sim.startAssetId);
  const cjReached = sim.crownJewelsReached
    .map((id) => assetById.get(id)?.name)
    .filter(Boolean) as string[];
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="eyebrow mb-1">if this falls</div>
        <div className="text-h2 font-medium text-text1">{start?.name}</div>
        <div className="text-[11px] text-text3 leading-snug mt-0.5">
          The starting point of the simulation. Mythos walks the most likely path an attacker would
          take.
        </div>
      </div>

      {/* Impact stats */}
      <div className="grid grid-cols-2 gap-2">
        <ImpactStat label="compromised" value={String(sim.compromised.length)} accent="danger" />
        <ImpactStat
          label="crown jewels"
          value={String(sim.crownJewelsReached.length)}
          accent="danger"
        />
        <ImpactStat label="$ at risk" value={formatDollars(sim.dollarImpact)} accent="warning" />
        <ImpactStat
          label="downtime"
          value={`${sim.downtimeDays.min}–${sim.downtimeDays.max}d`}
          accent="warning"
        />
      </div>

      {cjReached.length > 0 && (
        <div>
          <div className="eyebrow mb-1.5">crown jewels reached</div>
          <ul className="flex flex-col gap-0.5">
            {cjReached.map((n) => (
              <li
                key={n}
                className="flex items-center gap-2 text-[11px] py-0.5 text-text1"
              >
                <IconAlertTriangle size={10} className="text-danger shrink-0" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="eyebrow mb-1.5 flex items-center gap-1.5">
          <IconShield size={11} style={{ color: INFOBLOX_GREEN }} />
          why Mythos would catch it
        </div>
        <ul className="flex flex-col gap-1">
          {sim.controlsThatCatchIt.map((c) => (
            <li
              key={c}
              className="flex items-start gap-2 text-[11px] text-text2 leading-snug"
            >
              <IconCircleCheck
                size={11}
                className="mt-0.5 shrink-0"
                style={{ color: INFOBLOX_GREEN }}
              />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-2.5 rounded-md bg-page/40 border border-white/5">
        <div className="eyebrow mb-1">where it has already happened</div>
        <p className="text-[11px] text-text2 leading-snug">{sim.realWorldEcho}</p>
      </div>

      <div className="p-2.5 rounded-md text-[10px] text-text3 leading-snug" style={{ background: `${INFOBLOX_GREEN}10`, border: `1px solid ${INFOBLOX_GREEN}35` }}>
        Mythos simulations run only against the sandbox Twin. No production touches. The
        vulnerabilities surfaced are not specific to your environment — they apply to every
        organization with this stack.
      </div>
    </div>
  );
}

function ImpactStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'danger' | 'warning' | 'success' | 'primary';
}) {
  const color =
    accent === 'danger'
      ? '#ef4444'
      : accent === 'warning'
      ? '#f59e0b'
      : accent === 'success'
      ? '#10b981'
      : '#3b82f6';
  return (
    <div className="p-2 rounded-md bg-page/40 border border-white/5">
      <div className="text-[9px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
      <div className="font-mono text-[15px] font-medium leading-tight" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

// ---------- helpers ----------

function computePath(start: Asset, assets: Asset[], edges: Edge[]): SimHop[] {
  // BFS but prefer high-criticality targets. We'll just walk outward and prefer
  // edges whose target has higher criticality.
  const adj = new Map<string, Edge[]>();
  for (const e of edges) {
    (adj.get(e.source) ?? adj.set(e.source, []).get(e.source))!.push(e);
  }
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const visited = new Set<string>([start.id]);
  const hops: SimHop[] = [];
  let current = start.id;
  for (let h = 0; h < 5; h++) {
    const options = (adj.get(current) ?? []).filter((e) => !visited.has(e.target));
    if (options.length === 0) break;
    options.sort((a, b) => {
      const at = assetMap.get(a.target);
      const bt = assetMap.get(b.target);
      return (bt?.criticality ?? 0) - (at?.criticality ?? 0);
    });
    const chosen = options[0];
    visited.add(chosen.target);
    hops.push({
      sourceId: chosen.source,
      targetId: chosen.target,
      technique: pickTechnique(h, chosen.type),
      mitreId: pickMitreId(h),
      disposition: h < 2 ? 'observed' : h < 3 ? 'contained' : 'blocked',
      control: h < 2 ? 'none' : h < 3 ? 'soc-insights' : 'td',
    });
    current = chosen.target;
    if (assetMap.get(current)?.criticality === 5) break;
  }
  return hops;
}

function pickTechnique(hop: number, edgeType: string): string {
  if (hop === 0)
    return edgeType === 'dns' ? 'Phishing: Spearphishing Link' : 'Valid Accounts';
  if (hop === 1) return 'Use Alternate Authentication Material';
  if (hop === 2) return 'Lateral Movement: Remote Services';
  if (hop === 3) return 'Account Discovery: Domain Account';
  return 'Data from Information Repositories';
}

function pickMitreId(hop: number): string {
  return ['T1566.002', 'T1550.001', 'T1021', 'T1087.002', 'T1213'][hop] ?? 'T1486';
}

function approxImpact(start: Asset): number {
  const base = start.criticality * start.criticality * 220000;
  return Math.round(base * (1 + Math.random() * 0.3));
}

function approxDowntime(start: Asset): { min: number; max: number } {
  if (start.segment === 'ot') return { min: 4, max: 7 };
  if (start.criticality === 5) return { min: 3, max: 6 };
  if (start.criticality >= 4) return { min: 1, max: 4 };
  return { min: 0, max: 2 };
}

function pickRealWorld(start: Asset): string {
  if (start.segment === 'ot')
    return 'Pharma manufacturer (2024) — SCADA compromise via engineering jump host. 9-day plant outage, $48M loss, product contamination concern.';
  if (start.segment === 'finance' && start.criticality === 5)
    return 'MGM Resorts (Sept 2023) — Scattered Spider used IT helpdesk pretexting to reach finance systems. 36-hour partial outage, ≈ $100M loss.';
  if (start.id === 'ast_ad-primary' || start.id === 'ast_ad-secondary')
    return 'Microsoft (Jan 2024) — APT29 / Midnight Blizzard compromised legacy OAuth app, pivoted to executive M365 mailboxes. Multi-month dwell, board-level disclosure.';
  if (start.id.includes('rd-vault') || start.id.includes('git'))
    return 'Okta (Oct 2023) — support system compromise allowed lateral access to customer Vault and HAR files. Multi-customer disclosure.';
  if (start.id.includes('backup'))
    return 'Change Healthcare (Feb 2024) — ALPHV/BlackCat encrypted infrastructure including backup catalogs. $872M direct cost reported.';
  return 'Capital One (2019) — single misconfigured cloud workload led to 100M customer record exfil. $190M+ settlement.';
}

function seedFeed(): FeedEntry[] {
  const now = Date.now();
  return [
    {
      id: 's1',
      startAssetName: 'EXEC-WS-CFO',
      reachedName: 'FIN-DB',
      hops: 3,
      dollar: 4_200_000,
      timestamp: now - 23 * 1000,
    },
    {
      id: 's2',
      startAssetName: 'BUILD-SVR',
      reachedName: 'R&D-VAULT',
      hops: 2,
      dollar: 5_800_000,
      timestamp: now - 51 * 1000,
    },
    {
      id: 's3',
      startAssetName: 'MFG-SCADA',
      reachedName: 'PLC line 1',
      hops: 2,
      dollar: 7_400_000,
      timestamp: now - 92 * 1000,
    },
    {
      id: 's4',
      startAssetName: 'cfo-iphone',
      reachedName: 'Microsoft 365',
      hops: 2,
      dollar: 2_100_000,
      timestamp: now - 180 * 1000,
    },
    {
      id: 's5',
      startAssetName: 'AD-PRIMARY',
      reachedName: 'SAP-PROD',
      hops: 2,
      dollar: 3_900_000,
      timestamp: now - 240 * 1000,
    },
  ];
}
