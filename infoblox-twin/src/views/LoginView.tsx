import { useState } from 'react';
import { IconLock, IconUser, IconShieldCheck, IconArrowRight } from '@tabler/icons-react';
import { useAppStore } from '@/lib/state/store';

export function LoginView() {
  const login = useAppStore((s) => s.login);
  const [u, setU] = useState('admin');
  const [p, setP] = useState('admin');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    setTimeout(() => {
      const ok = login(u.trim(), p);
      if (!ok) {
        setErr('Invalid credentials. Try admin / admin.');
        setSubmitting(false);
      }
    }, 350);
  };

  return (
    <div className="absolute inset-0 grid lg:grid-cols-[1.1fr_1fr] bg-page">
      {/* Left: marketing */}
      <div className="relative overflow-hidden hidden lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 25% 35%, rgba(59,130,246,0.18) 0%, transparent 55%), radial-gradient(circle at 80% 70%, rgba(125,113,221,0.16) 0%, transparent 50%), #0a0a0f',
          }}
        />
        <div className="relative h-full flex flex-col justify-between p-12">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-accent/15 border border-accent/40 flex items-center justify-center">
              <IconShieldCheck size={18} className="text-accent2" />
            </div>
            <div className="leading-tight">
              <div className="text-body font-medium text-text1">Infoblox Twin</div>
              <div className="text-[11px] text-text3 lowercase tracking-wider">
                continuous digital twin of your enterprise
              </div>
            </div>
          </div>

          <div className="max-w-[520px]">
            <div className="eyebrow mb-3 text-accent2">why a twin</div>
            <h1 className="text-[34px] leading-[1.15] font-medium text-text1 mb-4 tracking-tight">
              Your network already tells you everything. Nobody's listening at this scale.
            </h1>
            <p className="text-body text-text2 leading-relaxed mb-6">
              Twin fuses the signals you already generate — DNS, flow, identity, cloud, EDR, OT —
              into one continuously refreshed picture of every device, every relationship, and every
              threat path. Defenders stop flying blind while attackers rehearse.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { k: 'Blast radius', v: 'before any change touches production' },
                { k: 'Patch risk', v: 'scored against how the network actually behaves' },
                { k: 'Breach replay', v: 'reconstruct every lateral hop, end-to-end' },
                { k: 'Compliance', v: 'PCI / HIPAA / GDPR zones mapped in real time' },
              ].map((c) => (
                <div
                  key={c.k}
                  className="p-3 rounded-md bg-surface/60 border border-white/5"
                >
                  <div className="text-[12px] text-text1 font-medium mb-0.5">{c.k}</div>
                  <div className="text-[11px] text-text3 leading-snug">{c.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-text3">
            <span className="text-text2">No new infrastructure.</span> No agents. No waiting. Twin
            connects to the systems you already run — DNS, flow, cloud, identity, EDR, OT — and
            assembles itself.
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8 bg-surface/30">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-md bg-accent/15 border border-accent/40 flex items-center justify-center">
              <IconShieldCheck size={15} className="text-accent2" />
            </div>
            <span className="text-body font-medium text-text1">Infoblox Twin</span>
          </div>
          <div className="eyebrow mb-2">welcome back</div>
          <h2 className="text-h1 font-medium text-text1 mb-1">Sign in</h2>
          <p className="text-small text-text3 mb-3">
            Use <span className="font-mono text-text2">admin / admin</span> for the demo.
          </p>
          <div className="mb-5 px-3 py-2 rounded-md bg-accent/10 border border-accent/30 text-[11px] text-accent2 leading-snug">
            New here? Mystique will give you a <span className="font-medium">90-second guided tour</span> right after sign-in. You can also re-launch it any time from the top bar.
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="block">
              <span className="eyebrow block mb-1.5">username</span>
              <div className="relative">
                <IconUser
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text3"
                />
                <input
                  type="text"
                  value={u}
                  onChange={(e) => setU(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-md bg-page/60 border border-white/8 focus:border-accent/60 outline-none text-body text-text1 transition-colors duration-fast"
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
            </label>

            <label className="block">
              <span className="eyebrow block mb-1.5">password</span>
              <div className="relative">
                <IconLock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text3"
                />
                <input
                  type="password"
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-md bg-page/60 border border-white/8 focus:border-accent/60 outline-none text-body text-text1 transition-colors duration-fast"
                  placeholder="••••••"
                  autoComplete="current-password"
                />
              </div>
            </label>

            {err && (
              <div className="text-[11px] text-danger px-1">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 px-4 py-2.5 rounded-md bg-accent hover:bg-accent2 disabled:opacity-60 text-white font-medium text-body flex items-center justify-center gap-2 transition-colors duration-fast"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
              {!submitting && <IconArrowRight size={15} />}
            </button>
          </form>

          <div className="mt-6 text-[10px] text-text3 leading-snug">
            Single sign-on, RBAC, and Infoblox CSP credentials available in production.
            <br />
            This demo runs entirely on mock data — no calls leave your browser.
          </div>
        </div>
      </div>
    </div>
  );
}
