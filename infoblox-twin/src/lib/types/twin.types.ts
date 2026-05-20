export type Segment =
  | 'external'
  | 'identity'
  | 'finance'
  | 'engineering'
  | 'sales'
  | 'it'
  | 'ot'
  | 'endpoint';

export type AssetType =
  | 'workstation'
  | 'server'
  | 'database'
  | 'iot'
  | 'ot-controller'
  | 'application'
  | 'network-device'
  | 'security-appliance'
  | 'endpoint-pool';

export interface Asset {
  id: string;
  name: string;
  segment: Segment;
  criticality: 0 | 1 | 2 | 3 | 4 | 5;
  type: AssetType;
  vendor: string;
  model: string;
  os: string;
  osVersion: string;
  ipAddresses: string[];
  macAddresses: string[];
  firstSeen: string;
  lastSeen: string;
  sources: string[];
  owner: string;
  location: string;
  position3D: { x: number; y: number; z: number };
  tags: string[];
}

export type EdgeType = 'dns' | 'identity' | 'network' | 'data-flow' | 'trust';

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
  protocols?: string[];
  observed: boolean;
}

export type ThreatActorFamily = 'aitm' | 'banking-trojan' | 'apt' | 'commodity-malware';
export type TwinDisposition = 'blocked' | 'observed' | 'contained' | 'manual';
export type InfobloxControl =
  | 'td'
  | 'dns-armor'
  | 'soc-insights'
  | 'agentic-takedown'
  | 'cyber-911'
  | 'inflight'
  | 'none';

export interface KillChainStep {
  id: string;
  order: number;
  timeLabel: string;
  technique: string;
  mitreId?: string;
  sourceAsset: string; // or 'external'
  targetAsset: string;
  iconName: string;
  description: string;
  disposition: TwinDisposition;
  explanation: string;
  control: InfobloxControl;
}

export interface ThreatActor {
  id: string;
  name: string;
  family: ThreatActorFamily;
  origin?: string;
  tigSource: string;
  mitreTactics: string[];
  lastObserved: string;
  campaignCount: number;
  description: string;
  killChainTemplate: KillChainStep[];
  iocs?: string[];
}

export type AgentVerdict = 'safe' | 'unsafe' | 'safe-with-audit';
export type AgentStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export interface AgentSimulationResult {
  verdict: AgentVerdict;
  dependenciesAffected: number;
  usersAffected: number;
  servicesRerouted: number;
  rationale: string;
  confidence: number;
}

export interface AgentAction {
  id: string;
  agentName: string;
  // Identity ref into the agent roster — UI uses this to render the badge.
  agentId?: 'sentinel' | 'triage' | 'hunter' | 'scope' | 'pilot' | 'sandbox' | 'action' | 'takedown' | 'brief';
  proposedAt: string;
  description: string;
  // Optional human-readable rationale for the proposal.
  rationale?: string;
  targetAssetIds: string[];
  simulation: AgentSimulationResult;
  status: AgentStatus;
}

export type MitigationType = 'control' | 'segmentation' | 'patch' | 'policy';

export interface Mitigation {
  id: string;
  name: string;
  type: MitigationType;
  setupCost: number;
  annualCost: number;
  expectedRiskReduction: number;
  affectedScenarios: string[];
  product?: InfobloxControl;
  status: 'active' | 'inactive';
}

export interface RiskScenario {
  id: string;
  name: string;
  threatActorId: string;
  primaryTargetAssetId: string;
  expectedLoss: number;
  annualProbability: number;
  ale: number;
  trend30d: number; // -0.12 = down 12%
  topMitigations: string[];
  description: string;
}

export interface MdpInputAction {
  id: string;
  name: string;
  probability: number;
  reward: number;
}

export interface CrqSnapshot {
  timestamp: string;
  totalAle: number;
  topScenarios: RiskScenario[];
  activeControls: string[];
  mdpInputs: {
    eventsPerMonth: number;
    actions: MdpInputAction[];
  };
}

export interface InsurancePolicy {
  insurerId: string;
  insurerName: string;
  insuredOrg: string;
  policyId: string;
  basePremium: number;
  twinRiskDelta: number;
  netPremium: number;
  twinSignals: string[];
  recommendedActions: { mitigationId: string; premiumDelta: number; label: string }[];
  lossRatioImpact: number;
  revSharePct: number;
}

export interface OrgInfo {
  name: string;
  assetCount: number;
  lastSyncAt: string;
}

export interface DataSourceHealth {
  source: string;
  healthy: boolean;
  lastSyncAt: string;
  error: string | null;
}

export type ViewName =
  | 'overview'
  | 'aev'
  | 'attack-path'
  | 'patch-risk'
  | 'compliance'
  | 'agent-iez'
  | 'agents'
  | 'crq'
  | 'settings';

export type Persona = 'ciso' | 'cro';
