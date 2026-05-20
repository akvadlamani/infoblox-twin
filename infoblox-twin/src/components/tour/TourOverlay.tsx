import { useEffect, useMemo, useState } from 'react';
import {
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import { useAppStore } from '@/lib/state/store';
import { TOUR } from '@/lib/tour/steps';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BUBBLE_W = 380;
const PAD = 12;

export function TourOverlay() {
  const tourStep = useAppStore((s) => s.tourStep);
  const next = useAppStore((s) => s.nextTour);
  const prev = useAppStore((s) => s.prevTour);
  const exit = useAppStore((s) => s.exitTour);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const selectAsset = useAppStore((s) => s.selectAsset);
  const setAskPanelOpen = useAppStore((s) => s.setAskPanelOpen);

  const active = tourStep >= 0;
  const step = active ? TOUR[tourStep] : null;
  const isLast = step && tourStep === TOUR.length - 1;

  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [ready, setReady] = useState(false);

  // Navigate to the right view + run setup
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    setReady(false);
    setRect(null);

    (async () => {
      // 1. Navigate
      if (step.view && step.view !== view) setView(step.view);
      // 2. wait for view to mount
      await new Promise((r) => setTimeout(r, 380));
      if (cancelled) return;
      // 3. setup actions
      if (step.setup === 'open-asset-drawer') {
        selectAsset('ast_fin-db');
        await new Promise((r) => setTimeout(r, 220));
      } else if (step.setup === 'run-mythos-sim') {
        // click FIN-DB target button inside Mythos
        const btn = document.querySelector<HTMLButtonElement>(
          '[data-tour="mythos-target-list"] button'
        );
        btn?.click();
        await new Promise((r) => setTimeout(r, 320));
      } else if (step.setup === 'open-ask-mystique') {
        setAskPanelOpen(true);
        await new Promise((r) => setTimeout(r, 320));
      }
      if (cancelled) return;
      // 4. resolve target
      if (step.target) {
        const r = await pollForElement(step.target, 2000);
        if (cancelled) return;
        setRect(r);
      } else {
        setRect(null);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep]);

  // Re-measure on resize / scroll
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (step?.target) {
        pollForElement(step.target, 200).then((r) => setRect(r));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, step]);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit();
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLast) exit();
        else next();
      }
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, isLast, next, prev, exit]);

  // Auto-close ask panel when leaving the ask step
  useEffect(() => {
    if (!active) return;
    if (step?.setup !== 'open-ask-mystique') {
      setAskPanelOpen(false);
    }
  }, [active, step, setAskPanelOpen]);

  // Close asset drawer when leaving that step
  useEffect(() => {
    if (!active) return;
    if (step?.setup !== 'open-asset-drawer') {
      selectAsset(null);
    }
  }, [active, step, selectAsset]);

  const bubblePos = useMemo(() => {
    if (!step) return { left: 0, top: 0 };
    if (!rect || step.placement === 'center') {
      return {
        left: Math.max(PAD, (viewport.w - BUBBLE_W) / 2),
        top: viewport.h / 2 - 100,
      };
    }
    const placement = step.placement ?? 'bottom';
    let left = rect.x;
    let top = rect.y;
    switch (placement) {
      case 'top':
        left = clamp(rect.x + rect.w / 2 - BUBBLE_W / 2, PAD, viewport.w - BUBBLE_W - PAD);
        top = rect.y - 200 - 12;
        break;
      case 'bottom':
        left = clamp(rect.x + rect.w / 2 - BUBBLE_W / 2, PAD, viewport.w - BUBBLE_W - PAD);
        top = rect.y + rect.h + 12;
        break;
      case 'left':
        left = clamp(rect.x - BUBBLE_W - 16, PAD, viewport.w - BUBBLE_W - PAD);
        top = clamp(rect.y + rect.h / 2 - 100, PAD + 100, viewport.h - 220);
        break;
      case 'right':
        left = clamp(rect.x + rect.w + 16, PAD, viewport.w - BUBBLE_W - PAD);
        top = clamp(rect.y + rect.h / 2 - 100, PAD + 100, viewport.h - 220);
        break;
    }
    // ensure on-screen
    if (top + 200 > viewport.h) top = viewport.h - 220;
    if (top < PAD + 80) top = PAD + 80;
    return { left, top };
  }, [step, rect, viewport]);

  if (!active || !step) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Spotlight: a div sized to the target with a huge box-shadow creating the dim outside */}
      {rect && ready && (
        <div
          className="absolute rounded-xl transition-all duration-300 ease-out"
          style={{
            left: rect.x - 6,
            top: rect.y - 6,
            width: rect.w + 12,
            height: rect.h + 12,
            boxShadow: '0 0 0 9999px rgba(10, 10, 15, 0.78)',
            border: '1px solid rgba(96, 165, 250, 0.6)',
            outline: '2px solid rgba(96, 165, 250, 0.25)',
            outlineOffset: 6,
          }}
        />
      )}
      {/* Center backdrop when no target */}
      {(!rect || !ready) && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ background: 'rgba(10, 10, 15, 0.78)' }}
        />
      )}

      {/* Message bubble */}
      <div
        className="absolute pointer-events-auto transition-all duration-300 ease-out anim-stream-in"
        style={{
          left: bubblePos.left,
          top: bubblePos.top,
          width: BUBBLE_W,
        }}
      >
        <div className="rounded-xl bg-surface border border-white/10 shadow-2xl overflow-hidden">
          <header className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b border-white/5">
            <div
              className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(96,165,250,0.15)',
                border: '1px solid rgba(96,165,250,0.4)',
                color: '#60a5fa',
              }}
            >
              <IconSparkles size={13} stroke={1.8} />
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-medium text-text1 leading-tight">Mystique</div>
              <div className="text-[9px] text-text3 lowercase tracking-wider">
                guided tour · step {tourStep + 1} of {TOUR.length}
              </div>
            </div>
            <button
              onClick={exit}
              className="p-1 rounded-md text-text3 hover:bg-white/5 hover:text-text1 transition-colors duration-fast"
              aria-label="Exit tour"
            >
              <IconX size={13} />
            </button>
          </header>
          <div className="px-4 py-3">
            <div className="text-body font-medium text-text1 leading-snug mb-1.5">{step.title}</div>
            <p className="text-[12px] text-text2 leading-relaxed">{step.body}</p>
          </div>
          <footer className="px-4 pb-3 flex items-center justify-between gap-2">
            <button
              onClick={prev}
              disabled={tourStep === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-text3 hover:text-text1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <IconArrowLeft size={11} />
              Back
            </button>
            <div className="flex items-center gap-1">
              {TOUR.map((_, i) => (
                <span
                  key={i}
                  className="rounded-full transition-all duration-fast"
                  style={{
                    width: i === tourStep ? 14 : 5,
                    height: 5,
                    background:
                      i <= tourStep ? '#60a5fa' : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => (isLast ? exit() : next())}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent hover:bg-accent2 text-white text-[11px] font-medium"
            >
              {isLast ? 'Finish' : 'Continue'}
              {!isLast && <IconArrowRight size={11} />}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

async function pollForElement(selector: string, timeoutMs: number): Promise<Rect | null> {
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        resolve({ x: r.x, y: r.y, w: r.width, h: r.height });
        return;
      }
      if (performance.now() - start > timeoutMs) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
