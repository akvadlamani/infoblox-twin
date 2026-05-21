import { useEffect, useMemo, useState } from 'react';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { NetworkGraph } from '@/components/scene/NetworkGraph';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { twinClient } from '@/lib/data-clients/factory';
import type { Asset, Edge } from '@/lib/types/twin.types';
import { useAppStore } from '@/lib/state/store';
import { narrate } from '@/lib/llm/narrator-canned';
import { AgentFeed } from '@/components/twin/AgentFeed';
import { AssetDetailDrawer } from '@/components/twin/AssetDetailDrawer';

export function OverviewView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const selectedAssetId = useAppStore((s) => s.selectedAssetId);
  const setSelectedAssetId = useAppStore((s) => s.selectAsset);
  const autoRotate = useAppStore((s) => s.autoRotate);
  const narratorText = useAppStore((s) => s.narratorText);
  const setNarrator = useAppStore((s) => s.setNarrator);

  useEffect(() => {
    twinClient.listAssets().then(setAssets);
    twinClient.getEdges().then(setEdges);
    setNarrator(narrate({ kind: 'scene-load' }));
  }, [setNarrator]);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  return (
    <div className="absolute inset-0" data-tour="overview-scene">
      <SceneRoot
        autoRotate={autoRotate && !selectedAssetId}
        cameraPosition={[22, 13, 22]}
        cameraTarget={[0, 1, 0]}
        onPointerMissed={() => setSelectedAssetId(null)}
      >
        <NetworkGraph
          assets={assets}
          edges={edges}
          selectedAssetId={selectedAssetId}
          onAssetClick={(id) => setSelectedAssetId(id)}
        />
      </SceneRoot>

      {/* Agent activity feed on the left */}
      <AgentFeed />

      {/* Right rail — single consolidated card */}
      <div className="absolute top-[110px] right-5 z-20 w-[280px]">
        <div className="rounded-xl bg-surface/85 border border-white/8 backdrop-blur-md overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="eyebrow mb-1.5">today's exposure</div>
            <div className="flex items-baseline gap-2 mb-1">
              <div className="font-mono text-hero font-medium text-text1 leading-none">$4.2M</div>
              <div className="text-[11px] text-success font-medium">▼ 18%</div>
            </div>
            <div className="text-[11px] text-text3 leading-snug">
              vs. <span className="text-text2 font-mono">$5.1M</span> 90 days ago. FIN-DB drives 51%
              of total ALE.
            </div>
          </div>
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="eyebrow">crown jewels</span>
              <span className="font-mono text-[11px] text-text1">6</span>
            </div>
            <div className="text-[11px] text-text2 leading-snug">
              AD-PRIMARY · FIN-DB · SAP-PROD · R&D-VAULT · DC-CORE · MFG-SCADA
            </div>
          </div>
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="eyebrow">tracked actors</span>
              <span className="font-mono text-[11px] text-text1">8</span>
            </div>
            <div className="text-[11px] text-text2 leading-snug">
              Vigorish Viper · VexTrio · Savvy Seahorse · Decoy Dog · APT29 · Scattered Spider ·
              ALPHV · FIN7
            </div>
          </div>
        </div>
        <div className="mt-2 px-3 py-2 rounded-md bg-surface/60 border border-white/5 text-[10px] text-text3 leading-snug">
          Showing <span className="text-text2 font-mono">{assets.length}</span> most-relevant assets of{' '}
          <span className="text-text2 font-mono">4,247</span> in scope. Endpoint pools represent fleets.
          Click any node to open its detail panel.
        </div>
      </div>

      <NarratorStrip text={narratorText} />

      <AssetDetailDrawer
        asset={selectedAsset}
        allAssets={assets}
        edges={edges}
        onClose={() => setSelectedAssetId(null)}
      />
    </div>
  );
}
