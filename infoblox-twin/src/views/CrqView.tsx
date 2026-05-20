import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrqHero } from '@/components/twin/CrqHero';
import { CrqControlList } from '@/components/twin/CrqControlList';
import { MdpExplainer } from '@/components/twin/MdpExplainer';
import { NarratorStrip } from '@/components/shell/NarratorStrip';
import { twinClient } from '@/lib/data-clients/factory';
import type { CrqSnapshot, Mitigation } from '@/lib/types/twin.types';
import { useAppStore } from '@/lib/state/store';
import { narrate } from '@/lib/llm/narrator-canned';
import { formatDollars } from '@/lib/scene/colors';
import {
  IconFileDownload,
  IconArrowDownRight,
  IconArrowUpRight,
  IconUsers,
} from '@tabler/icons-react';

export function CrqView() {
  const [snapshot, setSnapshot] = useState<CrqSnapshot | null>(null);
  const [history, setHistory] = useState<{ date: string; ale: number }[]>([]);
  const [mitigations, setMitigations] = useState<Mitigation[]>([]);
  const setNarrator = useAppStore((s) => s.setNarrator);
  const narratorText = useAppStore((s) => s.narratorText);

  useEffect(() => {
    twinClient.getCurrentCrqSnapshot().then(setSnapshot);
    twinClient.getCrqHistory(90).then(setHistory);
    twinClient.listMitigations().then(setMitigations);
    setNarrator(narrate({ kind: 'view-change', view: 'crq' }));
  }, [setNarrator]);

  const handleToggle = useCallback(
    async (id: string, on: boolean) => {
      const before = snapshot?.totalAle ?? 0;
      const next = await twinClient.toggleMitigation(id, on);
      setSnapshot(next);
      const list = await twinClient.listMitigations();
      setMitigations(list);
      const m = list.find((x) => x.id === id);
      if (m) {
        setNarrator(
          narrate({
            kind: 'control-toggle',
            name: m.name,
            on,
            delta: next.totalAle - before,
          })
        );
      }
      // Refresh history to update trend
      twinClient.getCrqHistory(90).then(setHistory);
    },
    [snapshot, setNarrator]
  );

  const top5 = useMemo(() => snapshot?.topScenarios.slice(0, 5) ?? [], [snapshot]);

  if (!snapshot) {
    return <div className="absolute inset-0 pt-[100px] px-5 text-text3">Loading…</div>;
  }

  return (
    <div className="absolute inset-0 pt-[100px] pb-24 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <div className="flex flex-col gap-4">
            <CrqHero ale={snapshot.totalAle} history={history} />

            {/* Top 5 scenarios */}
            <div className="rounded-xl bg-surface/60 border border-white/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="eyebrow">top risk scenarios</div>
                <span className="text-[10px] text-text3 font-mono">ranked by $ impact</span>
              </div>
              <div className="flex flex-col gap-2">
                {top5.map((s) => {
                  const isDown = s.trend30d < 0;
                  return (
                    <div
                      key={s.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3 rounded-lg bg-page/40 border border-white/5"
                    >
                      <div className="min-w-0">
                        <div className="text-body text-text1 font-medium mb-0.5">{s.name}</div>
                        <div className="text-[11px] text-text3 leading-snug">
                          {s.description} · top mitigation: TD on Finance segment
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-h2 text-text1">{formatDollars(s.ale)}</div>
                        <div
                          className={`flex items-center gap-1 justify-end text-[10px] font-medium ${
                            isDown ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {isDown ? <IconArrowDownRight size={11} /> : <IconArrowUpRight size={11} />}
                          {Math.abs(Math.round(s.trend30d * 100))}%
                        </div>
                      </div>
                      <div className="text-[10px] text-text3 font-mono text-right w-12">
                        P={s.annualProbability.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <MdpExplainer snapshot={snapshot} />

            {/* Benchmark + recommended */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface/60 border border-white/5">
                <div className="eyebrow mb-2 flex items-center gap-2">
                  <IconUsers size={11} />
                  industry benchmark
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-h1 font-medium text-text1">75th percentile</div>
                </div>
                <div className="text-small text-text2 mb-3">
                  better than 3 of 4 peers your size in pharmaceutical manufacturing.
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent2"
                    style={{ width: '75%' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-text3 mt-1">
                  <span>peer worst</span>
                  <span>peer best</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface/60 border border-white/5">
                <div className="eyebrow mb-2">recommended next quarter</div>
                <div className="flex flex-col gap-1.5">
                  {mitigations
                    .filter((m) => m.status !== 'active')
                    .slice(0, 3)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-baseline justify-between gap-2 text-[11px]"
                      >
                        <span className="text-text1 truncate">{m.name}</span>
                        <span className="text-success font-mono">
                          ▼ {Math.round(m.expectedRiskReduction * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => alert('Coming soon — generates a 6-slide PDF board pack.')}
              className="self-start px-4 py-2 rounded-md bg-accent/15 hover:bg-accent/25 text-accent2 border border-accent/40 text-small font-medium flex items-center gap-2"
            >
              <IconFileDownload size={13} />
              Generate board pack (coming soon)
            </button>
          </div>

          {/* Controls column */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-surface/60 border border-white/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="eyebrow">recommended controls</div>
                <span className="text-[10px] font-mono text-text3">
                  {mitigations.filter((m) => m.status === 'active').length}/{mitigations.length} active
                </span>
              </div>
              <div className="text-[11px] text-text3 mb-3 leading-snug">
                Toggle a control to see ALE recompute in real time.
              </div>
              <CrqControlList mitigations={mitigations} onToggle={handleToggle} />
            </div>
          </div>
        </div>
      </div>

      <NarratorStrip text={narratorText} />
    </div>
  );
}
