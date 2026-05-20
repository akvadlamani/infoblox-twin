import { useMemo } from 'react';
import type { Asset, Edge } from '@/lib/types/twin.types';
import { AssetNode } from './AssetNode';
import { EdgeLine } from './EdgeLine';

interface Props {
  assets: Asset[];
  edges: Edge[];
  selectedAssetId?: string | null;
  compromisedAssetIds?: Set<string>;
  blastAssetIds?: Set<string>;
  pathAssetIds?: Set<string>;
  attackEdgeIds?: Set<string>;
  pathEdgeIds?: Set<string>;
  blastEdgeIds?: Set<string>;
  onAssetClick?: (id: string) => void;
  forceLabelAll?: boolean;
}

export function NetworkGraph({
  assets,
  edges,
  selectedAssetId,
  compromisedAssetIds,
  blastAssetIds,
  pathAssetIds,
  attackEdgeIds,
  pathEdgeIds,
  blastEdgeIds,
  onAssetClick,
  forceLabelAll,
}: Props) {
  const assetById = useMemo(() => {
    const m = new Map<string, Asset>();
    for (const a of assets) m.set(a.id, a);
    return m;
  }, [assets]);

  return (
    <group>
      {edges.map((e) => {
        const s = assetById.get(e.source);
        const t = assetById.get(e.target);
        if (!s || !t) return null;
        let hl: 'attack' | 'blast' | 'path' | null = null;
        if (attackEdgeIds?.has(e.id)) hl = 'attack';
        else if (pathEdgeIds?.has(e.id)) hl = 'path';
        else if (blastEdgeIds?.has(e.id)) hl = 'blast';
        return (
          <EdgeLine
            key={e.id}
            edge={e}
            from={[s.position3D.x, s.position3D.y, s.position3D.z]}
            to={[t.position3D.x, t.position3D.y, t.position3D.z]}
            highlight={hl}
          />
        );
      })}
      {assets.map((a) => (
        <AssetNode
          key={a.id}
          asset={a}
          isSelected={selectedAssetId === a.id}
          isCompromised={compromisedAssetIds?.has(a.id)}
          inBlast={blastAssetIds?.has(a.id)}
          inPath={pathAssetIds?.has(a.id)}
          onClick={onAssetClick}
          forceLabel={forceLabelAll}
        />
      ))}
    </group>
  );
}
