import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/state/store';
import { HeroLanding } from '@/components/twin/HeroLanding';
import { TopBar } from '@/components/shell/TopBar';
import { TabNav } from '@/components/shell/TabNav';
import { AskTwinPanel, AskTwinLauncher } from '@/components/agent/AskTwinPanel';
import { LoginView } from '@/views/LoginView';
import { OverviewView } from '@/views/OverviewView';
import { AevLabView } from '@/views/AevLabView';
import { AttackPathView } from '@/views/AttackPathView';
import { AgentIezView } from '@/views/AgentIezView';
import { CrqView } from '@/views/CrqView';
import { PatchRiskView } from '@/views/PatchRiskView';
import { ComplianceView } from '@/views/ComplianceView';
import { SettingsView } from '@/views/SettingsView';

export default function App() {
  const view = useAppStore((s) => s.view);
  const authed = useAppStore((s) => s.authed);
  const heroComplete = useAppStore((s) => s.heroComplete);
  const completeHero = useAppStore((s) => s.completeHero);
  const toggleAutoRotate = useAppStore((s) => s.toggleAutoRotate);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && view === 'overview') {
        e.preventDefault();
        toggleAutoRotate();
      }
      // Cmd/Ctrl + . opens Ask Twin
      if (e.key === '.' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAskOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, toggleAutoRotate]);

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
        <div className="absolute inset-0">
          {view === 'overview' && <OverviewView />}
          {view === 'aev' && <AevLabView />}
          {view === 'attack-path' && <AttackPathView />}
          {view === 'agent-iez' && <AgentIezView />}
          {view === 'crq' && <CrqView />}
          {view === 'patch-risk' && <PatchRiskView />}
          {view === 'compliance' && <ComplianceView />}
          {view === 'settings' && <SettingsView />}
        </div>
        {!askOpen && heroComplete && <AskTwinLauncher onOpen={() => setAskOpen(true)} />}
        <AskTwinPanel open={askOpen} onClose={() => setAskOpen(false)} />
      </div>
    </div>
  );
}
