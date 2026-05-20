import { useEffect, useMemo, useState } from 'react';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { NetworkGraph } from '@/components/scene/NetworkGraph';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { twinClient } from '@/lib/data-clients/factory';
import type { Asset, Edge } from '@/lib/types/twin.types';
import { useAppStore } from '@/lib/state/store';
import { narrate } from '@/lib/llm/narrator-canned';
import { SEGMENT_COLORS } from '@/lib/scene/colors';
import {
  IconCircleCheck,
  IconAlertTriangle,
  IconShieldLock,
  IconStethoscope,
  IconScale,
  IconUsersGroup,
} from '@tabler/icons-react';

type ZoneId = 'pci' | 'hipaa' | 'gdpr' | 'sox';

interface Zone {
  id: ZoneId;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;
  color: string;
  // tag-based and segment-based rules to auto-classify
  matchTags: string[];
  matchSegments?: string[];
  expectedControls: string[];
}

const ZONES: Zone[] = [
  {
    id: 'pci',
    name: 'PCI-DSS',
    description: 'Cardholder data environment. Storage, processing, or transmission of PAN.',
    icon: IconScale,
    color: '#3b82f6',
    matchTags: ['pci-dss', 'pci'],
    matchSegments: ['finance'],
    expectedControls: ['Segmentation from corporate AD', 'Quarterly ASV scans', 'TD on Finance segment'],
  },
  {
    id: 'hipaa',
    name: 'HIPAA',
    description: 'Protected Health Information (ePHI). Patient-identifiable data systems.',
    icon: IconStethoscope,
    color: '#10b981',
    matchTags: ['hipaa', 'phi'],
    expectedControls: ['Encryption at rest', 'Audit log forwarding', 'BAA tracking'],
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    description: 'EU resident personal data. Sales, marketing, payroll, identity systems.',
    icon: IconUsersGroup,
    color: '#7F77DD',
    matchTags: ['pii', 'gdpr'],
    matchSegments: ['sales'],
    expectedControls: ['Data classification', 'DSR workflow', 'Lawful basis registry'],
  },
  {
    id: 'sox',
    name: 'SOX',
    description: 'Financial reporting integrity. Material accounting systems and access.',
    icon: IconShieldLock,
    color: '#D85A30',
    matchTags: ['sox'],
    matchSegments: ['finance'],
    expectedControls: ['Privileged access review', 'Change-management evidence', 'Quarterly access certification'],
  },
];

function inZone(asset: Asset, zone: Zone): boolean {
  if (zone.matchTags.some((t) => asset.tags?.includes(t))) return true;
  if (zone.matchSegments?.includes(asset.segment) && asset.criticality >= 3) return true;
  return false;
}

export function ComplianceView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [zoneId, setZoneId] = useState<ZoneId>('pci');
  const setNarrator = useAppStore((s) => s.setNarrator);
  const narratorText = useAppStore((s) => s.narratorText);

  useEffect(() => {
    twinClient.listAssets().then(setAssets);
    twinClient.getEdges().then(setEdges);
    setNarrator(narrate({ kind: 'view-change', view: 'compliance' }));
  }, [setNarrator]);

  const zone = ZONES.find((z) => z.id === zoneId)!;
  const inScope = useMemo(() => assets.filter((a) => inZone(a, zone)), [assets, zone]);
  const inScopeIds = useMemo(() => new Set(inScope.map((a) => a.id)), [inScope]);

  // Drift detection: assets that touch in-scope but are NOT in scope themselves.
  const drift = useMemo(() => {
    const adj = new Set<string>();
    for (const e of edges) {
      if (inScopeIds.has(e.source) && !inScopeIds.has(e.target)) adj.add(e.target);
      if (inScopeIds.has(e.target) && !inScopeIds.has(e.source)) adj.add(e.source);
    }
    return assets.filter((a) => adj.has(a.id));
  }, [assets, edges, inScopeIds]);

  return (
    <div className="absolute inset-0 grid grid-cols-[340px_minmax(0,1fr)] pt-[100px]">
      <aside className="overflow-y-auto px-4 pb-6 border-r border-white/5 bg-surface/30 backdrop-blur-md">
        <div className="eyebrow mt-2 mb-2">compliance zones</div>
        <div className="text-[11px] text-text3 leading-snug mb-3">
          Twin maps assets into regulatory zones from tags and behavior — no manual list to maintain, no
          audit-week surprises.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ZONES.map((z) => {
            const Icon = z.icon;
            const count = assets.filter((a) => inZone(a, z)).length;
            const active = zoneId === z.id;
            return (
              <button
                key={z.id}
                onClick={() => setZoneId(z.id)}
                className={`p-3 rounded-lg border text-left transition-all duration-fast ${
                  active
                    ? 'bg-surface2 border-accent/40 ring-1 ring-accent/30'
                    : 'bg-surface/60 border-white/5 hover:bg-surface2'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon size={14} className="text-text2" style={{ color: z.color }} />
                  <span className="font-mono text-[11px] text-text1">{count}</span>
                </div>
                <div className="text-small font-medium text-text1">{z.name}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 p-3 rounded-lg bg-surface/60 border border-white/5">
          <div className="eyebrow mb-1.5">{zone.name} expected controls</div>
          <ul className="flex flex-col gap-1">
            {zone.expectedControls.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-text2">
                <IconCircleCheck size={11} className="text-success mt-0.5 shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 p-3 rounded-lg bg-warning/8 border border-warning/30">
          <div className="flex items-center gap-1.5 mb-1">
            <IconAlertTriangle size={12} className="text-warning" />
            <span className="text-[11px] font-medium text-warning">drift detected</span>
          </div>
          <div className="text-[11px] text-text2 leading-snug mb-2">
            <span className="font-mono text-text1">{drift.length}</span> assets touch the {zone.name}{' '}
            zone but are not classified inside it. Confirm scope or harden the boundary.
          </div>
          <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
            {drift.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-[11px]">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: SEGMENT_COLORS[a.segment] }}
                />
                <span className="text-text1 truncate">{a.name}</span>
                <span className="text-text3 text-[10px] ml-auto capitalize">{a.segment}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="relative">
        <SceneRoot autoRotate={false} cameraPosition={[22, 13, 22]} cameraTarget={[0, 1, 0]}>
          <NetworkGraph
            assets={assets}
            edges={edges}
            // Highlight in-scope assets via "selected" treatment (cyan ring)
            // and drift via warning color
            pathAssetIds={inScopeIds}
          />
        </SceneRoot>
        <div className="absolute top-3 left-3 p-3 rounded-lg bg-surface/85 border border-white/8 backdrop-blur-md">
          <div className="eyebrow">{zone.name} scope</div>
          <div className="flex items-baseline gap-3">
            <div className="font-mono text-hero text-text1 leading-none">{inScope.length}</div>
            <div className="text-[11px] text-text3">assets in scope</div>
          </div>
          <div className="text-[11px] text-text2 max-w-[340px] mt-1.5 leading-snug">
            {zone.description}
          </div>
        </div>

        <div className="absolute top-3 right-3 p-3 rounded-lg bg-surface/85 border border-white/8 backdrop-blur-md w-[280px]">
          <div className="eyebrow mb-2">in-scope assets</div>
          <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pr-1">
            {inScope.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-[11px]">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: SEGMENT_COLORS[a.segment] }}
                />
                <span className="text-text1 font-medium flex-1 truncate">{a.name}</span>
                <span className="text-text3 text-[10px] capitalize">{a.segment}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NarratorStrip text={narratorText} />
    </div>
  );
}
