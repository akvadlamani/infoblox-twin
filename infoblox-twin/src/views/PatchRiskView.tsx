import { useEffect, useMemo, useState } from 'react';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { NetworkGraph } from '@/components/scene/NetworkGraph';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { twinClient } from '@/lib/data-clients/factory';
import type { Asset, Edge } from '@/lib/types/twin.types';
import { useAppStore } from '@/lib/state/store';
import { narrate } from '@/lib/llm/narrator-canned';
import { SEGMENT_COLORS, formatDollars } from '@/lib/scene/colors';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconArrowDownRight,
} from '@tabler/icons-react';

interface PatchCandidate {
  cve: string;
  title: string;
  cvssRaw: number;
  affectedAssetIds: string[];
  riskScore: number; // 0-100, computed against actual blast radius
  reasoning: string[];
  blastValueAtRisk: number;
  patchSloDays: number;
  daysExposed: number;
  recommendation: 'patch-now' | 'schedule-window' | 'accept';
}

const PATCHES: Omit<PatchCandidate, 'riskScore' | 'recommendation' | 'reasoning'>[] = [
  {
    cve: 'CVE-2026-31104',
    title: 'Oracle Exadata privilege escalation (CDB)',
    cvssRaw: 7.8,
    affectedAssetIds: ['ast_fin-db'],
    blastValueAtRisk: 4_200_000,
    patchSloDays: 14,
    daysExposed: 18,
  },
  {
    cve: 'CVE-2026-29911',
    title: 'Windows Server Kerberos sigma flaw',
    cvssRaw: 9.1,
    affectedAssetIds: ['ast_ad-primary', 'ast_ad-secondary'],
    blastValueAtRisk: 6_900_000,
    patchSloDays: 7,
    daysExposed: 4,
  },
  {
    cve: 'CVE-2026-12277',
    title: 'HashiCorp Vault auth bypass (rare path)',
    cvssRaw: 8.4,
    affectedAssetIds: ['ast_rd-vault'],
    blastValueAtRisk: 5_800_000,
    patchSloDays: 14,
    daysExposed: 9,
  },
  {
    cve: 'CVE-2026-44081',
    title: 'GitLab Premium server-side template injection',
    cvssRaw: 8.1,
    affectedAssetIds: ['ast_git-primary'],
    blastValueAtRisk: 1_500_000,
    patchSloDays: 14,
    daysExposed: 21,
  },
  {
    cve: 'CVE-2026-19002',
    title: 'Siemens WinCC OA OPC-UA memory corruption',
    cvssRaw: 9.8,
    affectedAssetIds: ['ast_mfg-scada'],
    blastValueAtRisk: 7_400_000,
    patchSloDays: 30,
    daysExposed: 11,
  },
  {
    cve: 'CVE-2026-08714',
    title: 'Adobe AEM author Java deserialization',
    cvssRaw: 9.4,
    affectedAssetIds: ['ast_cms'],
    blastValueAtRisk: 280_000,
    patchSloDays: 30,
    daysExposed: 5,
  },
];

export function PatchRiskView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<string | null>(PATCHES[0].cve);
  const setNarrator = useAppStore((s) => s.setNarrator);
  const narratorText = useAppStore((s) => s.narratorText);
  const [blastByPatch, setBlastByPatch] = useState<Record<string, string[]>>({});

  useEffect(() => {
    twinClient.listAssets().then(setAssets);
    twinClient.getEdges().then(setEdges);
    setNarrator(narrate({ kind: 'view-change', view: 'patch-risk' }));
  }, [setNarrator]);

  // Compute blast radius for each patch's affected asset
  useEffect(() => {
    (async () => {
      const out: Record<string, string[]> = {};
      for (const p of PATCHES) {
        const collected = new Set<string>();
        for (const a of p.affectedAssetIds) {
          const r = await twinClient.computeBlastRadius(a, 3);
          r.forEach((x) => collected.add(x));
        }
        out[p.cve] = Array.from(collected);
      }
      setBlastByPatch(out);
    })();
  }, []);

  const enriched: PatchCandidate[] = useMemo(() => {
    return PATCHES.map((p) => {
      const blast = blastByPatch[p.cve] ?? [];
      const crownInBlast = assets.filter(
        (a) => blast.includes(a.id) && a.criticality === 5
      ).length;
      const cvssBoost = (p.cvssRaw / 10) * 35;
      const blastBoost = Math.min(35, blast.length * 1.8);
      const crownBoost = crownInBlast * 10;
      const directHit = p.affectedAssetIds.some((id) => {
        const a = assets.find((x) => x.id === id);
        return a && a.criticality >= 4;
      })
        ? 12
        : 0;
      const sloOverdue = Math.max(0, p.daysExposed - p.patchSloDays);
      const sloPenalty = Math.min(8, sloOverdue * 0.6);
      const score = Math.min(100, Math.round(cvssBoost + blastBoost + crownBoost + directHit + sloPenalty));
      const reasoning = [
        `CVSS base ${p.cvssRaw} → ${Math.round(cvssBoost)} pts`,
        `Reaches ${blast.length} assets in 3 hops → ${Math.round(blastBoost)} pts`,
        `${crownInBlast} crown-jewel(s) in blast radius → ${crownBoost} pts`,
        directHit ? `Direct hit on high-value asset → ${directHit} pts` : null,
        sloOverdue > 0
          ? `${sloOverdue}d past patch SLA → ${Math.round(sloPenalty)} pts`
          : null,
      ].filter(Boolean) as string[];
      const recommendation: PatchCandidate['recommendation'] =
        score >= 70 ? 'patch-now' : score >= 45 ? 'schedule-window' : 'accept';
      return { ...p, riskScore: score, blastValueAtRisk: p.blastValueAtRisk, reasoning, recommendation };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [blastByPatch, assets]);

  const sel = useMemo(() => enriched.find((p) => p.cve === selected) ?? enriched[0], [enriched, selected]);

  const blastSet = useMemo(() => new Set(blastByPatch[sel?.cve ?? ''] ?? []), [blastByPatch, sel]);
  const focusedAssetIds = useMemo(() => new Set(sel?.affectedAssetIds ?? []), [sel]);

  return (
    <div className="absolute inset-0 grid grid-cols-[420px_minmax(0,1fr)] pt-[100px]">
      {/* List */}
      <aside className="overflow-y-auto px-4 pb-6 border-r border-white/5 bg-surface/30 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2 mt-2">
          <div className="eyebrow">open vulnerabilities</div>
          <span className="text-[10px] font-mono text-text3">scored against your graph</span>
        </div>
        <div className="text-[11px] text-text3 mb-3 leading-snug">
          Risk is computed against how your network <em>actually</em> behaves — not the CVSS sticker.
          Crown jewels in blast radius and SLA overrun move the score, not the raw severity.
        </div>
        <div className="flex flex-col gap-2">
          {enriched.map((p) => (
            <button
              key={p.cve}
              onClick={() => setSelected(p.cve)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-fast ${
                selected === p.cve
                  ? 'bg-surface2 border-accent/40 ring-1 ring-accent/30'
                  : 'bg-surface/60 border-white/5 hover:bg-surface2'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-mono text-[11px] text-text3">{p.cve}</span>
                <RiskPill score={p.riskScore} />
              </div>
              <div className="text-body text-text1 font-medium mb-1.5 leading-snug">{p.title}</div>
              <div className="flex items-center gap-2 text-[10px] text-text3 flex-wrap">
                <span className="font-mono">CVSS {p.cvssRaw.toFixed(1)}</span>
                <span>·</span>
                <span>
                  <span className="text-text1 font-medium">{(blastByPatch[p.cve] ?? []).length}</span>{' '}
                  in blast
                </span>
                <span>·</span>
                <span className="font-mono">{formatDollars(p.blastValueAtRisk)} at risk</span>
                {p.daysExposed > p.patchSloDays && (
                  <span className="ml-auto flex items-center gap-1 text-warning">
                    <IconClock size={10} />
                    {p.daysExposed - p.patchSloDays}d past SLA
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Detail + scene */}
      <div className="relative">
        <SceneRoot autoRotate={false} cameraPosition={[22, 13, 22]} cameraTarget={[0, 1, 0]}>
          <NetworkGraph
            assets={assets}
            edges={edges}
            blastAssetIds={blastSet}
            compromisedAssetIds={focusedAssetIds}
          />
        </SceneRoot>

        {sel && (
          <div className="absolute top-3 left-3 right-3 p-4 rounded-lg bg-surface/85 border border-white/8 backdrop-blur-md max-w-[640px]">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-mono text-[11px] text-text3 mb-0.5">{sel.cve}</div>
                <div className="text-h2 font-medium text-text1 leading-tight">{sel.title}</div>
              </div>
              <RiskPill score={sel.riskScore} big />
            </div>
            <div className="grid grid-cols-4 gap-2 my-3">
              <Stat label="CVSS" value={sel.cvssRaw.toFixed(1)} />
              <Stat label="Twin risk" value={String(sel.riskScore)} accent />
              <Stat label="Blast" value={String(blastSet.size)} />
              <Stat label="$ at risk" value={formatDollars(sel.blastValueAtRisk)} />
            </div>
            <div className="text-[11px] text-text3 mb-2">why this score</div>
            <ul className="flex flex-col gap-0.5 mb-3">
              {sel.reasoning.map((r, i) => (
                <li key={i} className="text-[11px] text-text2 flex items-baseline gap-2">
                  <span className="text-text3">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <RecommendationBar rec={sel.recommendation} sloDays={sel.patchSloDays} daysExposed={sel.daysExposed} />
          </div>
        )}

        {sel && (
          <div className="absolute bottom-24 right-3 p-3 rounded-lg bg-surface/85 border border-white/8 backdrop-blur-md max-w-[320px]">
            <div className="eyebrow mb-1.5">affected assets</div>
            <div className="flex flex-col gap-1.5">
              {sel.affectedAssetIds.map((id) => {
                const a = assets.find((x) => x.id === id);
                if (!a) return null;
                return (
                  <div key={id} className="flex items-center gap-2 text-[12px]">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: SEGMENT_COLORS[a.segment] }}
                    />
                    <span className="text-text1 font-medium">{a.name}</span>
                    <span className="text-text3 text-[10px] ml-auto font-mono">crit {a.criticality}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <NarratorStrip text={narratorText} />
    </div>
  );
}

function RiskPill({ score, big }: { score: number; big?: boolean }) {
  const color =
    score >= 70
      ? { fg: '#ef4444', bg: 'rgba(239,68,68,0.15)', bd: 'rgba(239,68,68,0.4)' }
      : score >= 45
      ? { fg: '#f59e0b', bg: 'rgba(245,158,11,0.15)', bd: 'rgba(245,158,11,0.4)' }
      : { fg: '#10b981', bg: 'rgba(16,185,129,0.15)', bd: 'rgba(16,185,129,0.4)' };
  return (
    <span
      style={{
        color: color.fg,
        background: color.bg,
        border: `1px solid ${color.bd}`,
      }}
      className={`rounded font-mono ${big ? 'px-3 py-1.5 text-h2' : 'px-1.5 py-0.5 text-[10px]'}`}
    >
      {score}
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-2 rounded-md bg-page/40 border border-white/5">
      <div className="text-[9px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
      <div className={`font-mono ${accent ? 'text-accent2' : 'text-text1'} text-body font-medium`}>
        {value}
      </div>
    </div>
  );
}

function RecommendationBar({
  rec,
  sloDays,
  daysExposed,
}: {
  rec: 'patch-now' | 'schedule-window' | 'accept';
  sloDays: number;
  daysExposed: number;
}) {
  const map = {
    'patch-now': {
      icon: IconAlertTriangle,
      label: 'Patch now — within 24 hours',
      color: 'text-danger border-danger/40 bg-danger/10',
    },
    'schedule-window': {
      icon: IconClock,
      label: 'Schedule in next maintenance window',
      color: 'text-warning border-warning/40 bg-warning/10',
    },
    accept: {
      icon: IconCircleCheck,
      label: 'Risk acceptable — keep monitoring',
      color: 'text-success border-success/40 bg-success/10',
    },
  } as const;
  const r = map[rec];
  const Icon = r.icon;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-body font-medium ${r.color}`}>
      <Icon size={14} />
      <span>{r.label}</span>
      <span className="ml-auto text-[10px] font-mono text-text3">
        SLA {sloDays}d · exposed {daysExposed}d
        {daysExposed > sloDays && (
          <span className="text-warning ml-1 inline-flex items-center gap-0.5">
            <IconArrowDownRight size={10} />
            overdue
          </span>
        )}
      </span>
    </div>
  );
}
