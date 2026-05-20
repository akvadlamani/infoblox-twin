import type { ViewName } from '@/lib/types/twin.types';

export interface TourStep {
  id: string;
  title: string;
  body: string;
  // Which view to navigate to before showing the step.
  view?: ViewName;
  // CSS selector for the element to spotlight. If omitted, message centers on screen.
  target?: string;
  // Optional setup: runs after view navigation but before the spotlight resolves.
  setup?: 'open-asset-drawer' | 'run-mythos-sim' | 'open-ask-mystique' | 'open-agent-detail';
  // Where to place the message bubble relative to the spotlight.
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const TOUR: TourStep[] = [
  {
    id: 'welcome',
    title: "I'm Mystique. Here's the tour.",
    body:
      "Twin fuses DNS, flow, identity, cloud, EDR, and OT signals into one living picture of your enterprise. I'll walk you through the whole product in about 90 seconds. Hit Continue, or skip if you'd rather poke around.",
    view: 'overview',
    placement: 'center',
  },
  {
    id: 'graph',
    title: 'Your network, as one living graph',
    body:
      '51 assets across 8 segments, 94 relationships. Crown jewels orbit with a red ring. Every node is the asset type you expect — laptop, server, database, cloud workload, OT controller — not abstract shapes.',
    view: 'overview',
    target: '[data-tour="overview-scene"]',
    placement: 'right',
  },
  {
    id: 'agent-feed',
    title: 'The overnight brief — written by your agents',
    body:
      'Every entry here is attributed to a specific agent. Sentinel watched the graph overnight. Triage closed 1,247 benign alerts. Takedown filed an abuse report on the Vigorish Viper lookalike — seized in 2 hours.',
    view: 'overview',
    target: '[data-tour="agent-feed"]',
    placement: 'right',
  },
  {
    id: 'asset-drawer',
    title: 'Click any node for context that matters',
    body:
      "I'll open FIN-DB for you. Each asset opens a type-specific drawer — database engine, recent DNS, top flow peers, neighbors, agent activity, compliance. Click 'Simulate compromise' at the bottom of any drawer to jump into Mythos pre-targeted.",
    view: 'overview',
    setup: 'open-asset-drawer',
    target: '[data-tour="asset-drawer"]',
    placement: 'left',
  },
  {
    id: 'tabs',
    title: 'Seven workflows · hover any tab for the one-liner',
    body:
      "Board CRQ shows annualized loss in dollars. Blast Radius lets you trace any asset. Breach Replay walks real Infoblox-tracked actors. Patch Risk scores CVEs against your actual network. Compliance maps PCI/HIPAA/GDPR/SOX scope. Agents is your AI team. Mythos Simulator is the differentiator — that's where we're heading.",
    view: 'overview',
    target: '[data-tour="tab-nav"]',
    placement: 'bottom',
  },
  {
    id: 'mythos-intro',
    title: 'Mythos Simulator · your continuous red team',
    body:
      "Every organization with this stack has these vulnerabilities. Most don't know which paths exist or what they cost until after the breach. Mythos picks an asset, walks the most likely compromise path, and reports impact. It runs continuously — green dot means it's working.",
    view: 'mythos',
    target: '[data-tour="mythos-hero"]',
    placement: 'bottom',
  },
  {
    id: 'mythos-sim',
    title: 'Watch a compromise play out',
    body:
      'I just kicked off a simulation on FIN-DB. Red particles trace the lateral movement. The impact report builds in real-time — assets compromised, crown jewels reached, dollars at risk, which Infoblox controls would stop it, and where this has already happened in the real world.',
    view: 'mythos',
    setup: 'run-mythos-sim',
    target: '[data-tour="mythos-impact"]',
    placement: 'left',
  },
  {
    id: 'agents',
    title: 'Ten agents on your security team',
    body:
      'Each has an identity, a defined scope, an autonomy level, and a trust score. Agents at <90% trust cannot be promoted to autonomous — that gate is enforced. Click any card for the full audit trail, scope explorer, and live autonomy slider.',
    view: 'agents',
    target: '[data-tour="agents-grid"]',
    placement: 'top',
  },
  {
    id: 'ask',
    title: 'Ask me anything · in plain English',
    body:
      "I'm Mystique — the orchestrator. When you ask a question, I route it to the right specialist. Try \"what's reachable from FIN-DB?\" — you'll see Hunter pick it up, run four tool calls, then hand off to me to summarize.",
    view: 'overview',
    setup: 'open-ask-mystique',
    target: '[data-tour="ask-panel"]',
    placement: 'left',
  },
  {
    id: 'wrap',
    title: "That's the tour. Now break things.",
    body:
      "Everything you've seen runs on data Infoblox already collects across 6,000+ enterprises. Click any node, toggle any control on Board CRQ to see ALE recompute live, run a Breach Replay against APT29 or Scattered Spider, or open Settings to walk a real AWS / Azure / Okta / CrowdStrike onboarding wizard. You can't break anything.",
    view: 'overview',
    placement: 'center',
  },
];
