# Infoblox Twin — Build Specification

This document is the complete context for building Infoblox Twin. It describes the product, the user experience, the architecture, and the integration surface. It does not contain code — Claude Code will generate the code from this context.

---

## 1. What we are building

A web application that gives security and risk leaders a continuously updated, queryable digital twin of their enterprise infrastructure. The twin ingests asset, identity, DNS, and threat-intelligence data, renders the network as a navigable 3D scene, and answers four classes of question:

- What attack paths exist to my crown jewels right now?
- If asset X is compromised, what is the blast radius and what does it cost in dollars?
- Is it safe for this AI agent to take this action on production?
- What premium should an insurer charge me, and what controls would lower it?

The twin is selective-fidelity by design. It does not model packet-level routing, hardware behavior, or physical layer. It models the security-relevant subset of the enterprise that informs decisions.

### The contrarian bet

Every existing "digital twin" product serves NetOps engineers (Forward Networks, IP Fabric, NetBrain), supply chain planners, or IT asset managers. None serves the CISO, the CRO, the AI platform team, or the cyber insurance carrier as the primary buyer. Infoblox is the only vendor with the data substrate — Universal Asset Insights, DNS telemetry, Threat Intelligence — to build it credibly.

### What this product is not

- Not a Forward Networks competitor. Forward is the NetOps twin (BGP, routing validation). Infoblox Twin is the SecOps, RiskOps, AgentOps twin.
- Not a ServiceNow CMDB replacement. CMDB is an input to Twin, not its competitor. Twin makes CMDB more valuable by quantifying drift cost.
- Not a BAS tool (SafeBreach, Cymulate, AttackIQ). BAS executes scripted attacks against production. Twin runs continuous safe simulation on a sandbox replica.
- Not an EDR or SIEM. Twin enriches both with attack-path context; it does not replace either.

---

## 2. Personas and jobs-to-be-done

### Maya — CISO at a 4,200-employee enterprise (primary persona)

Inherits a security stack with 47 tools, 6 dashboards, 0 unified view of risk. Pen tests quarterly, BAS monthly, red team annually. Board asked her last quarter "are our defenses actually working?" She did not have a confident answer.

Her jobs:
- When the board asks if we are secure, give me a dollar number I trust.
- When a new CVE drops, tell me which of my crown jewels are reachable through it.
- When my analyst proposes a control change, show me what it actually prevents.
- When I onboard a new agentic SOC tool, prove it will not take a stupid action.

She bounces off if the first screen looks like another dashboard. She wants the twin to show her something she did not know within 30 seconds of logging in.

### Andre — CFO and audit committee chair (secondary persona)

Reviews cyber risk quarterly. Reads board packs on his phone. Hates CVSS scores. Loves dollar-denominated risk.

His jobs:
- Show me our annualized loss expectancy in dollars, with how it changed since last quarter.
- Show me which security investments paid back, with ROI numbers.
- Show me how we compare to industry benchmark.

He bounces if the UI is not mobile-friendly, or if he sees CVSS or technical jargon before he sees dollars.

### Renu — Head of AI Platform (tertiary persona)

Deploying agentic SOC tools. Worried about agents taking unsafe actions on production — quarantining the wrong asset, blocking a critical domain, locking out 4,000 users. Needs an AI sandbox with production fidelity.

Her jobs:
- Let every AI agent test its action against the Twin before production execution.
- Give me an audit trail of every agent decision the Twin approved or vetoed.
- Ensure agents cannot escape the sandbox.

She bounces if the Twin has any write path back to production from the sandbox.

### Priya — Cyber insurance underwriter (channel persona)

Prices cyber policies based on questionnaires and outside-in scans, which lie. Loss ratios are bad. Capacity is constrained.

Her jobs:
- Give me a continuous, inside-out signal of the insured's actual posture.
- Let me run "what-if" pricing — what would the premium be if they deployed X?
- Quantify my portfolio's aggregate risk exposure.

She bounces if she has to learn a new tool. The Twin must expose data via API into her existing underwriting workflow.

---

## 3. The 60-second hero moment

The single most important specification in this document. What happens between login and the moment the user says "oh, I get it."

- **T = 0s.** User opens the app. Browser loads the root route.
- **T = 0 to 2.5s.** Loading screen appears. Dark, minimal. Three lines stream in sequentially with 800ms between them, fading up from below: *"Loading 30 assets from Universal Asset Insights …"* → *"Computing attack paths for crown jewels …"* → *"Quantifying risk exposure across portfolio …"*. The language must feel productive, not spinner-y.
- **T = 2.5s.** Scene fades in over 1.5 seconds. Camera starts at a high wide angle. The user sees the whole enterprise — segments grouped, color-coded, slow auto-rotation. No labels yet on most nodes. The visual must be impressive at this moment. This is the photograph of their network they have never seen before.
- **T = 4s.** Top bar appears with org name (Acme Corp), asset count, data freshness indicator, and the six-tab nav. Labels fade in on crown-jewel assets (criticality 5). Bottom narrator strip shows a streaming greeting: *"Good morning. I've reviewed 30 assets in your environment. Your highest exposure is FIN-DB at $4.2 million expected loss across 12 reachable attack paths. Switch to the AEV Lab tab to see how an attacker would reach it."*
- **T = 5s.** Hero is over. User can click any tab to enter a use case.

The visual must be impressive at T = 2.5s. The narrator's first sentence is what makes Maya stay.

---

## 4. The five product views

These are tabs in the top nav. Same underlying scene and data, different framings.

### 4.1 Overview (default landing)

The hero scene from section 3. Full-bleed 3D, no chrome inside the scene. The scene is the page. Overlays float on top: top bar, narrator strip.

Default behavior: camera orbits at 0.4 rad/s. Crown jewels pulse red (criticality 5 only). Other nodes are static colored spheres. Edges are thin lines.

Interactions:
- Drag to orbit the camera (constrained to 10° to 70° elevation).
- Scroll to zoom (clamped).
- Click any asset to focus the camera on it and open an asset detail drawer.
- Press Escape to return to default camera.
- Press Space to pause or resume auto-rotation.

### 4.2 AEV Lab

The continuous adversarial exposure validation view. Demonstrates that Twin replaces BAS, pen testing, and red teaming with a continuous safe simulation engine.

Layout: three regions.
- Left rail, ~240px wide. Threat actor library with cards for Mythos, K99 Cambodia banking trojan, Glasswing AiTM, GhostNet APT. Each card shows actor name, family (DNS-based AiTM, banking trojan, APT, etc.), provenance ("Tracked by Phoebe TIG since Q2 2024, 47 campaigns observed"), and a last-observed timestamp.
- Center: the 3D scene, optimized for attack-trace visualization. Larger camera angle than overview.
- Right rail, ~300px wide. Selected actor detail — TTPs, MITRE tactics, recommended controls, sample IoCs.

Click any actor card. Kill chain animation begins. Camera positions itself to frame the full chain. Each hop is 1.5 to 2 seconds. Animation per hop:
1. Source node pulses red for 500ms.
2. Particles flow along the edge for 1 second.
3. Target node lights red (compromised) or shows a green X marker (Infoblox control blocked the hop).
4. Narrator strip updates with the hop description and Twin's disposition.

Below the scene, a kill chain timeline appears step by step. Each row shows: timestamp ("T-48h"), Tabler icon, technique description, Twin's disposition ("blocked" or "observed"), and the Infoblox control that intercepted ("Threat Defense intercepts via Phoebe TIG newly-observed-domain feed").

Top of left rail: a Continuous Mode toggle, default on. When on, Twin auto-runs all four scenarios on loop in the background. Counter updates: "47 scenarios run today."

### 4.3 Attack Path

The click-to-explore view. Let the user click any asset and see what could happen.

Layout: two regions.
- Center, 60% width. 3D scene with click-to-select.
- Right, 40%. Asset detail panel.

Default state: no selection. Right panel shows "Click any asset to explore" with a small arrow pointing at the highest-risk asset for the current org.

On click:
- Camera animates to the selected asset over ~800ms.
- Inbound attack paths render in amber. Lines trace from the internet edge through intermediate hops to the selected asset.
- Outbound blast radius renders in red. Nodes reachable in 3 hops glow with a 0.3 opacity red overlay.
- Right panel populates: asset name, segment, criticality, inbound path count (with top 3 listed and exploitability scores), blast radius count (with top 5 reachable assets), expected loss in dollars (via MDP formula), and a top-3 recommended controls list with cost and risk reduction percentage.

Hover any recommended control: preview what the scene looks like with the control applied — paths fade out, blast radius shrinks. Click the control: persist the toggle in this session, recompute everything.

A small "How is this calculated?" button next to the dollar number expands an explainer showing the MDP formula and the input values. Trust comes from transparency.

### 4.4 Agent IEZ

The Isolated Experimental Zone view. Shows that every Infoblox IQ agent proposes actions to the sandbox Twin first, and the Twin returns safe / unsafe / safe-with-audit verdicts. This view exists to demonstrate that Twin makes IBIQ deployable in production — not to compete with IBIQ.

Layout: three regions.
- Top: split visualization. "Production Twin" on the left, slightly desaturated. "Sandbox Twin" on the right, full color. Both are 3D scenes but smaller, side by side. An arrow flows from sandbox to production with the label "Approved actions propagate after Twin verdict."
- Middle: pending agent action queue. Vertical stack of cards. Each card shows agent name (Triage agent, Enrichment agent, Scope agent, Risk Scoring agent, Action agent, Verification agent), proposed action, target assets, and a verdict pill.
- Bottom: selected action detail. Twin's simulation result: dependencies affected, users affected, services rerouted, confidence score, rationale.

Click any agent action card. The sandbox twin runs the simulation visually. Affected nodes pulse. Detail panel populates with the verdict.

Sample actions to include in the queue:
1. **Action agent — Quarantine endpoint pool finance (suspicious DNS pattern, 18 requests to newly-observed domain).** Verdict: safe. Rationale: endpoint pool, 0 production dependencies, 0 users affected by quarantine action. Confidence 0.96. Proceed.
2. **Action agent — Block domain api-update-svc.io org-wide.** Verdict: unsafe. Rationale: Twin shows 23 internal services depend on this domain, blocking breaks 412 users. Confidence 0.91. Reject — escalate to human.
3. **Verification agent — Push Threat Defense policy update to Engineering segment.** Verdict: safe. Rationale: 2 services affected briefly during rollout, no business impact. Confidence 0.93. Proceed.
4. **Triage agent — Auto-close 1,247 low-severity alerts matching known benign pattern.** Verdict: safe-with-audit. Rationale: 1,239 of 1,247 match known benign pattern, auto-close those and escalate 8 outliers. Confidence 0.88.

For safe actions, show an "Approve and propagate to production" button. For unsafe, show "Escalate to human." For safe-with-audit, show both plus a checkbox "Auto-approve future matches."

### 4.5 Board CRQ

The dollar-denominated risk dashboard for the CRO, CFO, and audit committee. This view must work on a phone. Mobile-first.

Layout (mobile first, then enhance for desktop):
1. Hero metric, large and central: today's annualized loss expectancy in dollars (e.g., "$4.2M"). Subtitle: "down 18% from 90 days ago." Trend arrow.
2. Sparkline: 90-day exposure trend. Line chart, single series.
3. Top 5 risk scenarios ranked by dollar impact. Each row: scenario name, current $ exposure, trend arrow, one-line description (e.g., "Mythos via Finance — $1.1M, down 12% — top mitigation: TD on Finance segment").
4. MDP formula box, collapsible, default collapsed: the formula `V = E × Σ (P(action) × Reward(action))` with the current input values plugged in. 1,000 events per month × current probability and reward values. Builds trust through transparency.
5. Controls toggle list. Each recommended mitigation has an inline switch. Toggling recomputes ALE in real-time across the dashboard. Each row shows mitigation name, dollar setup cost, expected risk reduction percentage, and a pill showing "active" or "inactive."
6. Industry benchmark, anonymized: how this org compares to peers from Infoblox install base (e.g., "75th percentile, better than 3 of 4 peers your size").
7. Recommended actions for next quarter, ranked by ROI, with dollar deltas.

Do not show CVSS scores anywhere. Do not show vulnerability counts. The audit committee does not want them and showing them undermines the dollar framing.

A single "Generate board pack" button produces a 6-slide PDF (future capability — for now, button shows "Coming soon").

### 4.6 Underwriter

The cyber insurance carrier view. Two modes — insured-facing ("here's what your insurer sees") and carrier-facing (raw API view).

Layout: single card-based dashboard.
- Header: carrier name (fictional "Vertex Cyber Underwriting" for demo), insured name, policy ID ("POL-2026-04471"), Twin-verified badge.
- Premium breakdown grid: base premium ($890,000), Twin risk delta (-$340,000, green), net premium ($550,000), loss ratio impact (-22%, green).
- Twin signals consumed: tag pills showing what data the underwriter is seeing — "DNS reputation: clean", "EDR coverage: 98%", "MFA: 4/5 critical apps", "Patch SLA: 11d avg", "Phishing-resilience: high", "Backup tested: 14d".
- Premium-reducing actions Twin recommends: ranked list. "Deploy TD on Engineering segment — premium -$42K", "Enable Inflight email security pre-delivery — premium -$78K", "Cyber 911 failover for DNS — premium -$31K".
- Revenue model card (small, bottom): Infoblox rev share 12%, per policy ARR $42K, addressable policies 8,400.

A toggle in the upper right switches to raw API view — the JSON payload an underwriter would consume programmatically. Useful for SE demos to insurance prospects.

---

## 5. Information architecture

### Top-level navigation (always visible)

Six tabs, in this order:
1. Overview (default landing)
2. AEV Lab
3. Attack Path
4. Agent IEZ
5. Board CRQ
6. Underwriter

Use Tabler icons: `ti-cube`, `ti-target`, `ti-route`, `ti-shield-bolt`, `ti-chart-bar`, `ti-shield-check`.

### Persona switcher

Top right corner. Three modes — CISO (default), CRO/Board, Insurer. Affects the rendering of every page. CRO mode hides AEV Lab and Agent IEZ tabs and lands the user on Board CRQ. Insurer mode collapses all tabs and shows only the Underwriter view.

### Persistent UI elements

Top bar across all views:
- Left: org name (Acme Corp), data freshness indicator ("Last sync: 2 min ago"), data source health (green dot if all sources healthy).
- Center: command palette trigger (Cmd+K), fuzzy-searches assets and threat actors.
- Right: persona switcher.

Bottom narrator strip across all views except Settings:
- A streaming text strip showing what is currently happening in the scene. Max 2 lines. Ambient when nothing is selected.

### Routing

Use simple `useState` in App.tsx to switch views. No router library. The active view is a single `ViewName` state value: `'overview' | 'aev' | 'attack-path' | 'agent-iez' | 'crq' | 'underwriter'`.

---

## 6. Design system

### Principles

- Apple-quality minimalism. No gradients except subtle scene background. No drop shadows except focus rings. Generous whitespace.
- Dark mode is the only mode. All chrome (top bar, panels, drawers) is dark. The 3D scene is the lightest part of the page.
- Information density is moderate. Default to less. Dense data lives in detail drawers, not main views.
- Motion is communicative, not decorative. Every animation tells the user something happened.
- Two font weights only: 400 regular and 500 medium. Never 600 or 700.
- Sentence case everywhere. Never title case, never all caps (except eyebrow labels with letter-spacing).
- No emoji. Use Tabler outline icons via `@tabler/icons-react`.

### Tokens

Background colors:
- Page: `#0a0a0f`
- Surface: `#14141f`
- Surface 2: `#1d1d2e`

Text colors:
- Primary: `#f5f5f7`
- Secondary: `#a0a0b0`
- Tertiary: `#6f6f80`

Accent: `#3b82f6` (Infoblox blue). Hover: `#60a5fa`.

Semantic: danger `#ef4444`, warning `#f59e0b`, success `#10b981`.

Segment colors (used for asset nodes in the 3D scene):
- External: `#888780`
- Identity: `#7F77DD`
- Finance: `#D85A30`
- Engineering: `#1D9E75`
- Sales: `#D4537E`
- IT: `#378ADD`
- OT: `#E24B4A`
- Endpoint: `#B4B2A9`

Border radii: 6px (sm), 10px (md, default), 14px (lg, cards), 20px (xl).

Fonts: Inter for sans, JetBrains Mono for monospace numerics and IPs.

Type scale: 32px hero metric, 22px h1, 16px h2, 14px body, 12px small, 11px eyebrow with 0.06em letter-spacing.

Motion durations: 150ms fast, 280ms base, 600ms slow, 1500ms cinematic.

---

## 7. 3D scene architecture

### Stack

React Three Fiber (R3F) wraps Three.js declaratively. @react-three/drei provides OrbitControls, Html for label overlays, and Line for edges. Do not use raw Three.js — R3F is non-negotiable for ergonomics.

### Scene graph

Single Canvas wraps the whole scene. Inside:
- Ambient light at intensity 0.45.
- Two directional lights — one warm at position [10, 20, 10] intensity 0.7, one cool purple at [-10, 10, -10] intensity 0.3.
- NetworkGraph component renders all assets and edges.
- AttackTracer component overlays active kill chain animations.
- BlastRadiusOverlay component overlays selected-asset blast radius.
- OrbitControls with damping factor 0.08, auto-rotate at 0.4 rad/s, min distance 6, max distance 40, max polar angle PI/2.1 (prevents going below the horizon).

### Asset node rendering

Each asset is a sphere mesh. Geometry: `SphereGeometry(size, 20, 20)`. Size: `0.28 + criticality * 0.07` — crown jewels are visibly larger.

Material: `meshStandardMaterial` with color and emissive both set to the segment color. Emissive intensity is 0.12 for normal assets, 0.4 for crown jewels (criticality 5). Roughness 0.4, metalness 0.15.

Crown jewels (criticality 5) pulse via `useFrame` — emissive intensity oscillates between 0.25 and 0.55 at 2Hz.

Crown jewels also show a floating label using drei's `Html` component. Label content is the asset name. Position offset is `-22px` margin top. Font size 10px, weight 500. Text shadow for legibility.

### Edge rendering

Use drei's `Line` component. Default color `#2a2a3a`, opacity 0.45, line width 1.

Edge types and styling:
- `network` — solid, default color.
- `identity` — solid, slightly lighter color `#5a5a8a`.
- `dns` — dashed, dashScale 4, gapSize 0.4.
- `data-flow` — solid, thicker.
- `trust` — dashed.

Active attack edges (during AEV animation) override to `#ef4444`, opacity 1, width 2, with a UV-scrolling animated shader. Particles spawn at source and flow to target over 1 second.

### Attack animation system

For each kill chain hop, in sequence:
1. Source node pulses red (emissive intensity ramps 0 to 1 over 500ms).
2. After 300ms, particles spawn at source and flow along the edge for 1000ms.
3. At particle arrival, target node either turns red emissive (compromised) or shows a small green X marker at the edge midpoint (blocked).
4. Narrator strip updates synchronously with the hop description.

Each hop takes 1800ms total. A 5-hop chain takes 9 seconds. User can press Space to pause, Right arrow to step forward, Left arrow to step back.

### Performance budget

- Target 60fps with 100 assets and 250 edges on a 2020 MacBook Pro.
- For v1 scale (30 Acme Corp assets), no special optimization needed.
- For larger scenes, instance crown-jewel rings as a single instanced mesh and use LOD switching at 30m, 60m, 100m camera distance.

### Camera choreography

Default camera position: `[14, 9, 14]`, fov 50, looking at origin. Auto-rotate at 0.4 rad/s.

For asset focus (click in Attack Path view): animate the camera target over ~800ms using a custom hook that interpolates between current and target positions with `cubic-bezier(0.2, 0.6, 0.2, 1)` easing.

For the hero intro: start at `[20, 14, 20]`, animate to `[14, 9, 14]` over 1.5 seconds.

---

## 8. LLM narrator system

The narrator strip at the bottom of every scene shows streaming text. In v1, the narrator uses pre-canned strings from a `narrator-canned.ts` file. The narration is keyed by event type: `scene-load`, `asset-selected`, `attack-hop`, `agent-action`, `control-toggle`, `ambient`.

For v2 (post-contest), wire up the Anthropic API for live LLM narration. The server route streams text via SSE. System prompt frames the narrator as a calm documentary voiceover — one or two sentences only, plain English, dollar values when relevant, customer's org name referenced, no speculation beyond data.

In v1, ship the canned-string fallback. Make the streaming-text UI itself work (typewriter or fade-in per sentence) so the v2 LLM upgrade is a one-line swap.

---

## 9. Data model

The core entities, described as concepts. Claude Code should generate TypeScript interfaces from these descriptions, located at `src/lib/types/twin.types.ts`.

- **Asset.** Represents a discoverable thing in the network — workstation, server, database, IoT device, OT controller, application. Has: id (string), name, segment (one of 8 values), criticality (0–5 integer), type (workstation, database, etc.), vendor, model, OS, OS version, IP addresses (array), MAC addresses (array), first seen, last seen, sources (array of source systems that contributed), owner, location, position3D (x, y, z for scene rendering), tags (array of strings).

- **Edge.** Represents a relationship between two assets. Has: id, source asset id, target asset id, type (one of: dns, identity, network, data-flow, trust), weight (0–1 used for attack-path scoring), protocols (optional array), observed (boolean — true if from telemetry, false if inferred).

- **Threat actor.** Has: id, name, family (aitm, banking-trojan, apt, commodity-malware), origin (optional, country), TIG source (provenance reference), MITRE tactics array, last observed timestamp, campaign count, description, and a kill chain template (array of kill chain steps).

- **Kill chain step.** Has: id, order, time label (T-48h, T-0, T+18m), technique name, MITRE ID (optional), source asset (or 'external'), target asset, Tabler icon name, description, Twin disposition (blocked, observed, contained, manual), Twin explanation (why Twin reached that disposition), Infoblox control (td, dns-armor, soc-insights, agentic-takedown).

- **Agent action.** Has: id, agent name (e.g., "Action agent"), proposed timestamp, description, target asset ids, simulation result (verdict, dependencies affected, users affected, services rerouted, rationale, confidence score), status (pending, approved, rejected, escalated).

- **Mitigation.** Has: id, name, type (control, segmentation, patch, policy), setup cost in dollars, annual cost, expected risk reduction (0–1), affected scenarios (array of threat actor ids), Infoblox product (optional), status.

- **Risk scenario.** Has: id, name, threat actor id, primary target asset, expected loss in dollars, annual probability (0–1), ALE (expected loss × probability), 30-day trend, top mitigations.

- **CRQ snapshot.** Point-in-time risk picture. Has: timestamp, total ALE in dollars, top scenarios array, active controls (mitigation ids), MDP inputs (events per month, actions array).

- **Insurance policy.** Has: insurer id and name, insured org name, policy id, base premium, Twin risk delta (negative = premium reduction), net premium, Twin signals (string array), recommended actions (mitigation id + premium delta), loss ratio impact, Infoblox rev share percentage.

- **Org info.** Has: name, asset count, last sync at.

- **Data source health.** Has: source name, healthy boolean, last sync at, error message (nullable).

- **View name.** String enum: `overview`, `aev`, `attack-path`, `agent-iez`, `crq`, `underwriter`.

---

## 10. Data source abstraction

Every data fetch in the app goes through one interface called `TwinDataClient`. There is no direct fetch call anywhere else in the codebase.

The interface has these methods:
- `getOrgInfo()` returns org info.
- `listAssets(filter?)` returns filtered assets.
- `getAsset(id)` returns one asset or throws.
- `searchAssets(query)` returns matching assets.
- `getEdges(assetIds?)` returns edges, optionally filtered.
- `listThreatActors()` returns all actors.
- `getThreatActor(id)` returns one actor.
- `computeKillChain(actorId, targetAssetId)` returns the kill chain steps.
- `computeBlastRadius(sourceAssetId, maxHops?)` returns asset ids reachable.
- `listPendingAgentActions()` returns the agent action queue.
- `resolveAgentAction(actionId, decision)` resolves an action.
- `getCurrentCrqSnapshot()` returns the current risk snapshot.
- `getCrqHistory(days)` returns historical snapshots.
- `listMitigations()` returns all mitigations.
- `toggleMitigation(id, on)` toggles a control and returns the recomputed snapshot.
- `getInsurancePolicy(insurerId?)` returns the policy.
- `getDataSourceHealth()` returns health status array.

### Three implementations

- **MockClient.** Default. Imports static JSON from `src/data/mock/`. Includes 50–200ms artificial delay per method to make UI feel realistic. Maintains in-memory state for active controls so toggling persists during the session.
- **RealClient.** Wraps Infoblox CSP APIs. In v1, this is a stub — every method throws "not implemented." The constructor accepts `RealClientConfig` with base URLs and API key.
- **HybridClient.** Mixes real and mock per method, controlled by a routing config. Useful for pilots. In v1, this is also a stub that delegates to MockClient.

### Factory

A factory function reads `import.meta.env.VITE_TWIN_DATA_SOURCE` (values: `mock`, `live`, `hybrid`) and returns the right client. The client is created once at module load and exported as a singleton.

### MDP formula (the math layer)

The CRQ dashboard computes ALE using the Markov Decision Process formula from Gartner G00835632:

```
ALE = E × Σ ( P(action_i) × Reward(action_i) )

where:
  E = events per month × 12
  P(action_i) = annual probability of action i
  Reward(action_i) = avoided loss if Twin prevents this action
```

When a mitigation is active, its `expectedRiskReduction` reduces the probability of affected scenarios. Multiply by 0.6 to account for real-world control effectiveness (controls never deliver 100% of theoretical reduction). This factor is documented in the on-screen "How is this calculated?" explainer.

Helper: `formatDollars(n)` returns `$4.2M` for 4_200_000, `$340K` for 340_000.

---

## 11. Real Infoblox API integration (for v2)

Document this for context. RealClient stubs all methods in v1.

### Universal Asset Insights

Base URL: `https://csp.infoblox.com/api/uai/v1`. Auth: API key in `Authorization: Token <key>` header.

Endpoints:
- `GET /assets` returns paginated asset list, default 100 per page.
- `GET /assets/{id}` returns one asset.
- `GET /assets/search?q=<query>` returns fuzzy search results.
- `GET /relationships` returns edges.

Canonical asset schema from Infoblox docs: name, type, location, manufacturer, model, vendor, operating_system, operating_system_version, first_seen, last_seen, ip_address, mac_address, serial_number, status, sources (array of contributing discovery sources).

### Threat Defense

Base URL: `https://csp.infoblox.com/api/atcfw/v1`. Endpoints: `GET /detections`, `GET /policies`, `GET /indicators?actor=<actorId>`.

### Phoebe TIG / TIDE

Base URL: `https://csp.infoblox.com/api/tide/v1`. Endpoints: `GET /threats?type=actor`, `GET /threats/{actorId}/iocs`, `GET /threats/{actorId}/campaigns`.

### SOC Insights

Base URL: `https://csp.infoblox.com/api/sci/v1`. Endpoints: `GET /insights`, `GET /insights/{id}/timeline`.

### NIOS DDI

Per-customer Grid Manager URL. Auth via username/password or API token. Endpoints: `GET /wapi/v2.13/record:a`, `GET /wapi/v2.13/lease`, `GET /wapi/v2.13/network`.

### Auth and rate limits

CSP APIs are limited to 100 requests per second per API key. RealClient should implement a token bucket rate limiter at 80 req/s. Cache asset graph for 60 seconds. Use ETags for asset list endpoints.

---

## 12. Mock data strategy

The canonical fake company is Acme Corp — a pharmaceutical manufacturer with 4,200 employees, 487 assets in production, 30 modeled in v1 for performance and demo simplicity. Pharma is the right choice because it makes OT/SCADA credible and pharma is a known high-value target so the threat scenarios feel real.

### Mock asset graph

30 assets across 6 segments. Generate these and save to `src/data/mock/acme-corp-assets.json`. Each asset has position3D coordinates organized by segment in a roughly 3D layout:

- **External (4 assets) near top, y ≈ 5–7:** Internet edge, Firewall (Palo Alto PA-5450), Email gateway (Proofpoint), Web DMZ (F5 BIG-IP).
- **Identity (3 assets) middle, y ≈ 4:** AD-PRIMARY (crit 5, Microsoft Windows Server 2022), MFA service (Okta), PKI (DigiCert).
- **Finance (5 assets) left wing, x ≈ -5:** EXEC-WS-CFO (Dell Precision, Windows 11, crit 4), EXEC-WS-CEO (Apple MacBook Pro, crit 4), FIN-DB (Oracle Exadata, crit 5), SAP-PROD (S/4HANA on SUSE Linux, crit 5), Payroll (Workday, crit 4).
- **Engineering (4 assets) right wing, x ≈ 5:** Eng jump host (Ubuntu 22.04, crit 3), R&D-VAULT (HashiCorp Vault, crit 5), BUILD-SVR (Ubuntu, crit 4), GIT-PRIMARY (GitLab, crit 4).
- **IT (4 assets) back center, z ≈ -3:** DC-CORE (Cisco Nexus 9508, crit 5), File server (NetApp FAS9500, crit 3), Backup vault (Rubrik, crit 3), VPN gateway (Palo Alto GlobalProtect, crit 3).
- **Sales (3 assets) front center, z ≈ 3:** CRM-APP (Salesforce, crit 3), CRM-DB (Oracle, crit 4), Marketing CMS (Adobe AEM, crit 2).
- **OT (3 assets) below, y ≈ -2 to -3:** MFG-SCADA (Siemens WinCC OA on Windows Server 2019, crit 5), PLC line 1 (Rockwell ControlLogix, crit 4), PLC line 2 (Rockwell, crit 4).
- **Endpoints (4 pools):** Endpoints — Finance, Endpoints — Engineering, Endpoints — Sales, Exec cluster. Each pool is a single asset representing many real endpoints (crit 1).

Each asset includes realistic IP addresses in RFC1918 ranges segmented by purpose (10.1.x for identity, 10.2.x for finance, etc.), MAC addresses in OUI format, first-seen and last-seen ISO 8601 timestamps, and tags like `crown-jewel`, `pci-dss`, `sox`, `ot`, `safety-critical`.

### Mock edges

Roughly 50 edges. Save to `src/data/mock/acme-corp-edges.json`.

Natural connections:
- Internet → Firewall, Email gateway, Web DMZ.
- Firewall → AD-PRIMARY.
- AD-PRIMARY identity-edges to all critical workstations and servers.
- MFA → AD-PRIMARY, EXEC-WS-CFO, EXEC-WS-CEO, Eng jump.
- Finance chain: EXEC-WS-CFO → FIN-DB → SAP-PROD → Payroll.
- Engineering chain: Eng jump → R&D-VAULT, Eng jump → BUILD-SVR → GIT-PRIMARY.
- IT hub: DC-CORE → File server, DC-CORE → Backup, DC-CORE → MFG-SCADA.
- Sales: CRM-APP → CRM-DB, DC-CORE → CRM-DB.
- VPN: VPN gateway → all endpoint pools.
- Email: Email gateway → all endpoint pools (phishing path).
- Endpoint pools → AD-PRIMARY (identity dependency).
- OT: MFG-SCADA → PLC line 1, MFG-SCADA → PLC line 2.
- Exec cluster → AD-PRIMARY, EXEC-WS-CFO, EXEC-WS-CEO.

Mix edge types: most are `network`, some are `identity` (AD edges, MFA edges), some are `dns` (any edge involving email gateway or internet-facing services), some are `data-flow` (finance chain, sales chain).

### Mock threat actors

Save 4 actors to `src/data/mock/threat-actors.json`. Each with a full kill chain template.

1. **Mythos** — DNS-based AiTM, family `aitm`, origin unknown, TIG source "Infoblox Phoebe TIG", MITRE tactics: initial-access, credential-access, lateral-movement, exfiltration. Campaign count 47. Kill chain steps (5 total):
   - T-48h: "Lookalike domain registered" (acme-finance-portal.com), source external, target ast_email-gw. Twin disposition: blocked. Explanation: "Threat Defense intercepts via Phoebe TIG newly-observed-domain feed." Infoblox control: td.
   - T-24h: "Spear-phish 12 finance staff", source ast_email-gw, target ast_emp-pool-finance. Twin disposition: blocked. Explanation: "TD blocks pre-delivery for 11 of 12 endpoints." Infoblox control: td.
   - T-2h: "CFO clicks → AiTM steals session", source ast_emp-pool-finance, target ast_cfo-ws. Twin disposition: observed. Explanation: "1 endpoint unprotected — Twin flags as drift."
   - T-0: "Replay against AD", source ast_cfo-ws, target ast_ad-primary. Twin disposition: contained. Explanation: "MFA bypass attempt — SOC Insights triages." Infoblox control: soc-insights.
   - T+18m: "Reach FIN-DB", source ast_ad-primary, target ast_fin-db. Twin disposition: contained. Explanation: "Contained at hop 2 with recommended controls deployed."

2. **K99** — Cambodia banking trojan, family `banking-trojan`. 4 steps targeting Payroll. First hop blocked by TD via Valarie Rabideau April 2026 paper C2 signature.

3. **Glasswing** — Sophisticated AiTM with long-aged domains, family `aitm`. 4 steps targeting EXEC-WS-CEO and R&D-VAULT. None blocked — intentionally shows where Twin surfaces exposures that need human response.

4. **GhostNet** — State-linked espionage, family `apt`, long-dwell. 3 steps targeting R&D-VAULT. Two of three blocked by long-dwell DNS pattern detection.

Use realistic Tabler icon names per step: `ti-world`, `ti-mail`, `ti-mouse`, `ti-lock`, `ti-database`, `ti-shield-off`, `ti-key`, `ti-credit-card`, `ti-arrows-up`, `ti-folder-open`, `ti-cloud`, `ti-eye`, `ti-package-export`, `ti-bug`, `ti-download`.

### Mock mitigations

Save 6 mitigations to `src/data/mock/mitigations.json`:

1. `m_td-finance` — Deploy Threat Defense on Finance segment. Setup $140K, annual $32K. Reduces affected scenarios by 41%. Affects: mythos, k99. Infoblox product: td.
2. `m_cyber911` — Enable Cyber 911 failover. Setup $85K, annual $24K. Reduces by 18%. Affects: mythos, k99. Infoblox product: cyber-911.
3. `m_mfa-exec` — Tighten AD MFA for execs. Setup $22K, annual $4K. Reduces by 24%. Affects: mythos, glasswing.
4. `m_segment-rd` — Segment R&D from corporate AD. Setup $95K, annual $12K. Reduces by 31%. Affects: ghostnet, glasswing.
5. `m_inflight` — Enable Inflight email security pre-delivery. Setup $110K, annual $28K. Reduces by 35%. Affects: mythos, k99. Infoblox product: inflight.
6. `m_soc-insights` — Roll out SOC Insights agentic triage. Setup $65K, annual $18K. Reduces by 22%. Affects: all. Infoblox product: soc-insights.

### 90-day CRQ history

Generated on demand by MockClient.getCrqHistory(days). Returns an array of daily snapshots from `days` ago to today. Starts at $5.1M ALE and trends down to $4.2M over 90 days with ±3% daily noise. No JSON file needed — generated in code.

---

## 13. Tech stack (opinionated, do not deviate)

| Concern | Choice |
|---|---|
| Bundler | Vite 5 |
| Framework | React 18 + TypeScript strict mode |
| 3D | React Three Fiber + @react-three/drei |
| Styling | Tailwind CSS, dark mode only |
| State | Zustand (lightweight, no Redux ceremony) |
| Routing | Simple useState in App.tsx, no router library |
| Icons | @tabler/icons-react |
| Mock data | Static JSON imports via Vite's resolveJsonModule |
| Package manager | pnpm preferred, npm acceptable |

Do not use Next.js — overkill for this SPA. Do not use Material UI — too heavy. Do not use Redux or MobX — Zustand wins. Do not use raw Three.js — R3F is required.

---

## 14. Project structure

Generate this folder structure:

```
infoblox-twin/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/globals.css
    ├── lib/
    │   ├── types/twin.types.ts
    │   ├── data-clients/
    │   │   ├── interface.ts
    │   │   ├── mock-client.ts
    │   │   ├── real-client.ts
    │   │   └── factory.ts
    │   ├── twin/crq-mdp.ts
    │   ├── scene/colors.ts
    │   ├── llm/narrator-canned.ts
    │   └── state/store.ts
    ├── data/mock/
    │   ├── acme-corp-assets.json
    │   ├── acme-corp-edges.json
    │   ├── threat-actors.json
    │   └── mitigations.json
    ├── components/
    │   ├── scene/
    │   │   ├── SceneRoot.tsx
    │   │   ├── NetworkGraph.tsx
    │   │   ├── AssetNode.tsx
    │   │   ├── EdgeLine.tsx
    │   │   └── AttackTracer.tsx
    │   ├── shell/
    │   │   ├── TopBar.tsx
    │   │   ├── TabNav.tsx
    │   │   ├── PersonaSwitcher.tsx
    │   │   └── NarratorStrip.tsx
    │   └── twin/
    │       ├── HeroLanding.tsx
    │       ├── ThreatActorCard.tsx
    │       ├── KillChainTimeline.tsx
    │       ├── AgentActionCard.tsx
    │       ├── CrqHero.tsx
    │       ├── CrqControlList.tsx
    │       └── MdpExplainer.tsx
    └── views/
        ├── OverviewView.tsx
        ├── AevLabView.tsx
        ├── AttackPathView.tsx
        ├── AgentIezView.tsx
        ├── CrqView.tsx
        └── UnderwriterView.tsx
```

---

## 15. Acceptance criteria

Must work for v1 demo:

- `pnpm install` completes without errors.
- `pnpm dev` starts the dev server on port 5173.
- Opening `http://localhost:5173` shows the hero landing for ~2.5 seconds with three streaming status lines.
- After 2.5 seconds, the 3D scene fades in showing Acme Corp's 30 assets.
- Crown jewels (criticality 5 — AD-PRIMARY, FIN-DB, SAP-PROD, R&D-VAULT, DC-CORE, MFG-SCADA) pulse red and show floating labels.
- Other assets are static colored spheres organized by segment in 3D space.
- Edges render as thin lines between connected assets, with subtle visual differentiation by type.
- Camera auto-rotates slowly. Drag to orbit, scroll to zoom.
- Top bar shows "Acme Corp · 30 assets · 50 relationships · mock mode".
- Six tabs (Overview, AEV Lab, Attack Path, Agent IEZ, Board CRQ, Underwriter) are clickable and switch views without errors.
- Bottom narrator strip shows a contextual sentence per view.
- AEV Lab tab shows 4 threat actor cards. Clicking one triggers the kill chain animation (red traces through the scene) with synchronized narrator updates and a timeline appearing below.
- Attack Path tab supports clicking any asset and shows inbound paths + blast radius + dollar exposure in the side panel.
- Agent IEZ tab shows the 4 pending agent actions. Clicking one shows the Twin's verdict with rationale.
- Board CRQ tab shows the dollar ALE prominently with a sparkline trend and a control toggle list that recomputes ALE in real-time.
- Underwriter tab shows the carrier card with premium breakdown.
- All views work in mock mode with no external network requests.
- TypeScript strict mode compiles without errors.

---

## 16. Out of scope for v1

- Live Anthropic API integration for the narrator (canned strings only).
- Real Infoblox API integration (RealClient stubs all methods).
- Real attack-path graph algorithm (use BFS for blast radius in mock client, return precomputed paths for kill chain).
- ServiceNow CMDB integration.
- 3D post-processing effects (bloom, depth of field). Add in v2 if needed.
- VR/AR support.
- Multi-tenant deployment.
- Authentication (the app loads directly, no login).
- Mobile-responsive design for tabs other than CRQ (CRQ must be mobile-first; others can be desktop-only for v1).

---

## 17. How to build this with Claude Code

After this spec is saved as `SPEC.md` in the project root, the build sequence is:

**First prompt to Claude Code:**

> Read SPEC.md in full. Then scaffold the entire project per sections 13, 14, and the Files-to-create implications. Generate all configuration files (package.json, tsconfig, vite.config, tailwind.config, postcss.config, index.html, .env.example, .gitignore, README.md). Generate all TypeScript types per section 9. Generate the TwinDataClient interface per section 10. Generate the MockClient with full implementations including the in-memory active-controls state. Generate stub RealClient and the factory. Generate the mock JSON files per section 12 — 30 assets, ~50 edges, 4 threat actors with full kill chains, 6 mitigations. Generate the 3D scene components per section 7 (SceneRoot, NetworkGraph, AssetNode, EdgeLine, AttackTracer). Generate the six view components per section 4. Generate the shell components (TopBar, TabNav, PersonaSwitcher, NarratorStrip, HeroLanding). Wire App.tsx to switch views via useState. After all files are written, run `pnpm install` then `pnpm dev`. Verify the acceptance criteria in section 15.

**Second prompt (if anything is broken):**

> Open http://localhost:5173 in your test browser. Walk through the acceptance criteria in section 15 one by one. For each failure, identify the root cause and fix the relevant file. Re-verify after each fix. Do not move on until each criterion passes.

**Subsequent iteration prompts:**

> Polish the AEV Lab kill chain animation. The red attack traces should look more cinematic — particles flowing along edges with a slight glow, source nodes pulsing before the trace fires, target nodes lighting up emissive red on arrival. Use shader materials if needed for the particle flow. Keep within the design tokens — no rainbow effects, no excessive glow.

> Add the LLM narrator's Anthropic integration. Server route should stream via SSE. Use claude-sonnet-4-5-20250929 for the model. System prompt per section 8. Fall back to canned strings if ANTHROPIC_API_KEY is missing.

> Wire the RealClient methods one by one. Start with listAssets pointing at the UAI base URL. Use a fetch wrapper with the Authorization: Token header. Normalize the UAI response into the canonical Asset schema.

---

## End of specification

The hero moment is the most important specification in this document. If anything else in this file conflicts with making the 60-second hero moment feel impressive, the hero moment wins.

Build it.