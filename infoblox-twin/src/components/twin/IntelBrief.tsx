import { useAppStore } from '@/lib/state/store';
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconArrowRight,
  IconAlertTriangle,
  IconShield,
  IconBandage,
  IconRoute,
  IconClipboardCheck,
  IconShieldBolt,
  IconCircleCheck,
  IconBolt,
} from '@tabler/icons-react';

interface Bullet {
  kind: 'good' | 'warn' | 'bad' | 'neutral';
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  text: React.ReactNode;
}

interface JumpCard {
  to: 'attack-path' | 'aev' | 'patch-risk' | 'compliance' | 'agent-iez' | 'crq';
  title: string;
  detail: string;
  cta: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

const BULLETS: Bullet[] = [
  {
    kind: 'bad',
    icon: IconAlertTriangle,
    text: (
      <>
        <strong>FIN-DB</strong> has 5 new inbound paths since yesterday — driven by 2 new finance laptops
        and a freshly-aged Savvy Seahorse lookalike.
      </>
    ),
  },
  {
    kind: 'warn',
    icon: IconBandage,
    text: (
      <>
        <strong>4 of 6 open CVEs</strong> are past your patch SLA. CVE-2026-29911 on AD-PRIMARY hits 89
        on Twin risk — patch now.
      </>
    ),
  },
  {
    kind: 'good',
    icon: IconShield,
    text: (
      <>
        Threat Defense blocked <strong>11 of 12</strong> Vigorish Viper phishing attempts pre-delivery.
        One endpoint drift — finance pool.
      </>
    ),
  },
  {
    kind: 'neutral',
    icon: IconClipboardCheck,
    text: (
      <>
        <strong>3 assets</strong> drifted into your PCI-DSS scope this week and 1 drifted out. Confirm
        scope before audit.
      </>
    ),
  },
];

const JUMP_CARDS: JumpCard[] = [
  {
    to: 'attack-path',
    title: 'See blast radius',
    detail: 'Click any asset, see what an attacker reaches and what it costs.',
    cta: 'Open',
    icon: IconRoute,
  },
  {
    to: 'aev',
    title: 'Replay a breach',
    detail: 'Walk Vigorish Viper, VexTrio, Savvy Seahorse, or Decoy Dog hop-by-hop.',
    cta: 'Replay',
    icon: IconBolt,
  },
  {
    to: 'patch-risk',
    title: 'Score this week’s patches',
    detail: '6 open CVEs scored against how your network actually behaves.',
    cta: 'Triage',
    icon: IconBandage,
  },
  {
    to: 'compliance',
    title: 'Audit scope without drift',
    detail: 'PCI, HIPAA, GDPR, SOX zones mapped continuously.',
    cta: 'Open',
    icon: IconClipboardCheck,
  },
  {
    to: 'agent-iez',
    title: 'Vet an agent action',
    detail: '4 IBIQ proposals waiting — see Twin verdict before production.',
    cta: 'Review',
    icon: IconShieldBolt,
  },
];

const KIND_STYLE: Record<Bullet['kind'], string> = {
  good: 'text-success',
  warn: 'text-warning',
  bad: 'text-danger',
  neutral: 'text-text2',
};

export function IntelBrief() {
  const setView = useAppStore((s) => s.setView);
  const username = useAppStore((s) => s.username);

  return (
    <div className="absolute top-[110px] left-5 z-20 w-[360px] max-h-[calc(100vh-160px)] overflow-y-auto pr-1 scrollbar-hide">
      <div className="rounded-xl bg-surface/85 border border-white/8 backdrop-blur-md">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-baseline justify-between mb-1">
            <div className="eyebrow">overnight brief</div>
            <span className="text-[10px] font-mono text-text3">9:24 am</span>
          </div>
          <div className="text-h2 font-medium text-text1 mb-1">
            Good morning, {username || 'admin'}.
          </div>
          <p className="text-[12px] text-text2 leading-snug">
            Twin fused DNS, flow, identity, cloud, and EDR signals overnight. Four things need a
            decision today.
          </p>
        </div>

        <div className="border-t border-white/5">
          {BULLETS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 px-4 py-2.5 ${
                  i < BULLETS.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <Icon size={13} className={`mt-0.5 shrink-0 ${KIND_STYLE[b.kind]}`} />
                <span className="text-[12px] text-text2 leading-snug">{b.text}</span>
              </div>
            );
          })}
        </div>

        <div className="px-4 pt-3 pb-3 border-t border-white/5">
          <div className="eyebrow mb-2">act on it</div>
          <div className="flex flex-col gap-1">
            {JUMP_CARDS.map((j) => {
              const Icon = j.icon;
              return (
                <button
                  key={j.to}
                  onClick={() => setView(j.to)}
                  className="text-left -mx-1 px-2 py-2 rounded-md hover:bg-white/5 transition-colors duration-fast flex items-center gap-2.5 group"
                >
                  <Icon size={13} className="text-accent2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-text1 leading-tight">{j.title}</div>
                    <div className="text-[10px] text-text3 leading-snug">{j.detail}</div>
                  </div>
                  <IconArrowRight
                    size={12}
                    className="text-text3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Small helpers re-exported for callers that want the styled chip
export function DeltaChip({ value }: { value: number }) {
  const positive = value > 0;
  const Icon = positive ? IconArrowUpRight : IconArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
        positive ? 'text-danger' : 'text-success'
      }`}
    >
      <Icon size={10} />
      {Math.abs(Math.round(value * 100))}%
    </span>
  );
}

export function CheckChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-success">
      <IconCircleCheck size={10} />
      {label}
    </span>
  );
}
