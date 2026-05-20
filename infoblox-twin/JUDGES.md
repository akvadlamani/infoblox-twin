# Infoblox Twin — Judges' guide

**Live app:** https://infoblox-twin.vercel.app/
**Sign in:** `admin` / `admin`
**Time to evaluate:** 5 minutes (90 seconds for the guided tour, 3–4 to explore)

---

## What is this?

A digital twin of the enterprise, built on the network telemetry Infoblox already collects across 6,000+ customers — DNS, DHCP, flow, IPAM, plus a connector mesh to cloud, identity, EDR, and OT. Twin fuses those signals into one living graph and runs a team of **10 AI agents** on top: they watch the graph, triage alerts, score patches, replay breaches, simulate compromises, classify compliance scope, propose containment, and brief leadership — autonomously, semi-autonomously, or advisory, with every decision auditable.

The contrarian bet: every other digital-twin product serves NetOps. None serves the CISO, the CRO, the AI platform team, or the auditor as the primary buyer. Twin is the SecOps / RiskOps / AgentOps twin — built on the only telemetry substrate broad enough to support it.

---

## How to evaluate in 5 minutes

### Option A — let the tour drive (recommended)

1. Open the app, sign in with `admin / admin`.
2. **Mystique** (the AI orchestrator agent) launches automatically and walks you through the entire product in **about 90 seconds**, 10 stops. Use `→` / `←` keys or the on-screen buttons. Press `Esc` to exit any time.
3. You can re-launch the tour from the **"Take the tour"** button in the top bar.

The tour automatically navigates between views, opens drawers, runs a Mythos simulation, and opens the chat — so you see the whole product moving without having to click around.

### Option B — drive it yourself

After signing in, here are the 5 things worth your time:

1. **Overview** — The 3D scene. Click any node — laptop, database, OT controller, cloud workload — for a type-specific detail drawer with telemetry, neighbors, agent activity, compliance. Hover any tab in the top nav for a one-line description.
2. **Mythos Simulator** (green tab, pulsing) — Click a crown jewel on the left ("FIN-DB" works well). Watch the compromise wave spread, the impact report build in dollars, and a real-world precedent get named at the bottom. Continuous mode auto-runs a fresh simulation every ~18 seconds — there's a live feed.
3. **Agents** — Meet the 10-agent roster. Click any card for the autonomy slider (Advisory / Semi / Autonomous), trust score histogram, scope reads/writes/guards, and audit timeline. Try promoting a sub-90%-trust agent to Autonomous — you'll get a real error, because the trust gate is enforced.
4. **Ask Mystique** (bottom-right pill, or `⌘.`) — Plain-English over the live graph. Try "what's reachable from FIN-DB?" — you'll see Mystique route to Hunter, who runs four tool calls (`computeInboundPaths`, `computeBlastRadius`, `listMitigations` …) and hands back to Mystique for the summary. Every tool call is shown with input + result — audit-quality transparency.
5. **Settings** (gear icon, top right) — Click **Connect** on AWS / Azure / Defender / Okta / CrowdStrike / Infoblox CSP / ServiceNow. Each one walks you through the actual vendor API onboarding — CloudFormation snippet for AWS, app-registration permissions JSON for Azure, real Falcon scopes, real ServiceNow OAuth flow. Each step is marked "mock mode" because no real credentials are submitted, but the wizard is the production flow.

---

## What's notable

| | |
|---|---|
| **Real Infoblox-tracked actors** | Vigorish Viper, VexTrio Viper, Savvy Seahorse, Decoy Dog — all publicly disclosed by Infoblox |
| **Plus externally-known actors** | APT29 (Cozy Bear), Scattered Spider (UNC3944), ALPHV/BlackCat, FIN7 — all with credible MITRE-mapped kill chains |
| **Multi-agent orchestration** | Mystique routes questions to specialists. Hunter handles paths, Pilot handles CVEs, Scope handles compliance, Sandbox vets every proposal, Action executes within scope, Takedown handles external infra, Mythos runs continuous red-team. Each handoff is visible in the chat |
| **Trust gates on autonomy** | Agents below 90% trust *cannot* be promoted to Autonomous. The gate is enforced — try it |
| **Real-world echo on every simulation** | When Mythos simulates a compromise, the right rail names the closest real-world incident (MGM @ Scattered Spider, Change Healthcare @ ALPHV, Microsoft @ APT29, etc.) |
| **CRQ in dollars, computed live** | Board CRQ tab uses the Gartner G00835632 Markov Decision Process formula. Toggle any control on the right and ALE recomputes across all scenarios in real time |
| **Patch risk scored against the graph, not the CVSS sticker** | CVE-2026-29911 on AD-PRIMARY scores 89 (patch now). CVE-2026-12277 on Vault scores 50 (schedule). Same CVSS-class. Different impact on this network |
| **Compliance drift detection** | Scope agent surfaces every asset that *touches* a PCI/HIPAA/GDPR/SOX zone but is not classified inside it. Auditor's dream |
| **Sandbox-first agentic SOC** | Every proposed action — quarantine, DNS block, ACL change — runs through Sandbox first. The dual-twin metaphor is rendered explicitly on the Console tab |

---

## Tech notes (if you care)

- **Frontend only:** Vite 5 + React 18 + TypeScript strict, React Three Fiber for 3D, Tailwind, Zustand, Tabler icons
- **Mock-mode by design:** all data lives in `src/data/mock/`. Every fetch goes through a single `TwinDataClient` interface with three implementations (Mock, Real, Hybrid) — `Real` is a stub that throws "not implemented" since we don't ship API credentials, but the wiring is real. `VITE_TWIN_DATA_SOURCE=live` flips the switch
- **Agents:** `runAgent()` in `src/lib/agent/twin-agent.ts` is a generator that yields messages with realistic pacing. In production, that file is one swap to an Anthropic Messages API call with tool-use enabled over the `TwinDataClient` methods. The shape is identical
- **Onboarding wizards:** each connector schema in `src/lib/onboarding/connectors.ts` is modeled on the actual public API — IAM trust policies, Entra app permissions, Falcon scopes, ServiceNow OAuth — so a customer reading them would recognize the flow

---

## If anything looks weird

- **3D scene didn't render?** The Vite build is large (≈ 1.3 MB; 350 KB gzipped). On slow connections give it 1–2 seconds. Reload if you hit a stuck loader
- **Tour didn't auto-start?** It runs once per browser (localStorage flag). Click "Take the tour" in the top bar to relaunch
- **Want to reset everything?** Open DevTools → Application → Local Storage → clear `localhost:5173` or `infoblox-twin.vercel.app`

---

Thanks for taking the time. Built in pure browser-side mock so you can break anything — there's nothing real to damage.
