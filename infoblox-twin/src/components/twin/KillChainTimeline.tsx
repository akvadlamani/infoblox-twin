import {
  IconWorld,
  IconMail,
  IconMouse,
  IconLock,
  IconDatabase,
  IconShieldOff,
  IconKey,
  IconCreditCard,
  IconArrowsUp,
  IconFolderOpen,
  IconCloud,
  IconEye,
  IconPackageExport,
  IconBug,
  IconDownload,
} from '@tabler/icons-react';
import type { KillChainStep } from '@/lib/types/twin.types';

type IconCmp = React.ComponentType<{ size?: number | string; className?: string }>;

const ICON_MAP: Record<string, IconCmp> = {
  'ti-world': IconWorld,
  'ti-mail': IconMail,
  'ti-mouse': IconMouse,
  'ti-lock': IconLock,
  'ti-database': IconDatabase,
  'ti-shield-off': IconShieldOff,
  'ti-key': IconKey,
  'ti-credit-card': IconCreditCard,
  'ti-arrows-up': IconArrowsUp,
  'ti-folder-open': IconFolderOpen,
  'ti-cloud': IconCloud,
  'ti-eye': IconEye,
  'ti-package-export': IconPackageExport,
  'ti-bug': IconBug,
  'ti-download': IconDownload,
};

const DISP_COLOR: Record<KillChainStep['disposition'], string> = {
  blocked: 'text-success border-success/40 bg-success/10',
  contained: 'text-warning border-warning/40 bg-warning/10',
  observed: 'text-danger border-danger/40 bg-danger/10',
  manual: 'text-text2 border-white/10 bg-white/5',
};

const DISP_LABEL: Record<KillChainStep['disposition'], string> = {
  blocked: 'blocked',
  contained: 'contained',
  observed: 'observed',
  manual: 'manual',
};

interface Props {
  steps: KillChainStep[];
  activeIndex: number;
}

export function KillChainTimeline({ steps, activeIndex }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step, i) => {
        const Icon = ICON_MAP[step.iconName] ?? IconBug;
        const reached = i <= activeIndex;
        const isActive = i === activeIndex;
        return (
          <div
            key={step.id}
            className={`flex items-stretch gap-3 p-2.5 rounded-md border transition-all duration-base ${
              isActive
                ? 'bg-surface2 border-accent/40'
                : reached
                ? 'bg-surface/60 border-white/8'
                : 'bg-surface/30 border-white/5 opacity-50'
            }`}
          >
            <div className="flex flex-col items-center gap-1 pt-0.5 min-w-[58px]">
              <span className="text-[10px] font-mono text-text3 tracking-wider">
                {step.timeLabel}
              </span>
              <div
                className={`h-7 w-7 rounded-md flex items-center justify-center ${
                  reached ? 'bg-danger/15 text-danger' : 'bg-white/5 text-text3'
                }`}
              >
                <Icon size={14} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-body text-text1 font-medium leading-tight">
                  {step.technique}
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${DISP_COLOR[step.disposition]}`}
                >
                  {DISP_LABEL[step.disposition]}
                </span>
              </div>
              <div className="text-[11px] text-text2 mb-1 leading-snug">{step.description}</div>
              <div className="text-[10px] text-text3 leading-snug">{step.explanation}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
