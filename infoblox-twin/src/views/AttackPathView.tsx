import { useEffect, useMemo, useState } from 'react';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { NetworkGraph } from '@/components/scene/NetworkGraph';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { twinClient } from '@/lib/data-clients/factory';
import type { Asset, Edge, Mitigation } from '@/lib/types/twin.types';
import { useAppStore } from '@/lib/state/store';
import { narrate } from '@/lib/llm/narrator-canned';
import { formatDollars, SEGMENT_COLORS } from '@/lib/scene/colors';
import {
  IconChevronRight,
  IconShieldCheck,
  IconCalculator,
  IconArrowRight,
  IconCircleFilled,
} from '@tabler/icons-react';

export function AttackPathView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mitigations, setMitigations] = useState<Mitigation[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [inboundPaths, setInboundPaths] = useState<string[][]>([]);
  const [blast, setBlast] = useState<string[]>([]);
  const [hoveredMitigation, setHoveredMitigation] = useState<string | null>(null);
  const [showCalc, setShowCalc] = useState(false);
  const setNarrator = useAppStore((s) => s.setNarrator);
  const narratorText = useAppStore((s) => s.narratorText);

  useEffect(() => {
    twinClient.listAssets().then(setAssets);
    twinClient.getEdges().then(setEdges);
    twinClient.listMitigations().then(setMitigations);
    setNarrator(narrate({ kind: 'view-change', view: 'attack-path' }));
  }, [setNarrator]);

  useEffect(() => {
    if (!selectedAssetId) {
      setInboundPaths([]);
      setBlast([]);
      return;
    }
    twinClient.computeInboundPaths(selectedAssetId).then(setInboundPaths);
    twinClient.computeBlastRadius(selectedAssetId, 3).then(setBlast);
  }, [selectedAssetId]);

  const selectedAsset = useMemo(
    () => (selectedAssetId ? assets.find((a) => a.id === selectedAssetId) ?? null : null),
    [selectedAssetId, assets]
  );

  useEffect(() => {
    if (selectedAsset) {
      setNarrator(
        narrate({
          kind: 'asset-selected',
          assetName: selectedAsset.name,
          segment: selectedAsset.segment,
          criticality: selectedAsset.criticality,
        })
      );
    }
  }, [selectedAsset, setNarrator]);

  const pathAssetIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of inboundPaths) for (const id of p) s.add(id);
    return s;
  }, [inboundPaths]);

  const pathEdgeIds = useMemo(() => {
    const s = new Set<string>();
    const pairMap = new Map<string, string>();
    for (const e of edges) pairMap.set(`${e.source}>${e.target}`, e.id);
    for (const p of inboundPaths) {
      for (let i = 0; i < p.length - 1; i++) {
        const eid = pairMap.get(`${p[i]}>${p[i + 1]}`);
        if (eid) s.add(eid);
      }
    }
    return s;
  }, [inboundPaths, edges]);

  const blastSet = useMemo(() => new Set(blast), [blast]);

  // Dollar exposure
  const exposure = useMemo(() => {
    if (!selectedAsset) return 0;
    // crude calc: criticality squared * 200k * (1 + pathCount * 0.08)
    const base = selectedAsset.criticality * selectedAsset.criticality * 220_000;
    return Math.round(base * (1 + inboundPaths.length * 0.08));
  }, [selectedAsset, inboundPaths]);

  // Top inbound paths (with computed exploitability)
  const topPaths = useMemo(() => {
    return inboundPaths.slice(0, 3).map((p, i) => ({
      path: p,
      score: Math.round(72 - i * 9 - p.length * 4),
    }));
  }, [inboundPaths]);

  const blastAssets = useMemo(() => {
    return assets
      .filter((a) => blast.includes(a.id))
      .sort((a, b) => b.criticality - a.criticality)
      .slice(0, 5);
  }, [assets, blast]);

  // Recommend top 3 mitigations
  const recommendedMitigations = useMemo(() => {
    if (!selectedAsset) return [];
    return mitigations
      .slice()
      .sort((a, b) => b.expectedRiskReduction - a.expectedRiskReduction)
      .slice(0, 3);
  }, [selectedAsset, mitigations]);

  const handleAssetClick = (id: string) => setSelectedAssetId(id);

  return (
    <div className="absolute inset-0 grid grid-cols-[60%_40%] pt-[100px]">
      <div className="relative border-r border-white/5">
        <SceneRoot
          autoRotate={!selectedAssetId}
          cameraPosition={[20, 12, 20]}
          cameraTarget={[0, 1, 0]}
          onPointerMissed={() => setSelectedAssetId(null)}
        >
          <NetworkGraph
            assets={assets}
            edges={edges}
            selectedAssetId={selectedAssetId}
            pathAssetIds={pathAssetIds}
            pathEdgeIds={pathEdgeIds}
            blastAssetIds={blastSet}
            onAssetClick={handleAssetClick}
          />
        </SceneRoot>
        {!selectedAssetId && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-surface/85 border border-white/8 backdrop-blur-md text-small text-text2 flex items-center gap-2 anim-fade-in">
            <IconArrowRight size={12} className="text-accent2" />
            <span>Click any asset to explore inbound paths and blast radius</span>
          </div>
        )}
      </div>

      <aside className="overflow-y-auto px-5 pb-6 bg-surface/30 backdrop-blur-md">
        {!selectedAsset ? (
          <div className="pt-6">
            <div className="eyebrow mb-1">no asset selected</div>
            <div className="text-h1 text-text1 mb-2">Click any asset to explore</div>
            <div className="text-small text-text2 mb-6">
              Pick a crown jewel (pulsing red) to see its inbound paths and blast radius. We recommend{' '}
              <button
                onClick={() => setSelectedAssetId('ast_fin-db')}
                className="text-accent2 hover:underline font-medium"
              >
                FIN-DB
              </button>{' '}
              — your highest-exposure asset.
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {['ast_fin-db', 'ast_rd-vault', 'ast_ad-primary', 'ast_mfg-scada'].map((id) => {
                const a = assets.find((x) => x.id === id);
                if (!a) return null;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedAssetId(id)}
                    className="p-3 rounded-lg bg-surface/60 border border-white/5 hover:bg-surface2 transition-colors duration-fast text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: SEGMENT_COLORS[a.segment] }}
                      />
                      <span className="text-small font-medium text-text1">{a.name}</span>
                    </div>
                    <div className="text-[11px] text-text3 capitalize">{a.segment}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: SEGMENT_COLORS[selectedAsset.segment] }}
              />
              <div className="eyebrow capitalize">{selectedAsset.segment} segment</div>
              <span className="ml-auto text-[10px] font-mono text-text3">
                crit {selectedAsset.criticality} / 5
              </span>
            </div>
            <div className="text-h1 text-text1 mb-0.5 font-medium">{selectedAsset.name}</div>
            <div className="text-small text-text2 mb-1">
              {selectedAsset.vendor} {selectedAsset.model}
            </div>
            <div className="font-mono text-[11px] text-text3 mb-4">
              {selectedAsset.os} {selectedAsset.osVersion} · {selectedAsset.ipAddresses.join(', ')}
            </div>

            {/* Exposure */}
            <div className="p-3 rounded-lg bg-surface/60 border border-white/5 mb-4">
              <div className="flex items-baseline justify-between mb-1">
                <div className="eyebrow">expected loss</div>
                <button
                  onClick={() => setShowCalc((s) => !s)}
                  className="text-[10px] text-accent2 hover:underline flex items-center gap-1"
                >
                  <IconCalculator size={10} />
                  How is this calculated?
                </button>
              </div>
              <div className="font-mono text-hero font-medium text-text1 leading-none mb-1">
                {formatDollars(exposure)}
              </div>
              <div className="text-[11px] text-text3">
                {inboundPaths.length} inbound paths · {blast.length} reachable assets in 3 hops
              </div>
              {showCalc && (
                <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-text3 leading-snug font-mono">
                  V = crit² × 220K × (1 + paths × 0.08)
                  <br />
                  V = {selectedAsset.criticality}² × 220K × (1 + {inboundPaths.length} × 0.08)
                  <br />
                  V = {formatDollars(exposure)}
                </div>
              )}
            </div>

            {/* Inbound paths */}
            <div className="mb-4">
              <div className="eyebrow mb-2">top inbound paths</div>
              <div className="flex flex-col gap-1.5">
                {topPaths.length === 0 && (
                  <div className="text-[11px] text-text3 italic">No inbound paths found in graph.</div>
                )}
                {topPaths.map((p, i) => (
                  <div key={i} className="p-2 rounded-md bg-surface/60 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-text3">path {i + 1}</span>
                      <span className="text-[10px] font-mono text-warning">
                        exploitability {p.score}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap text-[11px] text-text2">
                      {p.path.map((id, j) => {
                        const a = assets.find((x) => x.id === id);
                        return (
                          <span key={`${id}-${j}`} className="flex items-center gap-1">
                            <span
                              className="text-text1 font-medium truncate max-w-[100px]"
                              title={a?.name}
                            >
                              {a?.name ?? id}
                            </span>
                            {j < p.path.length - 1 && (
                              <IconChevronRight size={10} className="text-text3" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blast radius */}
            <div className="mb-4">
              <div className="eyebrow mb-2">blast radius (top 5)</div>
              <div className="flex flex-col gap-1">
                {blastAssets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-surface/60 border border-white/5"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: SEGMENT_COLORS[a.segment] }}
                    />
                    <span className="text-small text-text1 flex-1 truncate">{a.name}</span>
                    <span className="text-[10px] font-mono text-text3">crit {a.criticality}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended controls */}
            <div>
              <div className="eyebrow mb-2">recommended controls</div>
              <div className="flex flex-col gap-1.5">
                {recommendedMitigations.map((m) => (
                  <button
                    key={m.id}
                    onMouseEnter={() => setHoveredMitigation(m.id)}
                    onMouseLeave={() => setHoveredMitigation(null)}
                    onClick={async () => {
                      const next = !mitigations.find((x) => x.id === m.id)?.status?.includes('active');
                      await twinClient.toggleMitigation(m.id, next);
                      twinClient.listMitigations().then(setMitigations);
                    }}
                    className={`text-left p-2.5 rounded-md border transition-all duration-fast ${
                      m.status === 'active'
                        ? 'bg-success/8 border-success/30'
                        : 'bg-surface/60 border-white/5 hover:bg-surface2'
                    } ${hoveredMitigation === m.id ? 'ring-1 ring-accent/30' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-small font-medium text-text1 leading-tight">{m.name}</div>
                      <IconShieldCheck
                        size={13}
                        className={m.status === 'active' ? 'text-success' : 'text-text3'}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text3">
                      <span className="font-mono">setup {formatDollars(m.setupCost)}</span>
                      <span>·</span>
                      <span className="text-success">
                        ▼ {Math.round(m.expectedRiskReduction * 100)}% risk
                      </span>
                      {m.status === 'active' && (
                        <span className="ml-auto flex items-center gap-1 text-success">
                          <IconCircleFilled size={6} />
                          active
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      <NarratorStrip text={narratorText} />
    </div>
  );
}
