import { useMemo, useState } from 'react';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useAppStore } from '@/lib/state/store';
import { CONNECTORS, CONNECTOR_ORDER } from '@/lib/onboarding/connectors';
import type { Connector } from '@/lib/onboarding/connectors';
import {
  IconCircleFilled,
  IconCircleCheck,
  IconAlertTriangle,
  IconCloud,
  IconShield,
  IconDeviceDesktop,
  IconBuildingFactory2,
  IconKey,
  IconBriefcase,
  IconBug,
  IconRefresh,
  IconArrowRight,
  IconSettings,
} from '@tabler/icons-react';

type Status = 'connected' | 'degraded' | 'disabled';

interface SourceState {
  id: string;
  connectorId?: string; // when present, "Connect" launches the wizard
  name: string;
  vendor: string;
  description: string;
  category: 'identity' | 'endpoint' | 'network' | 'cloud' | 'threat-intel' | 'cmdb' | 'ot';
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  enabled: boolean;
  status: Status;
  lastSync: string;
  assetsContributed: number;
}

const INITIAL: SourceState[] = [
  // Network & DNS / IPAM — already-wired Infoblox sources
  {
    id: 'uai',
    name: 'Universal Asset Insights',
    vendor: 'Infoblox',
    description:
      'Inside-out asset discovery via DNS, DHCP, IPAM, and device telemetry. The substrate the Twin is built on.',
    category: 'network',
    icon: IconCloud,
    enabled: true,
    status: 'connected',
    lastSync: '2 min ago',
    assetsContributed: 51,
  },
  {
    id: 'nios',
    name: 'NIOS DDI',
    vendor: 'Infoblox',
    description:
      'DNS, DHCP, IPAM grid data — every lease, every record, every IP block.',
    category: 'network',
    icon: IconCloud,
    enabled: true,
    status: 'connected',
    lastSync: '1 min ago',
    assetsContributed: 48,
  },
  {
    id: 'flow-collector',
    name: 'NetFlow / IPFIX collector',
    vendor: 'Infoblox',
    description:
      'Flow telemetry from your routers and switches. Confirms which assets actually talk to each other, not just which ones could.',
    category: 'network',
    icon: IconCloud,
    enabled: true,
    status: 'connected',
    lastSync: '40 sec ago',
    assetsContributed: 0,
  },
  // Threat intel
  {
    id: 'infoblox_csp',
    connectorId: 'infoblox_csp',
    name: 'Infoblox CSP (TD + TIDE + SOC Insights)',
    vendor: 'Infoblox',
    description:
      'BloxOne Threat Defense detections, TIDE indicators, and SOC Insights — which correlates DNS queries with the asset that resolved them and the user who was signed in — through a single CSP API key.',
    category: 'threat-intel',
    icon: IconShield,
    enabled: false,
    status: 'disabled',
    lastSync: '—',
    assetsContributed: 0,
  },
  // Endpoint
  {
    id: 'crowdstrike',
    connectorId: 'crowdstrike',
    name: 'CrowdStrike Falcon',
    vendor: 'CrowdStrike',
    description:
      'Endpoint telemetry. Confirms presence and health of endpoint coverage on every workstation, laptop, and server.',
    category: 'endpoint',
    icon: IconDeviceDesktop,
    enabled: true,
    status: 'connected',
    lastSync: '3 min ago',
    assetsContributed: 22,
  },
  {
    id: 'defender',
    connectorId: 'defender',
    name: 'Microsoft Defender for Endpoint',
    vendor: 'Microsoft',
    description:
      'Machines, alerts, software vulnerabilities, and recommendations from your Defender tenant.',
    category: 'endpoint',
    icon: IconDeviceDesktop,
    enabled: false,
    status: 'disabled',
    lastSync: '—',
    assetsContributed: 0,
  },
  // Identity
  {
    id: 'okta',
    connectorId: 'okta',
    name: 'Okta Workforce Identity',
    vendor: 'Okta',
    description:
      'Users, groups, MFA factors, applications, system log. Identity context for every asset.',
    category: 'identity',
    icon: IconKey,
    enabled: true,
    status: 'connected',
    lastSync: '1 min ago',
    assetsContributed: 6,
  },
  {
    id: 'ad',
    name: 'Active Directory',
    vendor: 'Microsoft',
    description: 'On-prem identity. Maps users to workstations and service accounts to applications.',
    category: 'identity',
    icon: IconKey,
    enabled: true,
    status: 'connected',
    lastSync: '5 min ago',
    assetsContributed: 14,
  },
  // CMDB
  {
    id: 'servicenow',
    connectorId: 'servicenow',
    name: 'ServiceNow CMDB',
    vendor: 'ServiceNow',
    description:
      'Authoritative CI ownership, support groups, change records — pinned to every asset in the graph.',
    category: 'cmdb',
    icon: IconBriefcase,
    enabled: true,
    status: 'degraded',
    lastSync: '47 min ago',
    assetsContributed: 38,
  },
  // Cloud
  {
    id: 'aws',
    connectorId: 'aws',
    name: 'AWS Organization',
    vendor: 'Amazon Web Services',
    description:
      'Cross-account discovery via Resource Graph, Config, CloudTrail, GuardDuty, and IAM.',
    category: 'cloud',
    icon: IconCloud,
    enabled: true,
    status: 'connected',
    lastSync: '2 min ago',
    assetsContributed: 4,
  },
  {
    id: 'azure',
    connectorId: 'azure',
    name: 'Microsoft Azure + Entra ID',
    vendor: 'Microsoft',
    description:
      'Subscriptions, workloads, Entra users and conditional-access policy state.',
    category: 'cloud',
    icon: IconCloud,
    enabled: false,
    status: 'disabled',
    lastSync: '—',
    assetsContributed: 0,
  },
  // OT
  {
    id: 'ot-discovery',
    name: 'Claroty xDome',
    vendor: 'Claroty',
    description:
      'Passive OT/ICS asset and protocol discovery. SCADA, PLCs, HMIs, field sensors.',
    category: 'ot',
    icon: IconBuildingFactory2,
    enabled: true,
    status: 'connected',
    lastSync: '7 min ago',
    assetsContributed: 7,
  },
];

const CATEGORY_LABEL: Record<SourceState['category'], string> = {
  identity: 'Identity',
  endpoint: 'Endpoint',
  network: 'Network · DNS · flow · IPAM',
  cloud: 'Cloud',
  'threat-intel': 'Threat intel',
  cmdb: 'CMDB',
  ot: 'OT / ICS',
};

const CATEGORY_ORDER: SourceState['category'][] = [
  'network',
  'threat-intel',
  'endpoint',
  'identity',
  'cloud',
  'cmdb',
  'ot',
];

export function SettingsView() {
  const [sources, setSources] = useState(INITIAL);
  const [openConnector, setOpenConnector] = useState<Connector | null>(null);
  const narratorText = useAppStore((s) => s.narratorText);

  const grouped = useMemo(() => {
    const m: Record<string, SourceState[]> = {};
    for (const s of sources) {
      (m[s.category] ??= []).push(s);
    }
    return m;
  }, [sources]);

  const counts = {
    connected: sources.filter((s) => s.status === 'connected').length,
    degraded: sources.filter((s) => s.status === 'degraded').length,
    disabled: sources.filter((s) => s.status === 'disabled').length,
    assets: sources.reduce((n, s) => n + s.assetsContributed, 0),
  };

  function handleConnect(s: SourceState) {
    if (!s.connectorId) {
      // toggle inline
      setSources((arr) =>
        arr.map((x) =>
          x.id === s.id
            ? {
                ...x,
                enabled: !x.enabled,
                status: !x.enabled ? 'connected' : 'disabled',
                lastSync: !x.enabled ? 'just now' : '—',
              }
            : x
        )
      );
      return;
    }
    const c = CONNECTORS[s.connectorId];
    if (c) setOpenConnector(c);
  }

  function handleConnected(connectorId: string) {
    setSources((arr) =>
      arr.map((x) =>
        x.connectorId === connectorId
          ? {
              ...x,
              enabled: true,
              status: 'connected',
              lastSync: 'just now',
              assetsContributed: x.assetsContributed || estimatedAssets(connectorId),
            }
          : x
      )
    );
    setOpenConnector(null);
  }

  return (
    <div className="absolute inset-0 pt-[100px] pb-36 overflow-y-auto">
      <div className="max-w-[1080px] mx-auto px-6">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="eyebrow">settings</div>
            <h1 className="text-h1 font-medium text-text1 flex items-center gap-2">
              <IconSettings size={16} className="text-text3" />
              Discovery sources
            </h1>
            <p className="text-small text-text2 max-w-[620px] mt-1 leading-relaxed">
              Twin connects to the systems you already run — DNS, flow, cloud, identity, EDR, OT —
              and assembles the graph from real data. Toggle any source on or off; "Connect" walks
              you through the vendor's actual API setup.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 min-w-[460px]">
            <Stat label="connected" value={counts.connected} tone="success" />
            <Stat label="degraded" value={counts.degraded} tone="warning" />
            <Stat label="disabled" value={counts.disabled} tone="muted" />
            <Stat label="assets fed" value={counts.assets} tone="primary" />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <section key={cat}>
              <div className="eyebrow mb-2 px-1">{CATEGORY_LABEL[cat]}</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {grouped[cat]
                  .slice()
                  // Order: pre-defined connectors first if matching CONNECTOR_ORDER, then others
                  .sort((a, b) => {
                    const ai = CONNECTOR_ORDER.indexOf(a.connectorId || '');
                    const bi = CONNECTOR_ORDER.indexOf(b.connectorId || '');
                    if (ai === -1 && bi === -1) return 0;
                    if (ai === -1) return 1;
                    if (bi === -1) return -1;
                    return ai - bi;
                  })
                  .map((src) => {
                    const Icon = src.icon;
                    const launchable = !!src.connectorId;
                    return (
                      <div
                        key={src.id}
                        className={`p-4 rounded-lg border transition-colors duration-fast ${
                          src.enabled
                            ? 'bg-surface/60 border-white/8'
                            : 'bg-surface/30 border-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <div className="h-9 w-9 rounded-md bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                            <Icon size={16} className="text-accent2" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 mb-0.5">
                              <div className="text-body font-medium text-text1 truncate">
                                {src.name}
                              </div>
                              <StatusPill status={src.status} />
                            </div>
                            <div className="text-[11px] text-text3">{src.vendor}</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-text2 leading-snug mb-3 ml-12">
                          {src.description}
                        </div>
                        <div className="ml-12 flex items-center gap-3 text-[10px] text-text3 font-mono">
                          <span className="flex items-center gap-1">
                            <IconRefresh size={10} />
                            last sync {src.lastSync}
                          </span>
                          <span>·</span>
                          <span>
                            <span className="text-text1">{src.assetsContributed}</span> assets fed
                          </span>
                          {launchable ? (
                            <button
                              onClick={() => handleConnect(src)}
                              className="ml-auto flex items-center gap-1 text-accent2 hover:text-accent hover:underline normal-case"
                            >
                              {src.enabled ? 'Reconfigure' : 'Connect'}
                              <IconArrowRight size={11} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnect(src)}
                              role="switch"
                              aria-checked={src.enabled}
                              className={`ml-auto relative h-5 w-9 rounded-full transition-colors duration-fast ${
                                src.enabled ? 'bg-success' : 'bg-white/15'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-base ${
                                  src.enabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-7 p-4 rounded-lg bg-surface/40 border border-white/5 text-[11px] text-text3 leading-snug">
          <span className="text-text2 font-medium">Looking for an integration we don't list?</span> If
          it resolves a DNS query, generates a flow, holds an identity, or runs a workload, Twin can
          ingest it. Drop a note in the customer portal and we'll wire it in.
        </div>
      </div>

      <NarratorStrip text={narratorText} />

      {openConnector && (
        <OnboardingWizard
          connector={openConnector}
          onClose={() => setOpenConnector(null)}
          onConnected={(id) => handleConnected(id)}
        />
      )}
    </div>
  );
}

function estimatedAssets(connectorId: string): number {
  switch (connectorId) {
    case 'aws':
      return 8;
    case 'azure':
      return 6;
    case 'defender':
      return 18;
    case 'okta':
      return 6;
    case 'crowdstrike':
      return 22;
    case 'infoblox_csp':
      return 0;
    case 'servicenow':
      return 38;
    default:
      return 0;
  }
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'muted' | 'primary';
}) {
  const color =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
      ? 'text-warning'
      : tone === 'primary'
      ? 'text-accent2'
      : 'text-text3';
  return (
    <div className="p-3 rounded-lg bg-surface/60 border border-white/5">
      <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
      <div className={`font-mono text-h1 font-medium ${color} leading-none`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map = {
    connected: {
      fg: 'text-success',
      bg: 'bg-success/15 border-success/40',
      icon: IconCircleCheck,
      label: 'connected',
    },
    degraded: {
      fg: 'text-warning',
      bg: 'bg-warning/15 border-warning/40',
      icon: IconAlertTriangle,
      label: 'degraded',
    },
    disabled: {
      fg: 'text-text3',
      bg: 'bg-white/5 border-white/10',
      icon: IconCircleFilled,
      label: 'not connected',
    },
  } as const;
  const m = map[status];
  const Icon = m.icon;
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border flex items-center gap-1 ${m.fg} ${m.bg}`}
    >
      <Icon size={9} />
      {m.label}
    </span>
  );
}
