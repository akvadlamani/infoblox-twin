import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { formatDollars } from '@/lib/scene/colors';
import type { CrqSnapshot } from '@/lib/types/twin.types';

interface Props {
  snapshot: CrqSnapshot;
}

export function MdpExplainer({ snapshot }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-surface/60 border border-white/5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left"
      >
        {open ? (
          <IconChevronDown size={14} className="text-text3" />
        ) : (
          <IconChevronRight size={14} className="text-text3" />
        )}
        <span className="text-small font-medium text-text1">How is this calculated?</span>
        <span className="ml-auto text-[10px] font-mono text-text3 uppercase tracking-wider">
          MDP · Gartner G00835632
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5">
          <div className="font-mono text-[12px] text-text2 mb-3 p-3 rounded-md bg-page/60 border border-white/5">
            ALE = Σ ( P(action_i) × Reward(action_i) )
            <br />
            <span className="text-text3">scoped over</span> E = events / month × 12 ={' '}
            {(snapshot.mdpInputs.eventsPerMonth * 12).toLocaleString()}
            <span className="text-text3"> annual events</span>
          </div>
          <div className="text-[11px] text-text2 mb-2">
            Inputs <span className="text-text3">(this org, today)</span>:
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-mono">
            <Row label="E (events/year)" value={(snapshot.mdpInputs.eventsPerMonth * 12).toLocaleString()} />
            {snapshot.mdpInputs.actions.map((a) => (
              <Row
                key={a.id}
                label={a.name}
                value={`P=${a.probability.toFixed(2)} · R=${formatDollars(a.reward)}`}
              />
            ))}
            <Row label="active controls" value={`${snapshot.activeControls.length}`} />
            <Row label="control effectiveness" value="0.6 (real-world dampener)" />
            <div className="border-t border-white/5 mt-1 pt-1">
              <Row label="result" value={formatDollars(snapshot.totalAle)} accent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text3">{label}</span>
      <span className={accent ? 'text-success' : 'text-text1'}>{value}</span>
    </div>
  );
}
