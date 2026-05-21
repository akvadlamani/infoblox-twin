import { useEffect, useState } from 'react';
import { IconSparkles } from '@tabler/icons-react';

interface Props {
  text: string;
  variant?: 'default' | 'compact';
}

export function NarratorStrip({ text, variant = 'default' }: Props) {
  const [displayed, setDisplayed] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    if (!text) return;
    let i = 0;
    setDisplayed('');
    const t1 = setTimeout(() => setShow(true), 80);
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 14);
    return () => {
      clearInterval(interval);
      clearTimeout(t1);
    };
  }, [text]);

  if (variant === 'compact') {
    return (
      <div className="px-3 py-2 rounded-md bg-surface/60 border border-white/5 flex items-center gap-2 text-[12px] text-text2">
        <IconSparkles size={12} className="text-accent2 shrink-0" />
        <span className="truncate">{displayed}</span>
      </div>
    );
  }

  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[720px] w-[calc(100%-40px)] px-4 py-2 rounded-lg border border-white/10 transition-all duration-base shadow-lg ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      style={{
        // Fully opaque background so scrolled content can't bleed through.
        background: '#14141f',
      }}
    >
      <div className="flex items-center gap-2.5">
        <IconSparkles size={12} className="text-accent2 shrink-0" />
        <div className="flex-1 min-w-0 text-[12px] text-text2 leading-snug">
          {displayed}
          <span className="inline-block w-[1px] h-[11px] bg-accent2/80 ml-1 align-middle animate-pulse" />
        </div>
      </div>
    </div>
  );
}
