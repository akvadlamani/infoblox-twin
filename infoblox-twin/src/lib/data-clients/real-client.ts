import type { TwinDataClient } from './interface';

export interface RealClientConfig {
  uaiBaseUrl: string;
  tdBaseUrl: string;
  tideBaseUrl: string;
  sciBaseUrl: string;
  niosBaseUrl?: string;
  apiKey: string;
}

function notImpl(method: string): never {
  throw new Error(`RealClient.${method} not implemented in v1.`);
}

export class RealClient implements TwinDataClient {
  constructor(private readonly _config: RealClientConfig) {}
  async getOrgInfo() { return notImpl('getOrgInfo'); }
  async listAssets() { return notImpl('listAssets'); }
  async getAsset() { return notImpl('getAsset'); }
  async searchAssets() { return notImpl('searchAssets'); }
  async getEdges() { return notImpl('getEdges'); }
  async listThreatActors() { return notImpl('listThreatActors'); }
  async getThreatActor() { return notImpl('getThreatActor'); }
  async computeKillChain() { return notImpl('computeKillChain'); }
  async computeBlastRadius() { return notImpl('computeBlastRadius'); }
  async computeInboundPaths() { return notImpl('computeInboundPaths'); }
  async listPendingAgentActions() { return notImpl('listPendingAgentActions'); }
  async resolveAgentAction() { return notImpl('resolveAgentAction'); }
  async getCurrentCrqSnapshot() { return notImpl('getCurrentCrqSnapshot'); }
  async getCrqHistory() { return notImpl('getCrqHistory'); }
  async listMitigations() { return notImpl('listMitigations'); }
  async toggleMitigation() { return notImpl('toggleMitigation'); }
  async getInsurancePolicy() { return notImpl('getInsurancePolicy'); }
  async getDataSourceHealth() { return notImpl('getDataSourceHealth'); }
}
