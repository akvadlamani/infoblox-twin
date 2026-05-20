import { useState } from 'react';
import { IconUser, IconChevronDown } from '@tabler/icons-react';
import { useAppStore } from '@/lib/state/store';
import type { Persona } from '@/lib/types/twin.types';

const PERSONAS: { id: Persona; label: string; sub: string }[] = [
  { id: 'ciso', label: 'CISO mode', sub: 'security & risk operations' },
  { id: 'cro', label: 'CRO / Board mode', sub: 'finance, audit, board' },
];

export function PersonaSwitcher() {
  const persona = useAppStore((s) => s.persona);
  const setPersona = useAppStore((s) => s.setPersona);
  const [open, setOpen] = useState(false);
  const active = PERSONAS.find((p) => p.id === persona)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface/70 hover:bg-surface2 border border-white/5 transition-colors duration-fast text-small text-text1"
      >
        <IconUser size={12} className="text-text2" />
        <span className="font-medium">{active.label}</span>
        <IconChevronDown size={12} className="text-text3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg bg-surface2 border border-white/10 shadow-lg overflow-hidden z-50">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setPersona(p.id);
                setOpen(false);
              }}
              onClick={() => {
                setPersona(p.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors duration-fast flex flex-col gap-0.5 ${
                p.id === persona ? 'bg-white/5' : ''
              }`}
            >
              <span className="text-small font-medium text-text1">{p.label}</span>
              <span className="text-[11px] text-text3">{p.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
