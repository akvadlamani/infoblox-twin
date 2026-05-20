import type { TwinDataClient } from './interface';
import { MockClient } from './mock-client';
import { RealClient } from './real-client';

function createClient(): TwinDataClient {
  const source = (import.meta.env.VITE_TWIN_DATA_SOURCE as string | undefined) ?? 'mock';
  if (source === 'live') {
    return new RealClient({
      uaiBaseUrl: 'https://csp.infoblox.com/api/uai/v1',
      tdBaseUrl: 'https://csp.infoblox.com/api/atcfw/v1',
      tideBaseUrl: 'https://csp.infoblox.com/api/tide/v1',
      sciBaseUrl: 'https://csp.infoblox.com/api/sci/v1',
      apiKey: (import.meta.env.VITE_INFOBLOX_API_KEY as string | undefined) ?? '',
    });
  }
  return new MockClient();
}

export const twinClient: TwinDataClient = createClient();

export const DATA_MODE: 'mock' | 'live' | 'hybrid' =
  ((import.meta.env.VITE_TWIN_DATA_SOURCE as string | undefined) ?? 'mock') as
    | 'mock'
    | 'live'
    | 'hybrid';
