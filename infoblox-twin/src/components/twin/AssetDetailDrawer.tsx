import { useEffect, useMemo, useState } from 'react';
import {
  IconX,
  IconCopy,
  IconActivity,
  IconArrowDownRight,
  IconArrowUpRight,
  IconBoltFilled,
  IconClock,
  IconCpu,
  IconNetwork,
  IconUser,
  IconShield,
  IconCircleFilled,
  IconChartBar,
  IconKey,
  IconUsers,
} from '@tabler/icons-react';
import { twinClient } from '@/lib/data-clients/factory';
import { iconForAsset } from '@/components/scene/assetIcon';
import { iconForAgent } from '@/lib/agent/agent-icons';
import { SEGMENT_COLORS, formatRelativeTime, formatDollars } from '@/lib/scene/colors';
import type { Asset, Edge } from '@/lib/types/twin.types';
import type { Agent, AgentActivity } from '@/lib/types/agent.types';
import { useAppStore } from '@/lib/state/store';

interface Props {
  asset: Asset | null;
  allAssets: Asset[];
  edges: Edge[];
  onClose: () => void;
}

export function AssetDetailDrawer({ asset, allAssets, edges, onClose }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const setView = useAppStore((s) => s.setView);

  useEffect(() => {
    if (!asset) return;
    twinClient.listAgents().then(setAgents);
    twinClient.listAgentActivities({ limit: 30 }).then(setActivities);
  }, [asset]);

  useEffect(() => {
    if (!asset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asset, onClose]);

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const neighbors = useMemo(() => {
    if (!asset) return { upstream: [], downstream: [] };
    const upstream: { asset: Asset; via: Edge }[] = [];
    const downstream: { asset: Asset; via: Edge }[] = [];
    for (const e of edges) {
      if (e.target === asset.id) {
        const other = allAssets.find((a) => a.id === e.source);
        if (other) upstream.push({ asset: other, via: e });
      }
      if (e.source === asset.id) {
        const other = allAssets.find((a) => a.id === e.target);
        if (other) downstream.push({ asset: other, via: e });
      }
    }
    return { upstream, downstream };
  }, [asset, edges, allAssets]);

  const assetActivities = useMemo(() => {
    if (!asset) return [];
    return activities.filter((a) => a.targets?.includes(asset.id)).slice(0, 6);
  }, [activities, asset]);

  if (!asset) return null;

  const Icon = iconForAsset(asset);
  const segColor = SEGMENT_COLORS[asset.segment];
  const isCrown = asset.criticality === 5;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-page/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative z-10 w-full max-w-[520px] h-full bg-surface border-l border-white/8 shadow-2xl flex flex-col">
        <header className="px-5 pt-4 pb-4 border-b border-white/8">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${segColor}1f`,
                  border: `1px solid ${segColor}55`,
                  color: segColor,
                }}
              >
                <Icon size={22} stroke={1.6} />
              </div>
              <div className="leading-tight min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: segColor }}
                  />
                  <span className="eyebrow capitalize">{asset.segment}</span>
                  {isCrown && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-danger/15 text-danger border border-danger/40">
                      crown jewel
                    </span>
                  )}
                </div>
                <div className="text-h2 font-medium text-text1 truncate">{asset.name}</div>
                <div className="text-[12px] text-text2">
                  {asset.vendor} {asset.model}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-text3 hover:bg-white/5 hover:text-text1 transition-colors duration-fast shrink-0"
              aria-label="Close"
            >
              <IconX size={14} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="criticality" value={`${asset.criticality}/5`} accent={isCrown ? 'danger' : asset.criticality >= 4 ? 'warning' : 'primary'} />
            <Stat label="last seen" value={formatRelativeTime(asset.lastSeen)} />
            <Stat label="sources" value={String(asset.sources.length)} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Identity card — OS, IPs, MACs */}
          <Section title="identity">
            <Row label="OS">
              <span className="font-mono text-[12px] text-text1">
                {asset.os} {asset.osVersion}
              </span>
            </Row>
            {asset.ipAddresses.length > 0 && (
              <Row label="IP">
                <span className="font-mono text-[12px] text-text1">
                  {asset.ipAddresses.join(', ')}
                </span>
              </Row>
            )}
            {asset.macAddresses.length > 0 && (
              <Row label="MAC">
                <span className="font-mono text-[11px] text-text2">
                  {asset.macAddresses.join(', ')}
                </span>
              </Row>
            )}
            <Row label="owner">
              <span className="text-[12px] text-text1">{asset.owner}</span>
            </Row>
            <Row label="location">
              <span className="text-[12px] text-text1">{asset.location}</span>
            </Row>
          </Section>

          {/* Type-aware section */}
          <TypeAwareSection asset={asset} />

          {/* Recent telemetry — DNS / flow / sessions */}
          <TelemetrySection asset={asset} />

          {/* Neighbors */}
          {(neighbors.upstream.length > 0 || neighbors.downstream.length > 0) && (
            <Section title={`neighbors (${neighbors.upstream.length + neighbors.downstream.length})`}>
              {neighbors.upstream.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] text-text3 mb-1 flex items-center gap-1">
                    <IconArrowDownRight size={10} /> inbound from
                  </div>
                  <NeighborList items={neighbors.upstream} />
                </div>
              )}
              {neighbors.downstream.length > 0 && (
                <div>
                  <div className="text-[10px] text-text3 mb-1 flex items-center gap-1">
                    <IconArrowUpRight size={10} /> reaches
                  </div>
                  <NeighborList items={neighbors.downstream} />
                </div>
              )}
            </Section>
          )}

          {/* Tags + compliance */}
          {asset.tags.length > 0 && (
            <Section title="tags + compliance">
              <div className="flex flex-wrap gap-1">
                {asset.tags.map((t) => {
                  const isCompliance = /pci|hipaa|gdpr|sox/.test(t);
                  return (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                      style={{
                        background: isCompliance ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                        color: isCompliance ? '#60a5fa' : '#a0a0b0',
                        border: `1px solid ${isCompliance ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Recent agent activity for this asset */}
          {assetActivities.length > 0 && (
            <Section title={`recent agent activity (${assetActivities.length})`}>
              <ol className="flex flex-col gap-1.5">
                {assetActivities.map((a) => {
                  const agent = agentById.get(a.agentId);
                  if (!agent) return null;
                  const AgentIcon = iconForAgent(agent.id);
                  return (
                    <li
                      key={a.id}
                      className="flex items-start gap-2 p-2 rounded-md bg-page/40 border border-white/5"
                    >
                      <span
                        className="rounded-md flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          width: 18,
                          height: 18,
                          background: `${agent.color}22`,
                          border: `1px solid ${agent.color}55`,
                          color: agent.color,
                        }}
                      >
                        <AgentIcon size={10} stroke={1.8} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="text-[11px] font-medium" style={{ color: agent.color }}>
                            {agent.name}
                          </span>
                          <span className="text-[9px] text-text3 font-mono">
                            {formatRelativeTime(a.timestamp)}
                          </span>
                        </div>
                        <div className="text-[11px] text-text1 leading-snug">{a.title}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Section>
          )}

          {/* Sources */}
          {asset.sources.length > 0 && (
            <Section title="discovered by">
              <div className="flex flex-wrap gap-1">
                {asset.sources.map((s) => (
                  <span
                    key={s}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-text2 border border-white/8"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-white/8 flex items-center justify-between gap-2 text-[11px]">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(asset.id);
            }}
            className="flex items-center gap-1 text-text3 hover:text-text1 transition-colors duration-fast"
          >
            <IconCopy size={11} />
            <span className="font-mono">{asset.id}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setView('attack-path');
                onClose();
              }}
              className="px-2.5 py-1 rounded-md bg-warning/10 hover:bg-warning/20 border border-warning/30 text-warning text-[11px] font-medium flex items-center gap-1"
            >
              <IconActivity size={11} />
              Trace blast
            </button>
            <button
              onClick={() => {
                setView('mythos');
                onClose();
              }}
              className="px-2.5 py-1 rounded-md text-white text-[11px] font-medium flex items-center gap-1"
              style={{
                background: '#1aae9f',
                border: '1px solid #1aae9f',
              }}
            >
              <IconBoltFilled size={11} />
              Simulate compromise
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-white/5 last:border-b-0">
      <span className="text-[11px] text-text3 uppercase tracking-wider">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'primary' | 'danger' | 'warning' | 'success';
}) {
  const color =
    accent === 'danger'
      ? 'text-danger'
      : accent === 'warning'
      ? 'text-warning'
      : accent === 'success'
      ? 'text-success'
      : accent === 'primary'
      ? 'text-accent2'
      : 'text-text1';
  return (
    <div className="p-2 rounded-md bg-page/40 border border-white/5">
      <div className="text-[9px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
      <div className={`font-mono text-[13px] font-medium ${color} leading-tight`}>{value}</div>
    </div>
  );
}

function NeighborList({ items }: { items: { asset: Asset; via: Edge }[] }) {
  return (
    <ol className="flex flex-col gap-0.5">
      {items.slice(0, 6).map((n, i) => (
        <li
          key={`${n.asset.id}-${i}`}
          className="flex items-center gap-2 px-2 py-1 rounded text-[11px] bg-page/30 border border-white/5"
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: SEGMENT_COLORS[n.asset.segment] }}
          />
          <span className="text-text1 truncate flex-1">{n.asset.name}</span>
          <span className="text-[9px] text-text3 font-mono uppercase">{n.via.type}</span>
        </li>
      ))}
      {items.length > 6 && (
        <li className="text-[10px] text-text3 italic px-2 py-0.5">
          + {items.length - 6} more
        </li>
      )}
    </ol>
  );
}

// ---------- Type-aware sections ----------

function TypeAwareSection({ asset }: { asset: Asset }) {
  switch (asset.type) {
    case 'database':
      return <DatabaseSection asset={asset} />;
    case 'server':
      return <ServerSection asset={asset} />;
    case 'workstation':
      return <WorkstationSection asset={asset} />;
    case 'application':
      return <ApplicationSection asset={asset} />;
    case 'network-device':
      return <NetworkDeviceSection asset={asset} />;
    case 'security-appliance':
      return <SecurityApplianceSection asset={asset} />;
    case 'ot-controller':
      return <OtSection asset={asset} />;
    case 'iot':
      return <IotSection asset={asset} />;
    case 'endpoint-pool':
      return <EndpointPoolSection asset={asset} />;
    default:
      return null;
  }
}

function DatabaseSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  return (
    <Section title="database posture">
      <Row label="engine">
        <span className="font-mono text-[12px] text-text1">{asset.vendor} {asset.model}</span>
      </Row>
      <Row label="schemas">
        <span className="font-mono text-[12px] text-text1">{8 + (seed % 14)}</span>
      </Row>
      <Row label="connected clients (24h)">
        <span className="font-mono text-[12px] text-text1">{40 + (seed % 80)}</span>
      </Row>
      <Row label="encryption at rest">
        <span className="text-[12px] text-success">enabled · AES-256</span>
      </Row>
      <Row label="audit logging">
        <span className="text-[12px] text-success">on · shipped to SOC Insights</span>
      </Row>
      <Row label="last full backup">
        <span className="text-[12px] text-text2">14h ago · Rubrik · verified</span>
      </Row>
    </Section>
  );
}

function ServerSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  return (
    <Section title="server posture">
      <Row label="uptime">
        <span className="font-mono text-[12px] text-text1">{40 + (seed % 80)}d {seed % 24}h</span>
      </Row>
      <Row label="CPU / memory">
        <span className="font-mono text-[12px] text-text1">
          {20 + (seed % 60)}% · {30 + (seed % 50)}%
        </span>
      </Row>
      <Row label="services running">
        <span className="text-[12px] text-text1">{primaryServices(asset).join(' · ')}</span>
      </Row>
      <Row label="EDR coverage">
        <span className="text-[12px] text-success">healthy · CrowdStrike 7.42</span>
      </Row>
      <Row label="patch SLA">
        <span className="font-mono text-[12px] text-text1">{2 + (seed % 12)}d behind</span>
      </Row>
    </Section>
  );
}

function WorkstationSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  const isMobile = asset.tags?.includes('mobile');
  const isLaptop = asset.tags?.includes('laptop');
  const isExec = asset.tags?.includes('exec');
  return (
    <Section title={isMobile ? 'mobile posture' : isLaptop ? 'laptop posture' : 'workstation posture'}>
      <Row label="assigned user">
        <span className="text-[12px] text-text1">{asset.owner}</span>
      </Row>
      <Row label="form factor">
        <span className="text-[12px] text-text1">
          {isMobile ? 'mobile · MDM enrolled' : isLaptop ? 'laptop · BitLocker on' : 'desktop · TPM 2.0'}
        </span>
      </Row>
      <Row label="EDR coverage">
        <span className={`text-[12px] ${asset.id === 'ast_finlap-1' ? 'text-warning' : 'text-success'}`}>
          {asset.id === 'ast_finlap-1' ? 'drifting · Defender 23d stale' : 'healthy · CrowdStrike 7.42'}
        </span>
      </Row>
      <Row label="MFA enrolment">
        <span className="text-[12px] text-success">
          {isMobile ? 'Okta Verify · biometric' : 'Okta · hardware key'}
        </span>
      </Row>
      <Row label="OS patch level">
        <span className="font-mono text-[12px] text-text1">{2 + (seed % 8)}d behind</span>
      </Row>
      <Row label="last sign-in">
        <span className="text-[12px] text-text1">{2 + (seed % 12)}h ago · {asset.location}</span>
      </Row>
      {isExec && (
        <Row label="risk profile">
          <span className="text-[12px] text-warning">exec target · monitored 24×7</span>
        </Row>
      )}
    </Section>
  );
}

function ApplicationSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  const isCloud = asset.tags?.includes('cloud') || asset.tags?.includes('workload');
  const isSaas = asset.tags?.includes('saas') || asset.os === 'SaaS';
  return (
    <Section title={isCloud ? 'cloud workload' : isSaas ? 'SaaS application' : 'application posture'}>
      <Row label="vendor">
        <span className="text-[12px] text-text1">{asset.vendor}</span>
      </Row>
      {isCloud && (
        <>
          <Row label="region">
            <span className="font-mono text-[12px] text-text1">us-east-1</span>
          </Row>
          <Row label="instance / pods">
            <span className="font-mono text-[12px] text-text1">{4 + (seed % 12)} replicas</span>
          </Row>
          <Row label="VPC">
            <span className="font-mono text-[12px] text-text1">vpc-acme-prod-{1000 + (seed % 9999)}</span>
          </Row>
          <Row label="IAM role">
            <span className="font-mono text-[11px] text-text2 truncate">
              arn:aws:iam::861234567890:role/acme-{asset.id.replace('ast_', '')}
            </span>
          </Row>
        </>
      )}
      {isSaas && (
        <>
          <Row label="tenant / org">
            <span className="font-mono text-[12px] text-text1">acme-corp</span>
          </Row>
          <Row label="user count">
            <span className="font-mono text-[12px] text-text1">{1200 + (seed % 3000)}</span>
          </Row>
          <Row label="SSO">
            <span className="text-[12px] text-success">Okta · enforced</span>
          </Row>
        </>
      )}
      <Row label="version">
        <span className="font-mono text-[12px] text-text1">{asset.osVersion}</span>
      </Row>
    </Section>
  );
}

function NetworkDeviceSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  return (
    <Section title="network device">
      <Row label="role">
        <span className="text-[12px] text-text1">
          {asset.name.toLowerCase().includes('dns') ? 'DNS resolver / grid master' : asset.name.toLowerCase().includes('dhcp') ? 'DHCP authority' : asset.name.toLowerCase().includes('core') ? 'core switch · MLAG pair' : asset.name.toLowerCase().includes('internet') ? 'internet edge / DDoS scrub' : 'network device'}
        </span>
      </Row>
      <Row label="ports / interfaces">
        <span className="font-mono text-[12px] text-text1">{8 + (seed % 56)} active</span>
      </Row>
      <Row label="throughput (24h avg)">
        <span className="font-mono text-[12px] text-text1">{2 + (seed % 38)} Gbps</span>
      </Row>
      <Row label="ACL count">
        <span className="font-mono text-[12px] text-text1">{40 + (seed % 200)}</span>
      </Row>
      <Row label="config drift">
        <span className="text-[12px] text-success">none</span>
      </Row>
    </Section>
  );
}

function SecurityApplianceSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  return (
    <Section title="security appliance">
      <Row label="policy version">
        <span className="font-mono text-[12px] text-text1">2026.05.{seed % 30}</span>
      </Row>
      <Row label="signatures (24h delta)">
        <span className="font-mono text-[12px] text-success">+ {seed % 18} new</span>
      </Row>
      <Row label="blocks (24h)">
        <span className="font-mono text-[12px] text-text1">{(seed % 80) * 12}</span>
      </Row>
      <Row label="false-positive rate">
        <span className="font-mono text-[12px] text-success">0.{seed % 9}%</span>
      </Row>
    </Section>
  );
}

function OtSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  return (
    <Section title="OT controller">
      <Row label="vendor / firmware">
        <span className="text-[12px] text-text1">
          {asset.vendor} · {asset.osVersion}
        </span>
      </Row>
      <Row label="protocol">
        <span className="font-mono text-[12px] text-text1">
          {asset.vendor === 'Siemens' ? 'OPC-UA · S7Comm' : 'EtherNet/IP · CIP'}
        </span>
      </Row>
      <Row label="production line">
        <span className="text-[12px] text-text1">
          {asset.name.toLowerCase().includes('plc') ? `Line ${seed % 9 + 1}` : 'Genovax · Line A'}
        </span>
      </Row>
      <Row label="safety class">
        <span className="text-[12px] text-warning">SIL-2 · safety-critical</span>
      </Row>
      <Row label="firmware age">
        <span className="font-mono text-[12px] text-warning">{280 + (seed % 200)} days</span>
      </Row>
      <Row label="last batch">
        <span className="text-[12px] text-text1">Genovax · {seed % 30 + 1}h ago</span>
      </Row>
    </Section>
  );
}

function IotSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  const isPrinter = asset.tags?.includes('printer');
  return (
    <Section title={isPrinter ? 'printer fleet' : 'IoT device'}>
      {isPrinter ? (
        <>
          <Row label="model">
            <span className="text-[12px] text-text1">{asset.vendor} {asset.model}</span>
          </Row>
          <Row label="fleet size">
            <span className="font-mono text-[12px] text-text1">{42 + (seed % 60)} devices</span>
          </Row>
          <Row label="firmware">
            <span className="font-mono text-[12px] text-text1">{asset.osVersion}</span>
          </Row>
          <Row label="open services">
            <span className="font-mono text-[12px] text-warning">SNMP · JetDirect</span>
          </Row>
        </>
      ) : (
        <>
          <Row label="model">
            <span className="text-[12px] text-text1">{asset.vendor} {asset.model}</span>
          </Row>
          <Row label="measurement range">
            <span className="font-mono text-[12px] text-text1">0–{20 + (seed % 80)} bar</span>
          </Row>
          <Row label="sampling rate">
            <span className="font-mono text-[12px] text-text1">{1 + (seed % 9)}0 Hz</span>
          </Row>
          <Row label="reports to">
            <span className="text-[12px] text-text1">PLC line 1 · MFG-SCADA</span>
          </Row>
        </>
      )}
    </Section>
  );
}

function EndpointPoolSection({ asset }: { asset: Asset }) {
  const seed = hashSeed(asset.id);
  const total = 420 + (seed % 1500);
  const covered = Math.round(total * (0.93 + ((seed % 6) / 100)));
  const pct = Math.round((covered / total) * 100);
  return (
    <Section title="endpoint pool">
      <Row label="total devices">
        <span className="font-mono text-[12px] text-text1">{total.toLocaleString()}</span>
      </Row>
      <Row label="EDR coverage">
        <span className={`font-mono text-[12px] ${pct >= 97 ? 'text-success' : 'text-warning'}`}>
          {covered.toLocaleString()} / {total.toLocaleString()} · {pct}%
        </span>
      </Row>
      <Row label="patch SLA (mean)">
        <span className="font-mono text-[12px] text-text1">{5 + (seed % 12)}d behind</span>
      </Row>
      <Row label="OS mix">
        <span className="text-[12px] text-text1">macOS 62% · Win 36% · Linux 2%</span>
      </Row>
      <Row label="phishing-click rate (30d)">
        <span className="font-mono text-[12px] text-success">0.{1 + (seed % 4)}%</span>
      </Row>
    </Section>
  );
}

function TelemetrySection({ asset }: { asset: Asset }) {
  const dnsSeed = hashSeed(asset.id + 'dns');
  const flowSeed = hashSeed(asset.id + 'flow');
  // Generate plausible top-5 DNS queries
  const dnsQueries = sampleDnsQueries(asset, dnsSeed);
  const flowPeers = sampleFlowPeers(asset, flowSeed);
  return (
    <>
      {dnsQueries.length > 0 && (
        <Section title="recent DNS (last 1h)">
          <ol className="flex flex-col gap-0.5">
            {dnsQueries.map((q, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 py-0.5 text-[11px] font-mono"
              >
                <span className="text-text1 truncate">{q.domain}</span>
                <span className="text-text3 shrink-0">{q.count}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}
      {flowPeers.length > 0 && (
        <Section title="top flow peers (24h)">
          <ol className="flex flex-col gap-0.5">
            {flowPeers.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 py-0.5 text-[11px]"
              >
                <span className="text-text1 truncate">{p.host}</span>
                <span className="text-text3 shrink-0 font-mono">{p.bytes}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </>
  );
}

// ---------- helpers ----------

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function primaryServices(asset: Asset): string[] {
  const name = asset.name.toLowerCase();
  if (name.includes('ad')) return ['LDAPS', 'Kerberos', 'DNS', 'GC'];
  if (name.includes('eng-jump') || name.includes('build')) return ['SSH', 'HTTPS', 'docker'];
  if (name.includes('file')) return ['SMB', 'NFS'];
  if (name.includes('backup')) return ['HTTPS', 'iSCSI'];
  if (name.includes('vpn')) return ['IPsec', 'SSL-VPN'];
  return ['HTTPS', 'agent-telemetry'];
}

function sampleDnsQueries(
  asset: Asset,
  seed: number
): { domain: string; count: number }[] {
  const base: string[] = [];
  if (asset.segment === 'finance')
    base.push('login.salesforce.com', 'auth.workday.com', 'oraclecloud.com');
  if (asset.segment === 'identity')
    base.push('login.microsoftonline.com', 'okta.com', 'pki.acme.local');
  if (asset.segment === 'engineering')
    base.push('github.com', 'registry.npmjs.org', 'amazonaws.com');
  if (asset.segment === 'sales')
    base.push('salesforce.com', 'hubspot.com', 'pardot.com');
  if (asset.segment === 'it')
    base.push('acme.local', 'csp.infoblox.com', 'ad.acme.local');
  if (asset.segment === 'ot')
    base.push('siemens.com', 'rockwellautomation.com', 'mfg-scada.acme.local');
  base.push('pool.ntp.org', 'crl.microsoft.com');
  return base.slice(0, 5).map((d, i) => ({
    domain: d,
    count: 12 + ((seed + i) % 240),
  }));
}

function sampleFlowPeers(
  asset: Asset,
  seed: number
): { host: string; bytes: string }[] {
  // Pick some plausible peers
  const peers: string[] = [];
  if (asset.segment === 'finance') peers.push('FIN-DB', 'SAP-PROD', 'AD-PRIMARY');
  if (asset.segment === 'identity') peers.push('Endpoints — Finance', 'Endpoints — Eng', 'M365');
  if (asset.segment === 'engineering') peers.push('GIT-PRIMARY', 'BUILD-SVR', 'AWS Org');
  if (asset.segment === 'it') peers.push('AD-PRIMARY', 'File server', 'Backup vault');
  if (asset.segment === 'ot') peers.push('PLC line 1', 'PLC line 2', 'HMI station 1');
  if (asset.segment === 'sales') peers.push('CRM-APP', 'CRM-DB', 'AD-PRIMARY');
  if (asset.segment === 'external') peers.push('Internet edge', 'Firewall');
  return peers.slice(0, 4).map((p, i) => ({
    host: p,
    bytes: `${1 + ((seed + i) % 99)}.${(seed + i * 7) % 10} GB`,
  }));
}
