import { useEffect, useMemo, useRef, useState } from 'react';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { NetworkGraph } from '@/components/scene/NetworkGraph';
import { AttackTracer } from '@/components/scene/AttackTracer';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { ThreatActorCard } from '@/components/twin/ThreatActorCard';
import { KillChainTimeline } from '@/components/twin/KillChainTimeline';
import { twinClient } from '@/lib/data-clients/factory';
import type { Asset, Edge, ThreatActor, KillChainStep, TwinDisposition } from '@/lib/types/twin.types';
import { useAppStore } from '@/lib/state/store';
import { narrate } from '@/lib/llm/narrator-canned';
import { IconBolt, IconPlayerPause, IconPlayerPlay, IconRefresh } from '@tabler/icons-react';

const HOP_MS = 1800;

export function AevLabView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [actors, setActors] = useState<ThreatActor[]>([]);
  const [selectedActor, setSelectedActor] = useState<ThreatActor | null>(null);
  const [steps, setSteps] = useState<KillChainStep[]>([]);
  const [hopIndex, setHopIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const setNarrator = useAppStore((s) => s.setNarrator);
  const continuousAEV = useAppStore((s) => s.continuousAEV);
  const setContinuous = useAppStore((s) => s.setContinuousAEV);
  const scenariosRun = useAppStore((s) => s.scenariosRunToday);
  const incrementScenarios = useAppStore((s) => s.incrementScenarios);
  const timerRef = useRef<number | null>(null);
  const hopStartRef = useRef<number>(0);

  useEffect(() => {
    twinClient.listAssets().then(setAssets);
    twinClient.getEdges().then(setEdges);
    twinClient.listThreatActors().then((list) => {
      setActors(list);
    });
    setNarrator(narrate({ kind: 'view-change', view: 'aev' }));
  }, [setNarrator]);

  const assetMap = useMemo(() => {
    const m = new Map<string, Asset>();
    for (const a of assets) m.set(a.id, a);
    return m;
  }, [assets]);

  const edgeIdByPair = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of edges) m.set(`${e.source}>${e.target}`, e.id);
    return m;
  }, [edges]);

  const playFromStart = (actor: ThreatActor) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSelectedActor(actor);
    setSteps(actor.killChainTemplate);
    setHopIndex(-1);
    setPlaying(true);
    hopStartRef.current = performance.now();
    const advance = (i: number) => {
      if (i >= actor.killChainTemplate.length) {
        setPlaying(false);
        incrementScenarios();
        setNarrator(`${actor.name} kill chain complete. Twin recorded ${actor.killChainTemplate.length} hops.`);
        return;
      }
      setHopIndex(i);
      hopStartRef.current = performance.now();
      const step = actor.killChainTemplate[i];
      setNarrator(
        narrate({
          kind: 'attack-hop',
          technique: step.technique,
          disposition: step.disposition,
          control: step.control,
        })
      );
      timerRef.current = window.setTimeout(() => advance(i + 1), HOP_MS);
    };
    advance(0);
  };

  const stop = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Compute active attack edges and compromised nodes up to hopIndex
  const attackEdgeIds = useMemo(() => {
    if (!selectedActor || hopIndex < 0) return new Set<string>();
    const ids = new Set<string>();
    for (let i = 0; i <= hopIndex; i++) {
      const step = selectedActor.killChainTemplate[i];
      const key = `${step.sourceAsset}>${step.targetAsset}`;
      const eid = edgeIdByPair.get(key);
      if (eid) ids.add(eid);
    }
    return ids;
  }, [selectedActor, hopIndex, edgeIdByPair]);

  const compromisedAssets = useMemo(() => {
    if (!selectedActor || hopIndex < 0) return new Set<string>();
    const s = new Set<string>();
    for (let i = 0; i <= hopIndex; i++) {
      const step = selectedActor.killChainTemplate[i];
      if (step.disposition === 'observed') s.add(step.targetAsset);
    }
    return s;
  }, [selectedActor, hopIndex]);

  const activeHops = useMemo(() => {
    if (!selectedActor || hopIndex < 0 || !playing) return [];
    const step = selectedActor.killChainTemplate[hopIndex];
    return [
      {
        sourceId: step.sourceAsset,
        targetId: step.targetAsset,
        startedAt: hopStartRef.current,
        durationMs: HOP_MS,
        disposition: step.disposition,
        technique: step.technique,
        mitreId: step.mitreId,
        control: step.control,
      },
    ];
  }, [selectedActor, hopIndex, playing]);

  return (
    <div className="absolute inset-0 grid grid-cols-[260px_minmax(0,1fr)_320px] pt-[100px]">
      {/* Left rail */}
      <aside className="overflow-y-auto px-4 pb-6 border-r border-white/5 bg-surface/30 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3 mt-2">
          <div className="eyebrow">threat actors</div>
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[10px] text-text3">Continuous</span>
              <input
                type="checkbox"
                checked={continuousAEV}
                onChange={(e) => setContinuous(e.target.checked)}
                className="accent-accent"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text3 mb-3 px-2 py-1.5 rounded-md bg-surface/60 border border-white/5">
          <IconBolt size={11} className="text-accent2" />
          <span>
            <span className="font-mono text-text1">{scenariosRun}</span> scenarios run today
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {actors.map((a) => (
            <ThreatActorCard
              key={a.id}
              actor={a}
              selected={selectedActor?.id === a.id}
              onClick={() => playFromStart(a)}
            />
          ))}
        </div>
      </aside>

      {/* Center scene */}
      <div className="relative">
        <SceneRoot
          autoRotate={!selectedActor}
          cameraPosition={[22, 13, 22]}
          cameraTarget={[0, 1, 0]}
        >
          <NetworkGraph
            assets={assets}
            edges={edges}
            compromisedAssetIds={compromisedAssets}
            attackEdgeIds={attackEdgeIds}
          />
          <AttackTracer assets={assetMap} hops={activeHops} />
        </SceneRoot>
        {/* Active-hop banner over the scene */}
        {selectedActor && hopIndex >= 0 && playing && (
          <ActiveHopBanner
            step={selectedActor.killChainTemplate[hopIndex]}
            index={hopIndex}
            total={selectedActor.killChainTemplate.length}
          />
        )}
        {selectedActor && (
          <div className="absolute top-3 left-3 px-3 py-2 rounded-md bg-surface/85 border border-white/8 backdrop-blur-md flex items-center gap-3">
            <span className="text-body font-medium text-text1">{selectedActor.name}</span>
            <span className="text-[11px] text-text3">
              hop {Math.max(0, hopIndex + 1)} / {steps.length}
            </span>
            <div className="h-4 w-px bg-text3/30 mx-1" />
            <button
              onClick={() => (playing ? stop() : playFromStart(selectedActor))}
              className="flex items-center gap-1.5 text-[11px] text-text2 hover:text-text1"
            >
              {playing ? <IconPlayerPause size={12} /> : <IconPlayerPlay size={12} />}
              {playing ? 'pause' : 'replay'}
            </button>
            <button
              onClick={() => playFromStart(selectedActor)}
              className="flex items-center gap-1 text-[11px] text-text2 hover:text-text1"
              title="Restart"
            >
              <IconRefresh size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Right rail */}
      <aside className="overflow-y-auto px-4 pb-6 border-l border-white/5 bg-surface/30 backdrop-blur-md">
        {selectedActor ? (
          <div className="pt-2">
            <div className="eyebrow mb-2">actor detail</div>
            <div className="text-h2 font-medium text-text1 mb-1">{selectedActor.name}</div>
            <div className="text-[11px] text-text3 mb-3">{selectedActor.description}</div>
            <div className="mb-4">
              <div className="eyebrow mb-1">mitre tactics</div>
              <div className="flex flex-wrap gap-1">
                {selectedActor.mitreTactics.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-text2 border border-white/5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <div className="eyebrow mb-1">sample iocs</div>
              <div className="flex flex-col gap-0.5">
                {selectedActor.iocs?.map((i) => (
                  <span key={i} className="font-mono text-[11px] text-text2">
                    {i}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-2">kill chain</div>
              <KillChainTimeline steps={steps} activeIndex={hopIndex} />
            </div>
          </div>
        ) : (
          <div className="pt-10 text-center text-text3 text-small px-2">
            <div className="text-text2 text-body mb-1">Pick a threat actor</div>
            <div>Click any card on the left to replay their kill chain across your environment.</div>
          </div>
        )}
      </aside>

      <NarratorBar />
    </div>
  );
}

function NarratorBar() {
  const text = useAppStore((s) => s.narratorText);
  return <NarratorStrip text={text} />;
}

function ActiveHopBanner({
  step,
  index,
  total,
}: {
  step: KillChainStep;
  index: number;
  total: number;
}) {
  const disp = step.disposition as TwinDisposition;
  const dispStyle =
    disp === 'blocked'
      ? 'bg-success/15 border-success/40 text-success'
      : disp === 'contained'
      ? 'bg-warning/15 border-warning/40 text-warning'
      : disp === 'observed'
      ? 'bg-danger/15 border-danger/40 text-danger'
      : 'bg-white/5 border-white/10 text-text2';
  return (
    <div
      key={step.id}
      className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg bg-surface2/95 border border-white/8 backdrop-blur-md flex items-center gap-3 anim-stream-in shadow-lg max-w-[640px]"
      style={{ zIndex: 25 }}
    >
      <div className="flex flex-col items-center min-w-[44px]">
        <span className="text-[9px] uppercase tracking-wider text-text3">hop</span>
        <span className="font-mono text-body text-text1">
          {index + 1}/{total}
        </span>
      </div>
      <div className="h-7 w-px bg-white/10" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-0.5">
          {step.mitreId && (
            <span className="font-mono text-[9px] text-text3 tracking-wider">{step.mitreId}</span>
          )}
          <span className="text-[10px] font-mono text-text3">{step.timeLabel}</span>
        </div>
        <div className="text-body font-medium text-text1 leading-tight">{step.technique}</div>
      </div>
      <span
        className={`ml-2 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider border ${dispStyle}`}
      >
        {disp}
      </span>
    </div>
  );
}
