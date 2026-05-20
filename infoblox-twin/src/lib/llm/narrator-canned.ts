export type NarratorEvent =
  | { kind: 'scene-load' }
  | { kind: 'view-change'; view: string }
  | { kind: 'asset-selected'; assetName: string; segment: string; criticality: number }
  | { kind: 'attack-hop'; technique: string; disposition: string; control?: string }
  | { kind: 'agent-action'; agent: string; verdict: string; description: string }
  | { kind: 'control-toggle'; name: string; on: boolean; delta: number }
  | { kind: 'ambient'; view: string };

const heroLine =
  "Good morning. I correlated DNS, flow, cloud, and identity signals across 51 assets overnight. Your highest exposure is FIN-DB at $4.2 million expected loss across 12 reachable paths. Open Breach Replay to watch how Vigorish Viper would get there.";

const VIEW_AMBIENT: Record<string, string[]> = {
  overview: [
    'Ambient: 4 Infoblox-tracked actors observed, 47 scenarios run today, no anomalies in the last 12 minutes.',
    'DNS, flow, cloud, and identity sources synced 2 minutes ago — 51 assets across 8 segments, 6 crown jewels under continuous watch.',
    'Infoblox Threat Intel tracking 14 long-aged-domain candidates against your environment — none have resolved yet.',
  ],
  aev: [
    'Pick a threat actor on the left to replay their kill chain hop-by-hop against your environment.',
    'Twin replays use DNS, flow, identity, and EDR signals to reconstruct the exact path an attacker would take here.',
    'Vigorish Viper last replayed 6 minutes ago — Threat Defense blocked 3 of 5 hops, 2 contained by SOC Insights.',
  ],
  'attack-path': [
    'Click any asset to see what an attacker would need to reach it and what could happen after they do.',
    'Crown jewels are larger and pulsing red — they are your highest-value targets.',
  ],
  'patch-risk': [
    'Patches scored against how your network actually behaves — not the CVSS sticker.',
    '4 of 6 open CVEs are past your patch SLA. Prioritize CVE-2026-29911 on AD-PRIMARY.',
  ],
  compliance: [
    'Twin auto-classifies assets into PCI, HIPAA, GDPR, and SOX zones from tags and observed behavior.',
    'Drift detection surfaces every asset touching a compliance zone but not classified inside it.',
  ],
  'agent-iez': [
    'Four IBIQ agents have proposed actions to the sandbox Twin. Click any to see the simulated impact before it touches production.',
  ],
  crq: [
    'Annualized loss expectancy is computed from the Markov Decision Process formula in Gartner G00835632.',
    'Toggle a control on the right to see real-time ALE recompute.',
  ],
  settings: [
    'Each discovery source feeds the Twin. Toggle one off to remove its contribution from the graph.',
  ],
};

const ASSET_NARR_BY_CRIT: Record<number, (name: string, seg: string) => string> = {
  5: (name, seg) =>
    `${name} is a crown jewel in the ${seg} segment. Twin maps its inbound paths and computes blast radius continuously — it sees 8 to 12 reachable paths depending on active controls.`,
  4: (name, seg) =>
    `${name} sits in the ${seg} segment at criticality 4 — high-value but not crown-jewel. Twin tracks 4 to 7 inbound paths.`,
  3: (name, seg) =>
    `${name} is a moderately critical asset in the ${seg} segment. Twin includes it in blast-radius calculations from any compromised neighbor.`,
  2: (name, seg) =>
    `${name} is a lower-criticality ${seg} asset. Twin still tracks its position in the graph for path enumeration.`,
  1: (name, seg) =>
    `${name} is an endpoint pool in the ${seg} segment. It aggregates many real endpoints behind a single node.`,
  0: (name, seg) => `${name} is a ${seg} asset.`,
};

export function narrate(event: NarratorEvent): string {
  switch (event.kind) {
    case 'scene-load':
      return heroLine;
    case 'view-change': {
      const lines = VIEW_AMBIENT[event.view];
      return lines?.[0] ?? '';
    }
    case 'ambient': {
      const lines = VIEW_AMBIENT[event.view] ?? [];
      return lines[Math.floor(Math.random() * lines.length)] ?? '';
    }
    case 'asset-selected':
      return (ASSET_NARR_BY_CRIT[event.criticality] ?? ASSET_NARR_BY_CRIT[3])(
        event.assetName,
        event.segment
      );
    case 'attack-hop':
      return event.control && event.control !== 'none'
        ? `${event.technique}. ${event.disposition} — ${event.control.toUpperCase()} intervened.`
        : `${event.technique}. ${event.disposition} — Twin flagged for human review.`;
    case 'agent-action':
      return `${event.agent}: "${event.description}" — Twin verdict: ${event.verdict}.`;
    case 'control-toggle': {
      const sign = event.delta > 0 ? '+' : '';
      const formatted =
        Math.abs(event.delta) >= 1_000_000
          ? `${sign}$${(event.delta / 1_000_000).toFixed(1)}M`
          : `${sign}$${Math.round(event.delta / 1000)}K`;
      return `${event.name} ${event.on ? 'enabled' : 'disabled'}. ALE moved ${formatted}.`;
    }
  }
}

export const HERO_LINES = [
  'Pulling DNS, flow, cloud, and identity signals …',
  'Resolving 51 assets across 8 segments …',
  'Scoring attack paths against crown jewels …',
  'Computing patch risk and compliance scope …',
];
