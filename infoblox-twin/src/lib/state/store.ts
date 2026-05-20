import { create } from 'zustand';
import type { Persona, ViewName } from '@/lib/types/twin.types';

interface AppState {
  view: ViewName;
  persona: Persona;
  authed: boolean;
  username: string;
  heroComplete: boolean;
  selectedAssetId: string | null;
  selectedActorId: string | null;
  autoRotate: boolean;
  narratorText: string;
  continuousAEV: boolean;
  scenariosRunToday: number;
  // Tour mode
  tourStep: number; // -1 = inactive
  askPanelOpen: boolean;

  login: (u: string, p: string) => boolean;
  logout: () => void;
  setView: (v: ViewName) => void;
  setPersona: (p: Persona) => void;
  completeHero: () => void;
  selectAsset: (id: string | null) => void;
  selectActor: (id: string | null) => void;
  toggleAutoRotate: () => void;
  setNarrator: (text: string) => void;
  setContinuousAEV: (on: boolean) => void;
  incrementScenarios: () => void;
  startTour: () => void;
  nextTour: () => void;
  prevTour: () => void;
  exitTour: () => void;
  setAskPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'overview',
  persona: 'ciso',
  authed: false,
  username: '',
  heroComplete: false,
  selectedAssetId: null,
  selectedActorId: null,
  autoRotate: true,
  narratorText: '',
  continuousAEV: true,
  scenariosRunToday: 47,
  tourStep: -1,
  askPanelOpen: false,

  login: (u, p) => {
    if (u === 'admin' && p === 'admin') {
      set({ authed: true, username: u });
      return true;
    }
    return false;
  },
  logout: () => set({ authed: false, username: '', heroComplete: false, view: 'overview' }),
  setView: (v) => set({ view: v, selectedAssetId: null, selectedActorId: null }),
  setPersona: (p) => {
    if (p === 'cro') set({ persona: p, view: 'crq' });
    else set({ persona: p, view: 'overview' });
  },
  completeHero: () => set({ heroComplete: true }),
  selectAsset: (id) => set({ selectedAssetId: id }),
  selectActor: (id) => set({ selectedActorId: id }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setNarrator: (text) => set({ narratorText: text }),
  setContinuousAEV: (on) => set({ continuousAEV: on }),
  incrementScenarios: () => set((s) => ({ scenariosRunToday: s.scenariosRunToday + 1 })),
  startTour: () => set({ tourStep: 0 }),
  nextTour: () => set((s) => ({ tourStep: s.tourStep + 1 })),
  prevTour: () => set((s) => ({ tourStep: Math.max(0, s.tourStep - 1) })),
  exitTour: () => set({ tourStep: -1 }),
  setAskPanelOpen: (askPanelOpen) => set({ askPanelOpen }),
}));
