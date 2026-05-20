import type {
  Asset,
  Edge,
  ThreatActor,
  KillChainStep,
  AgentAction,
  CrqSnapshot,
  Mitigation,
  InsurancePolicy,
  OrgInfo,
  DataSourceHealth,
  RiskScenario,
} from '@/lib/types/twin.types';
import type { TwinDataClient, AssetFilter } from './interface';
import { computeAle, computeScenarioAle } from '@/lib/twin/crq-mdp';

import assetsJson from '@/data/mock/acme-corp-assets.json';
import edgesJson from '@/data/mock/acme-corp-edges.json';
import actorsJson from '@/data/mock/threat-actors.json';
import mitigationsJson from '@/data/mock/mitigations.json';

const ASSETS = assetsJson as Asset[];
const EDGES = edgesJson as Edge[];
const ACTORS = actorsJson as ThreatActor[];
const INIT_MITIGATIONS = mitigationsJson as Mitigation[];

function delay<T>(value: T, ms = 80 + Math.random() * 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// Build CRQ scenarios statically (4 scenarios mapped to actors)
const SCENARIOS: RiskScenario[] = [
  {
    id: 's_viper',
    name: 'Vigorish Viper via Finance',
    threatActorId: 'vigorish-viper',
    primaryTargetAssetId: 'ast_fin-db',
    expectedLoss: 4_200_000,
    annualProbability: 0.5,
    ale: 0,
    trend30d: -0.12,
    topMitigations: ['m_td-finance', 'm_inflight', 'm_mfa-exec'],
    description: 'AiTM credential theft path through finance team to FIN-DB.',
  },
  {
    id: 's_seahorse',
    name: 'Savvy Seahorse via Exec → R&D',
    threatActorId: 'savvy-seahorse',
    primaryTargetAssetId: 'ast_rd-vault',
    expectedLoss: 3_300_000,
    annualProbability: 0.25,
    ale: 0,
    trend30d: 0.04,
    topMitigations: ['m_mfa-exec', 'm_segment-rd', 'm_soc-insights'],
    description: 'Long-aged-domain AiTM bypasses NRD reputation, reaches R&D-VAULT.',
  },
  {
    id: 's_decoy',
    name: 'Decoy Dog against R&D',
    threatActorId: 'decoy-dog',
    primaryTargetAssetId: 'ast_rd-vault',
    expectedLoss: 5_800_000,
    annualProbability: 0.12,
    ale: 0,
    trend30d: -0.07,
    topMitigations: ['m_segment-rd', 'm_soc-insights'],
    description: 'Nation-state DNS-C2 RAT targeting source/secrets via long-dwell beacon.',
  },
  {
    id: 's_vextrio',
    name: 'VexTrio TDS via Payroll',
    threatActorId: 'vextrio',
    primaryTargetAssetId: 'ast_payroll',
    expectedLoss: 1_900_000,
    annualProbability: 0.3,
    ale: 0,
    trend30d: -0.21,
    topMitigations: ['m_td-finance', 'm_inflight'],
    description: 'DNS-based TDS routes payroll users into credential-theft funnel.',
  },
];

const MDP_ACTIONS = [
  { id: 'a_viper', name: 'Vigorish Viper kill chain', probability: 0.5, reward: 4_200_000 },
  { id: 'a_seahorse', name: 'Savvy Seahorse kill chain', probability: 0.25, reward: 3_300_000 },
  { id: 'a_decoy', name: 'Decoy Dog kill chain', probability: 0.12, reward: 5_800_000 },
  { id: 'a_vextrio', name: 'VexTrio kill chain', probability: 0.3, reward: 1_900_000 },
];
const ACTION_TO_ACTOR: Record<string, string> = {
  a_viper: 'vigorish-viper',
  a_vextrio: 'vextrio',
  a_seahorse: 'savvy-seahorse',
  a_decoy: 'decoy-dog',
};

// BFS for blast radius / inbound paths
function neighbors(assetId: string): { id: string; via: Edge }[] {
  return EDGES.filter((e) => e.source === assetId).map((e) => ({ id: e.target, via: e }));
}
function inboundNeighbors(assetId: string): { id: string; via: Edge }[] {
  return EDGES.filter((e) => e.target === assetId).map((e) => ({ id: e.source, via: e }));
}

export class MockClient implements TwinDataClient {
  private mitigations: Mitigation[] = INIT_MITIGATIONS.map((m) => ({ ...m }));
  private pendingActions: AgentAction[] = [
    {
      id: 'aa_1',
      agentName: 'Action agent',
      proposedAt: '2026-05-19T11:42:00Z',
      description:
        'Quarantine endpoint pool finance (suspicious DNS pattern, 18 requests to newly-observed domain).',
      targetAssetIds: ['ast_emp-pool-finance'],
      simulation: {
        verdict: 'safe',
        dependenciesAffected: 0,
        usersAffected: 0,
        servicesRerouted: 0,
        rationale:
          'Endpoint pool, 0 production dependencies, 0 users affected by quarantine action.',
        confidence: 0.96,
      },
      status: 'pending',
    },
    {
      id: 'aa_2',
      agentName: 'Action agent',
      proposedAt: '2026-05-19T11:39:00Z',
      description: 'Block domain api-update-svc.io org-wide.',
      targetAssetIds: ['ast_internet'],
      simulation: {
        verdict: 'unsafe',
        dependenciesAffected: 23,
        usersAffected: 412,
        servicesRerouted: 0,
        rationale:
          'Twin shows 23 internal services depend on this domain, blocking breaks 412 users.',
        confidence: 0.91,
      },
      status: 'pending',
    },
    {
      id: 'aa_3',
      agentName: 'Verification agent',
      proposedAt: '2026-05-19T11:35:00Z',
      description: 'Push Threat Defense policy update to Engineering segment.',
      targetAssetIds: ['ast_emp-pool-eng', 'ast_eng-jump'],
      simulation: {
        verdict: 'safe',
        dependenciesAffected: 2,
        usersAffected: 0,
        servicesRerouted: 2,
        rationale: '2 services affected briefly during rollout, no business impact.',
        confidence: 0.93,
      },
      status: 'pending',
    },
    {
      id: 'aa_4',
      agentName: 'Triage agent',
      proposedAt: '2026-05-19T11:30:00Z',
      description: 'Auto-close 1,247 low-severity alerts matching known benign pattern.',
      targetAssetIds: [],
      simulation: {
        verdict: 'safe-with-audit',
        dependenciesAffected: 0,
        usersAffected: 0,
        servicesRerouted: 0,
        rationale:
          '1,239 of 1,247 match known benign pattern, auto-close those and escalate 8 outliers.',
        confidence: 0.88,
      },
      status: 'pending',
    },
  ];

  async getOrgInfo(): Promise<OrgInfo> {
    return delay({
      name: 'Acme Corp',
      assetCount: ASSETS.length,
      lastSyncAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    });
  }

  async listAssets(filter?: AssetFilter): Promise<Asset[]> {
    let out = ASSETS.slice();
    if (filter?.segment) out = out.filter((a) => a.segment === filter.segment);
    if (filter?.criticality !== undefined)
      out = out.filter((a) => a.criticality === filter.criticality);
    if (filter?.tag) out = out.filter((a) => a.tags.includes(filter.tag!));
    return delay(out);
  }

  async getAsset(id: string): Promise<Asset> {
    const a = ASSETS.find((x) => x.id === id);
    if (!a) throw new Error(`Asset not found: ${id}`);
    return delay(a);
  }

  async searchAssets(query: string): Promise<Asset[]> {
    const q = query.toLowerCase();
    return delay(
      ASSETS.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.vendor.toLowerCase().includes(q) ||
          a.segment.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      )
    );
  }

  async getEdges(assetIds?: string[]): Promise<Edge[]> {
    if (!assetIds) return delay(EDGES.slice());
    const set = new Set(assetIds);
    return delay(EDGES.filter((e) => set.has(e.source) || set.has(e.target)));
  }

  async listThreatActors(): Promise<ThreatActor[]> {
    return delay(ACTORS.slice());
  }

  async getThreatActor(id: string): Promise<ThreatActor> {
    const a = ACTORS.find((x) => x.id === id);
    if (!a) throw new Error(`Actor not found: ${id}`);
    return delay(a);
  }

  async computeKillChain(actorId: string): Promise<KillChainStep[]> {
    const a = ACTORS.find((x) => x.id === actorId);
    if (!a) throw new Error(`Actor not found: ${actorId}`);
    return delay(a.killChainTemplate.slice());
  }

  async computeBlastRadius(sourceAssetId: string, maxHops = 3): Promise<string[]> {
    const visited = new Set<string>([sourceAssetId]);
    const queue: { id: string; hops: number }[] = [{ id: sourceAssetId, hops: 0 }];
    const reached: string[] = [];
    while (queue.length > 0) {
      const { id, hops } = queue.shift()!;
      if (hops >= maxHops) continue;
      for (const n of neighbors(id)) {
        if (!visited.has(n.id)) {
          visited.add(n.id);
          reached.push(n.id);
          queue.push({ id: n.id, hops: hops + 1 });
        }
      }
    }
    return delay(reached);
  }

  async computeInboundPaths(targetAssetId: string, maxHops = 4): Promise<string[][]> {
    // Find paths from internet edge to target
    const paths: string[][] = [];
    const dfs = (current: string, path: string[], depth: number) => {
      if (path.length > 0 && current === targetAssetId) {
        paths.push([...path, current]);
        return;
      }
      if (depth >= maxHops) return;
      for (const n of neighbors(current)) {
        if (path.includes(n.id)) continue;
        dfs(n.id, [...path, current], depth + 1);
      }
    };
    dfs('ast_internet', [], 0);
    // Also start from email gateway (separate phishing path)
    const start2 = ['ast_email-gw', 'ast_vpn-gw'];
    for (const s of start2) {
      const dfs2 = (current: string, path: string[], depth: number) => {
        if (path.length > 0 && current === targetAssetId) {
          paths.push([...path, current]);
          return;
        }
        if (depth >= maxHops) return;
        for (const n of neighbors(current)) {
          if (path.includes(n.id)) continue;
          dfs2(n.id, [...path, current], depth + 1);
        }
      };
      dfs2(s, [], 0);
    }
    // Dedupe and keep top 3 shortest
    const seen = new Set<string>();
    const uniq: string[][] = [];
    for (const p of paths.sort((a, b) => a.length - b.length)) {
      const key = p.join('>');
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(p);
      }
    }
    return delay(uniq.slice(0, 5));
  }

  async listPendingAgentActions(): Promise<AgentAction[]> {
    return delay(this.pendingActions.slice());
  }

  async resolveAgentAction(
    actionId: string,
    decision: 'approve' | 'reject' | 'escalate'
  ): Promise<AgentAction> {
    const a = this.pendingActions.find((x) => x.id === actionId);
    if (!a) throw new Error(`Action not found: ${actionId}`);
    a.status =
      decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'escalated';
    return delay(a);
  }

  private buildSnapshot(): CrqSnapshot {
    const active = this.mitigations.filter((m) => m.status === 'active');
    const scenarios = SCENARIOS.map((s) => ({ ...s, ale: computeScenarioAle(s, active) }));
    scenarios.sort((a, b) => b.ale - a.ale);
    return {
      timestamp: new Date().toISOString(),
      totalAle: computeAle({
        eventsPerMonth: 1000,
        actions: MDP_ACTIONS,
        activeMitigations: active,
        scenarioToActorMap: ACTION_TO_ACTOR,
      }),
      topScenarios: scenarios,
      activeControls: active.map((m) => m.id),
      mdpInputs: {
        eventsPerMonth: 1000,
        actions: MDP_ACTIONS,
      },
    };
  }

  async getCurrentCrqSnapshot(): Promise<CrqSnapshot> {
    return delay(this.buildSnapshot());
  }

  async getCrqHistory(days: number): Promise<{ date: string; ale: number }[]> {
    const baseStart = 5_100_000;
    const baseEnd = this.buildSnapshot().totalAle;
    const arr: { date: string; ale: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const t = (days - 1 - i) / (days - 1);
      const eased = baseStart + (baseEnd - baseStart) * t;
      const noise = (Math.sin(i * 1.37) + Math.cos(i * 0.71)) * 0.015;
      const val = Math.round(eased * (1 + noise));
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      arr.push({ date: d.toISOString().slice(0, 10), ale: val });
    }
    return delay(arr);
  }

  async listMitigations(): Promise<Mitigation[]> {
    return delay(this.mitigations.slice());
  }

  async toggleMitigation(id: string, on: boolean): Promise<CrqSnapshot> {
    const m = this.mitigations.find((x) => x.id === id);
    if (!m) throw new Error(`Mitigation not found: ${id}`);
    m.status = on ? 'active' : 'inactive';
    return delay(this.buildSnapshot(), 40);
  }

  async getInsurancePolicy(): Promise<InsurancePolicy> {
    const snapshot = this.buildSnapshot();
    const basePremium = 890_000;
    // Twin risk delta scales with current ALE relative to baseline 4.2M
    const baseline = 4_200_000;
    const ratio = Math.min(1.2, Math.max(0.4, snapshot.totalAle / baseline));
    const delta = Math.round(-340_000 * (2 - ratio) * 0.5);
    const net = basePremium + delta;
    return delay({
      insurerId: 'vertex',
      insurerName: 'Vertex Cyber Underwriting',
      insuredOrg: 'Acme Corp',
      policyId: 'POL-2026-04471',
      basePremium,
      twinRiskDelta: delta,
      netPremium: net,
      twinSignals: [
        'DNS reputation: clean',
        'EDR coverage: 98%',
        'MFA: 4/5 critical apps',
        'Patch SLA: 11d avg',
        'Phishing-resilience: high',
        'Backup tested: 14d',
      ],
      recommendedActions: [
        {
          mitigationId: 'm_td-finance',
          premiumDelta: -42000,
          label: 'Deploy TD on Engineering segment',
        },
        {
          mitigationId: 'm_inflight',
          premiumDelta: -78000,
          label: 'Enable Inflight email security pre-delivery',
        },
        {
          mitigationId: 'm_cyber911',
          premiumDelta: -31000,
          label: 'Cyber 911 failover for DNS',
        },
      ],
      lossRatioImpact: -0.22,
      revSharePct: 0.12,
    });
  }

  async getDataSourceHealth(): Promise<DataSourceHealth[]> {
    const now = new Date(Date.now() - 1000 * 60 * 2).toISOString();
    return delay([
      { source: 'Universal Asset Insights', healthy: true, lastSyncAt: now, error: null },
      { source: 'Threat Defense', healthy: true, lastSyncAt: now, error: null },
      { source: 'Phoebe TIG', healthy: true, lastSyncAt: now, error: null },
      { source: 'NIOS DDI', healthy: true, lastSyncAt: now, error: null },
      { source: 'SOC Insights', healthy: true, lastSyncAt: now, error: null },
    ]);
  }
}
