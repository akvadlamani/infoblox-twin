import { useMemo } from 'react';
import { formatDollars } from '@/lib/scene/colors';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';

interface Props {
  ale: number;
  history: { date: string; ale: number }[];
}

export function CrqHero({ ale, history }: Props) {
  const first = history[0]?.ale ?? ale;
  const last = history[history.length - 1]?.ale ?? ale;
  const trend = first ? (last - first) / first : 0;
  const trendPct = Math.round(Math.abs(trend) * 100);
  const isDown = trend < 0;

  const { pathD, areaD } = useMemo(() => {
    if (history.length < 2) return { pathD: '', areaD: '' };
    const min = Math.min(...history.map((h) => h.ale));
    const max = Math.max(...history.map((h) => h.ale));
    const W = 600;
    const H = 64;
    const padY = 6;
    const points = history.map((h, i) => {
      const x = (i / (history.length - 1)) * W;
      const y = padY + (1 - (h.ale - min) / Math.max(1, max - min)) * (H - padY * 2);
      return [x, y] as const;
    });
    const path = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(' ');
    const area = `${path} L ${W} ${H} L 0 ${H} Z`;
    return { pathD: path, areaD: area };
  }, [history]);

  return (
    <div className="p-5 rounded-xl bg-surface/60 border border-white/5">
      <div className="eyebrow mb-1">annualized loss expectancy</div>
      <div className="flex items-baseline gap-3 mb-1 flex-wrap">
        <div className="font-mono text-[44px] font-medium text-text1 leading-none">
          {formatDollars(ale)}
        </div>
        <div
          className={`flex items-center gap-1 text-small font-medium ${
            isDown ? 'text-success' : 'text-danger'
          }`}
        >
          {isDown ? <IconArrowDownRight size={14} /> : <IconArrowUpRight size={14} />}
          {trendPct}% from 90 days ago
        </div>
      </div>
      <div className="text-[11px] text-text3 mb-4">
        Computed live via Markov Decision Process · Gartner G00835632 · refreshes when controls change
      </div>

      <div className="relative">
        <svg viewBox="0 0 600 64" className="w-full h-16" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDown ? '#10b981' : '#ef4444'} stopOpacity="0.25" />
              <stop offset="100%" stopColor={isDown ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#sparkArea)" />
          <path
            d={pathD}
            fill="none"
            stroke={isDown ? '#10b981' : '#ef4444'}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="flex justify-between text-[10px] font-mono text-text3 mt-1">
          <span>90 days ago · {formatDollars(first)}</span>
          <span>today · {formatDollars(last)}</span>
        </div>
      </div>
    </div>
  );
}
