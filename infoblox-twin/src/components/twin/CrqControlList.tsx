import type { Mitigation } from '@/lib/types/twin.types';
import { formatDollars } from '@/lib/scene/colors';
import { IconCircleFilled } from '@tabler/icons-react';

interface Props {
  mitigations: Mitigation[];
  onToggle: (id: string, on: boolean) => void;
}

export function CrqControlList({ mitigations, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {mitigations.map((m) => {
        const active = m.status === 'active';
        return (
          <div
            key={m.id}
            className={`p-3 rounded-lg border transition-all duration-fast ${
              active ? 'bg-success/8 border-success/30' : 'bg-surface/60 border-white/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggle(m.id, !active)}
                role="switch"
                aria-checked={active}
                className={`mt-0.5 relative h-5 w-9 rounded-full transition-colors duration-fast shrink-0 ${
                  active ? 'bg-success' : 'bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-base ${
                    active ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-0.5 gap-2 flex-wrap">
                  <div className="text-body text-text1 font-medium leading-tight">{m.name}</div>
                  <span
                    className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono ${
                      active ? 'text-success' : 'text-text3'
                    }`}
                  >
                    <IconCircleFilled size={6} />
                    {active ? 'active' : 'inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-text3 flex-wrap">
                  <span className="font-mono">setup {formatDollars(m.setupCost)}</span>
                  <span>·</span>
                  <span className="font-mono">{formatDollars(m.annualCost)}/yr</span>
                  <span>·</span>
                  <span className="text-success font-medium">
                    ▼ {Math.round(m.expectedRiskReduction * 100)}% risk
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
