import type {
  Asset,
  Edge,
  ThreatActor,
  KillChainStep,
  AgentAction,
  AgentVerdict,
  CrqSnapshot,
  Mitigation,
  InsurancePolicy,
  OrgInfo,
  DataSourceHealth,
} from '@/lib/types/twin.types';
import type { Agent, AgentActivity, AgentId, AutonomyLevel } from '@/lib/types/agent.types';

export interface AssetFilter {
  segment?: string;
  criticality?: number;
  tag?: string;
}

export interface TwinDataClient {
  getOrgInfo(): Promise<OrgInfo>;
  listAssets(filter?: AssetFilter): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset>;
  searchAssets(query: string): Promise<Asset[]>;
  getEdges(assetIds?: string[]): Promise<Edge[]>;
  listThreatActors(): Promise<ThreatActor[]>;
  getThreatActor(id: string): Promise<ThreatActor>;
  computeKillChain(actorId: string, targetAssetId?: string): Promise<KillChainStep[]>;
  computeBlastRadius(sourceAssetId: string, maxHops?: number): Promise<string[]>;
  computeInboundPaths(targetAssetId: string, maxHops?: number): Promise<string[][]>;
  listPendingAgentActions(): Promise<AgentAction[]>;
  resolveAgentAction(
    actionId: string,
    decision: 'approve' | 'reject' | 'escalate'
  ): Promise<AgentAction>;
  getCurrentCrqSnapshot(): Promise<CrqSnapshot>;
  getCrqHistory(days: number): Promise<{ date: string; ale: number }[]>;
  listMitigations(): Promise<Mitigation[]>;
  toggleMitigation(id: string, on: boolean): Promise<CrqSnapshot>;
  getInsurancePolicy(insurerId?: string): Promise<InsurancePolicy>;
  getDataSourceHealth(): Promise<DataSourceHealth[]>;
  // Agentic
  listAgents(): Promise<Agent[]>;
  getAgent(id: AgentId): Promise<Agent>;
  setAgentAutonomy(id: AgentId, level: AutonomyLevel): Promise<Agent>;
  listAgentActivities(opts?: { agentId?: AgentId; limit?: number }): Promise<AgentActivity[]>;
}
