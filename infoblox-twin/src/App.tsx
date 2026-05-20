import { useEffect } from 'react';
import { useAppStore } from '@/lib/state/store';
import { HeroLanding } from '@/components/twin/HeroLanding';
import { TopBar } from '@/components/shell/TopBar';
import { TabNav } from '@/components/shell/TabNav';
import { AskTwinPanel, AskTwinLauncher } from '@/components/agent/AskTwinPanel';
import { ViewAgentChip } from '@/components/agent/ViewAgentChip';
import { ScrollFades } from '@/components/shell/ScrollFades';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { LoginView } from '@/views/LoginView';
import { OverviewView } from '@/views/OverviewView';
import { AevLabView } from '@/views/AevLabView';
import { AttackPathView } from '@/views/AttackPathView';
import { AgentIezView } from '@/views/AgentIezView';
import { CrqView } from '@/views/CrqView';
import { PatchRiskView } from '@/views/PatchRiskView';
import { ComplianceView } from '@/views/ComplianceView';
import { SettingsView } from '@/views/SettingsView';
import { AgentsView } from '@/views/AgentsView';
import { MythosView } from '@/views/MythosView';

export default function App() {
  const view = useAppStore((s) => s.view);
  const authed = useAppStore((s) => s.authed);
  const heroComplete = useAppStore((s) => s.heroComplete);
  const completeHero = useAppStore((s) => s.completeHero);
  const toggleAutoRotate = useAppStore((s) => s.toggleAutoRotate);
  const askPanelOpen = useAppStore((s) => s.askPanelOpen);
  const setAskPanelOpen = useAppStore((s) => s.setAskPanelOpen);
  const startTour = useAppStore((s) => s.startTour);
  const tourActive = useAppStore((s) => s.tourStep >= 0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && view === 'overview') {
        e.preventDefault();
        toggleAutoRotate();
      }
      // Cmd/Ctrl + . opens Ask Mystique
      if (e.key === '.' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAskPanelOpen(!askPanelOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, toggleAutoRotate, askPanelOpen, setAskPanelOpen]);

  // Auto-start the tour for first-time judges
  useEffect(() => {
    if (!authed || !heroComplete) return;
    const KEY = 'infoblox-twin.tour-seen';
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(KEY) === '1') return;
    const t = setTimeout(() => {
      startTour();
      localStorage.setItem(KEY, '1');
    }, 900);
    return () => clearTimeout(t);
  }, [authed, heroComplete, startTour]);

  if (!authed) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-page">
        <LoginView />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-page">
      {!heroComplete && <HeroLanding onComplete={completeHero} />}
      <div
        className={`absolute inset-0 transition-opacity duration-cine ${
          heroComplete ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <TopBar />
        <TabNav />
        <ViewAgentChip />
        <ScrollFades />
        <div className="absolute inset-0">
          {view === 'overview' && <OverviewView />}
          {view === 'aev' && <AevLabView />}
          {view === 'attack-path' && <AttackPathView />}
          {view === 'agent-iez' && <AgentIezView />}
          {view === 'crq' && <CrqView />}
          {view === 'patch-risk' && <PatchRiskView />}
          {view === 'compliance' && <ComplianceView />}
          {view === 'agents' && <AgentsView />}
          {view === 'mythos' && <MythosView />}
          {view === 'settings' && <SettingsView />}
        </div>
        {!askPanelOpen && heroComplete && !tourActive && (
          <AskTwinLauncher onOpen={() => setAskPanelOpen(true)} />
        )}
        <AskTwinPanel open={askPanelOpen} onClose={() => setAskPanelOpen(false)} />
      </div>
      <TourOverlay />
    </div>
  );
}
