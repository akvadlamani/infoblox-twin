import { useEffect, useState } from 'react';
import { HERO_LINES } from '@/lib/llm/narrator-canned';

interface Props {
  onComplete: () => void;
}

export function HeroLanding({ onComplete }: Props) {
  const [shown, setShown] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    HERO_LINES.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setShown(i + 1), 200 + i * 800)
      );
    });
    timers.push(window.setTimeout(() => setFadingOut(true), 2200));
    timers.push(window.setTimeout(() => onComplete(), 2700));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-page flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-7 max-w-[640px] px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-accent/10 animate-ping rounded-xl" />
            <svg width="22" height="22" viewBox="0 0 24 24" className="text-accent2 relative">
              <path
                d="M12 2 L20 6 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V6 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div className="text-eyebrow text-text3">Infoblox Twin</div>
          <div className="text-h1 font-medium text-text1 tracking-tight">
            Continuously modeling Acme Corp
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {HERO_LINES.map((line, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border transition-all duration-base ${
                i < shown
                  ? 'opacity-100 translate-y-0 border-white/8 bg-surface/60'
                  : 'opacity-0 translate-y-2 border-transparent bg-transparent'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  i < shown - 1
                    ? 'bg-success'
                    : i === shown - 1
                    ? 'bg-accent2 anim-pulse-dot'
                    : 'bg-text3/30'
                }`}
              />
              <span className="text-body text-text2 font-mono">{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
