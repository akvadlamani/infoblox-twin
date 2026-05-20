/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TWIN_DATA_SOURCE?: 'mock' | 'live' | 'hybrid';
  readonly VITE_INFOBLOX_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
