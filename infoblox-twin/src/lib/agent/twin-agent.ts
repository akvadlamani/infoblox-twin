// Twin Agent — a streaming chat experience over the digital twin.
//
// In production this would call the Anthropic API (claude-sonnet) with tool use
// over the TwinDataClient methods (listAssets, computeKillChain, computeBlastRadius,
// listMitigations, getCurrentCrqSnapshot, …). Here we run a pure-front-end
// "agent shell" that does intent matching, emits realistic tool-call traces, and
// streams a final answer. Swapping the implementation for a real LLM is one file.

import { twinClient } from '@/lib/data-clients/factory';
import type { Asset, Mitigation, RiskScenario, ThreatActor } from '@/lib/types/twin.types';
import type { AgentId } from '@/lib/types/agent.types';
import { formatDollars } from '@/lib/scene/colors';

export type AgentRole = 'user' | 'assistant' | 'tool' | 'system';

export interface AgentMessage {
  id: string;
  role: AgentRole;
  // assistant body. Streamed in chunks while in flight.
  content: string;
  // Which agent owns this message. Assistants attribute. Tool calls inherit
  // the calling agent. System messages narrate handoffs.
  agentId?: AgentId;
  // Tool calls modeled like Claude Messages API tool_use blocks
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  // chip suggestions emitted by the assistant — clicking them sends another turn
  suggestions?: string[];
  status?: 'streaming' | 'done';
  createdAt: number;
}

interface ToolEmit {
  name: string;
  input: Record<string, unknown>;
  result: string;
  // Agent that ran this tool (defaults to primary).
  by?: AgentId;
}

interface AgentFlow {
  // Primary agent that owns the turn.
  primary: AgentId;
  // Optional handoffs introduced mid-flow as system bubbles.
  handoffs?: { fromId: AgentId; toId: AgentId; rationale: string }[];
  toolCalls: ToolEmit[];
  answer: string;
  suggestions?: string[];
}

const uid = () => Math.random().toString(36).slice(2, 10);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Intent matching is intentionally simple keyword routing.
// We can drop in real Anthropic tool-use later behind the same function shape.
async function planFlow(question: string): Promise<AgentFlow> {
  const q = question.toLowerCase();

  const [assets, edges, mitigations, snapshot, actors] = await Promise.all([
    twinClient.listAssets(),
    twinClient.getEdges(),
    twinClient.listMitigations(),
    twinClient.getCurrentCrqSnapshot(),
    twinClient.listThreatActors(),
  ]);

  if (/(blast|reach|expos|risk).*fin-?db|fin-?db.*(blast|reach|expos|risk)/.test(q)) {
    return blastFlow('ast_fin-db', assets, mitigations);
  }
  if (/(blast|reach|expos).*rd|rd.*(blast|reach|expos)|r&d|vault/.test(q)) {
    return blastFlow('ast_rd-vault', assets, mitigations);
  }
  if (/(blast|reach|expos).*scada|ot|plc/.test(q)) {
    return blastFlow('ast_mfg-scada', assets, mitigations);
  }
  if (/(blast|reach|expos).*ad|active directory/.test(q)) {
    return blastFlow('ast_ad-primary', assets, mitigations);
  }
  if (/(blast|reach|expos)/.test(q)) {
    return blastFlow('ast_fin-db', assets, mitigations);
  }

  if (/yesterday|since|last night|overnight|what.*chang/.test(q)) {
    return overnightFlow();
  }

  if (/(patch|cve|vuln)/.test(q)) {
    return patchFlow();
  }

  if (/(viper|aitm|phish|breach|replay|kill chain)/.test(q)) {
    return replayFlow(actors);
  }
  if (/decoy|dog|long.dwell|c2/.test(q)) {
    return decoyFlow(actors);
  }
  if (/seahorse|aged.*domain/.test(q)) {
    return seahorseFlow(actors);
  }
  if (/vextrio|tds/.test(q)) {
    return vextrioFlow(actors);
  }

  if (/(compliance|pci|hipaa|gdpr|sox|drift)/.test(q)) {
    return complianceFlow(assets);
  }

  if (/(ale|exposure|dollar|loss|crq|board)/.test(q)) {
    return crqFlow(snapshot.topScenarios, snapshot.totalAle, mitigations);
  }

  if (/(control|mitigat|toggle|defen|deploy)/.test(q)) {
    return controlsFlow(mitigations, snapshot.topScenarios);
  }

  if (/(agent|action|approve|sandbox|iez|ibiq)/.test(q)) {
    return agentIezFlow();
  }

  if (/(crown|jewel|critical)/.test(q)) {
    return crownJewelsFlow(assets);
  }

  if (/(what.*can.*you|help|capable|do)/.test(q)) {
    return helpFlow();
  }

  // Fallback: act like the assistant searched and didn't find a clean match.
  return {
    primary: 'brief',
    toolCalls: [
      {
        name: 'searchAssets',
        input: { query: question.slice(0, 40) },
        result: 'No semantic match. Falling back to a guided summary.',
      },
    ],
    answer:
      "I didn't recognize that as a graph question, but here's where I usually start: ask about an asset's blast radius (\"what's reachable from FIN-DB?\"), a CVE's actual risk against your network, or what changed overnight. You can also point me at an actor — Vigorish Viper, VexTrio, Savvy Seahorse, or Decoy Dog.",
    suggestions: [
      'What changed since yesterday?',
      "What's reachable from FIN-DB?",
      'Score CVE-2026-29911 against my network',
      'Replay Vigorish Viper hop by hop',
    ],
  };
}

function blastFlow(
  targetId: string,
  assets: Asset[],
  mitigations: Mitigation[]
): AgentFlow {
  const target = assets.find((a) => a.id === targetId);
  if (!target) return helpFlow();
  const exposure = target.criticality * target.criticality * 220000;
  const top = mitigations
    .slice()
    .sort((a, b) => b.expectedRiskReduction - a.expectedRiskReduction)
    .slice(0, 3);
  return {
    primary: 'hunter',
    handoffs: [
      { fromId: 'hunter', toId: 'brief', rationale: 'Hunter found the paths — Brief is summarizing them.' },
    ],
    toolCalls: [
      {
        name: 'getAsset',
        input: { id: targetId },
        result: `${target.name} · ${target.segment} · criticality ${target.criticality}`,
      },
      {
        name: 'computeInboundPaths',
        input: { targetAssetId: targetId, maxHops: 4 },
        result: '5 inbound paths · top exploitability 56',
      },
      {
        name: 'computeBlastRadius',
        input: { sourceAssetId: targetId, maxHops: 3 },
        result: `${Math.max(2, target.criticality * 2)} assets reachable in 3 hops`,
      },
      {
        name: 'listMitigations',
        input: { affecting: targetId },
        result: `${top.length} mitigations matched`,
      },
    ],
    answer: `**${target.name}** sits in the **${target.segment}** segment at criticality **${target.criticality}**.

I see **5 inbound paths**, the riskiest going **Internet edge → Firewall → AD-PRIMARY → ${target.name}** with exploitability 56.

Outbound, ${Math.max(2, target.criticality * 2)} assets are reachable in 3 hops — the heavy hitters are SAP-PROD and Payroll.

Expected loss against this asset is **${formatDollars(exposure)}** at current control posture.

The three controls that move the needle most:
${top.map((m) => `  • ${m.name} — ↓ ${Math.round(m.expectedRiskReduction * 100)}% risk · setup ${formatDollars(m.setupCost)}`).join('\n')}

Open **Blast Radius** to walk this interactively.`,
    suggestions: [
      'Open blast radius for ' + target.name,
      'How much would deploying TD on Finance reduce the ALE?',
      "What's the highest-risk inbound path?",
    ],
  };
}

function overnightFlow(): AgentFlow {
  return {
    primary: 'brief',
    toolCalls: [
      { name: 'getDriftSince', input: { hours: 24 }, result: '5 changes detected' },
      { name: 'listThreatObservations', input: { hours: 24 }, result: '14 phish attempts, 11 blocked' },
      { name: 'listPatchSloBreaches', input: {}, result: '4 of 6 CVEs past SLA' },
      { name: 'listComplianceDrift', input: { zones: ['pci', 'hipaa', 'gdpr', 'sox'] }, result: '3 in, 1 out' },
    ],
    answer: `Four things changed overnight and want a decision today:

1. **FIN-DB picked up 5 new inbound paths** — two new finance laptops and a freshly-aged Savvy Seahorse lookalike domain. Net exposure on FIN-DB is up 8%.
2. **4 of 6 open CVEs are past your patch SLA.** CVE-2026-29911 on AD-PRIMARY scores 89 on my Twin-risk model — patch in the next 24h.
3. **Threat Defense blocked 11 of 12 Vigorish Viper phishing attempts pre-delivery.** One endpoint in the finance pool is drifting on endpoint coverage.
4. **3 assets drifted into your PCI-DSS scope** this week and 1 drifted out. Worth a 5-minute review before audit.

You can act on any of these from the **Overview** intel brief.`,
    suggestions: [
      'Score the AD-PRIMARY CVE for me',
      "Show me the FIN-DB blast radius",
      'Which assets drifted into PCI?',
    ],
  };
}

function patchFlow(): AgentFlow {
  return {
    primary: 'pilot',
    toolCalls: [
      { name: 'listOpenCves', input: {}, result: '6 CVEs open' },
      {
        name: 'scoreAgainstGraph',
        input: { cve: 'CVE-2026-29911', target: 'ast_ad-primary' },
        result: 'Twin risk 89 (CVSS 9.1) — reaches 12 assets in 3 hops, 3 crown jewels',
      },
      {
        name: 'scoreAgainstGraph',
        input: { cve: 'CVE-2026-31104', target: 'ast_fin-db' },
        result: 'Twin risk 55 — direct hit on crown jewel, 4d past SLA',
      },
    ],
    answer: `You have **6 open CVEs**. Ranked by what they actually touch on **your** network:

1. **CVE-2026-29911** — Windows Server Kerberos sigma flaw on AD-PRIMARY · Twin risk **89** · *patch now, within 24h*. Reaches 12 assets, 3 crown jewels.
2. **CVE-2026-19002** — Siemens WinCC OPC-UA on MFG-SCADA · Twin risk **65** · schedule in next maintenance window.
3. **CVE-2026-31104** — Oracle Exadata privilege escalation on FIN-DB · Twin risk **55** · 4 days past SLA already.

The remaining three (Vault, GitLab, AEM) are below 50 — risk acceptable on the current posture.

Open **Patch Risk** for the full ranking and recommendation.`,
    suggestions: [
      'Show me CVE-2026-29911 in the graph',
      'Why is the WinCC patch only second?',
      'What changes if I patch the top 3?',
    ],
  };
}

function replayFlow(actors: ThreatActor[]): AgentFlow {
  const viper = actors.find((a) => a.id === 'vigorish-viper');
  return {
    primary: 'hunter',
    toolCalls: [
      { name: 'getThreatActor', input: { id: 'vigorish-viper' }, result: 'Vigorish Viper · 170K+ domains' },
      { name: 'computeKillChain', input: { actorId: 'vigorish-viper' }, result: '5 hops · 3 blocked · 1 observed · 1 contained' },
    ],
    answer: `**Vigorish Viper** is the AiTM operator Infoblox disclosed in July 2024 — 170K+ associated domains. Against your environment the kill chain plays out in **5 hops**:

  1. T-48h · Spoofed Okta domain registered → *blocked by Threat Defense via NRD + Viper-cluster signature*
  2. T-24h · Spear-phish 12 finance staff → *blocked pre-delivery for 11; 1 unprotected endpoint*
  3. T-2h · Adversary-in-the-Middle on CFO workstation → *observed — endpoint protection drift*
  4. T-0 · Use Alternate Auth Material against AD → *contained by SOC Insights token-replay anomaly*
  5. T+18m · Pivot to FIN-DB → *contained at hop 2*

Twin would stop this attack chain in production. The single open exposure is endpoint drift in the finance pool.

Open **Breach Replay** to watch this hop-by-hop with the active MITRE technique pinned to each edge.`,
    suggestions: ['Replay Savvy Seahorse', 'Replay Decoy Dog', 'How do I close the endpoint drift?'],
  };
}

function decoyFlow(actors: ThreatActor[]): AgentFlow {
  return {
    primary: 'hunter',
    toolCalls: [
      { name: 'getThreatActor', input: { id: 'decoy-dog' }, result: 'Decoy Dog · DNS-C2 RAT · 3 hops' },
    ],
    answer: `**Decoy Dog** is the Pupy-derived DNS-C2 RAT Infoblox disclosed in April 2023. It uses very low-volume DNS beacons (one query every few hours) to evade detection.

Against your environment: **3 hops**, 2 blocked, 1 observed at the Vault. The blockers are Threat Defense (long-dwell DNS pattern) and DNS Armor (C2 resolution blocked at the jump host). The remaining exposure is **lack of segmentation between Engineering and R&D-VAULT**, which is also why Savvy Seahorse can reach Vault.

Segmenting R&D from corporate AD would cut Decoy Dog exposure by ~31%.`,
    suggestions: ['Show the segmentation cost', 'Replay Decoy Dog hop by hop'],
  };
}

function seahorseFlow(actors: ThreatActor[]): AgentFlow {
  return {
    primary: 'hunter',
    toolCalls: [
      { name: 'getThreatActor', input: { id: 'savvy-seahorse' }, result: 'Savvy Seahorse · aged-domain AiTM' },
    ],
    answer: `**Savvy Seahorse** ages its domains past your NRD reputation window before activation — that's why none of its 4 hops against your environment are currently blocked by Threat Defense alone. SOC Insights' anomaly model catches it at hop 2 (impossible-travel + Okta session replay), but I'd want to see MFA hardening on the exec cluster as a structural fix.

Top mitigations against Seahorse: **tighten AD MFA for execs** (−24%) and **segment R&D from corporate AD** (−31%).`,
    suggestions: ['Open the MFA mitigation', 'How does this compare to Vigorish Viper?'],
  };
}

function vextrioFlow(actors: ThreatActor[]): AgentFlow {
  return {
    primary: 'hunter',
    handoffs: [
      { fromId: 'hunter', toId: 'takedown', rationale: 'Hunter identified the leak mirrors — Takedown is filing abuse.' },
    ],
    toolCalls: [
      { name: 'getThreatActor', input: { id: 'vextrio' }, result: 'VexTrio · DNS TDS · 70K+ partner domains' },
    ],
    answer: `**VexTrio Viper** is the DNS-based traffic distribution system Infoblox disclosed in early 2024 — 70K+ partner domains routing victims to scams, stealers, and tech-support fraud.

Against your payroll path: 4 hops, all blocked. The interesting one is hop 4 — **Agentic Takedown** filed a registrar abuse report and the domain was seized in 2 hours. That's the kind of automation you get with the full Infoblox bundle.`,
    suggestions: ['Show me the payroll path', 'Open Agentic Takedown'],
  };
}

function complianceFlow(assets: Asset[]): AgentFlow {
  const pci = assets.filter((a) => a.tags?.includes('pci-dss') || (a.segment === 'finance' && a.criticality >= 3));
  return {
    primary: 'scope',
    toolCalls: [
      { name: 'classifyZone', input: { zone: 'pci' }, result: `${pci.length} assets in PCI scope` },
      { name: 'detectDrift', input: { zone: 'pci' }, result: '7 assets touch PCI but not classified inside' },
    ],
    answer: `Your **PCI-DSS** zone currently contains ${pci.length} in-scope assets — mainly the Finance segment (EXEC-WS-CFO, EXEC-WS-CEO, FIN-DB, SAP-PROD, Payroll) plus the exec mobile devices.

**Drift to watch:** 7 assets *touch* the PCI scope but are not classified inside it — AD-PRIMARY, MFA service, the finance endpoint pool, the exec cluster, two new finance laptops, and Microsoft 365. Each is a legitimate question for your QSA: should they be in scope, or should the boundary be hardened?

Open **Compliance** to see all four zones (PCI · HIPAA · GDPR · SOX) and walk drift one zone at a time.`,
    suggestions: ['Show GDPR scope', 'Why is M365 in PCI drift?'],
  };
}

function crqFlow(top: RiskScenario[], totalAle: number, mitigations: Mitigation[]): AgentFlow {
  const active = mitigations.filter((m) => m.status === 'active');
  return {
    primary: 'brief',
    toolCalls: [
      { name: 'getCurrentCrqSnapshot', input: {}, result: `ALE ${formatDollars(totalAle)}` },
      { name: 'listMitigations', input: { active: true }, result: `${active.length}/${mitigations.length} active` },
    ],
    answer: `**Annualized loss expectancy: ${formatDollars(totalAle)}**, down 18% from $5.1M 90 days ago. Computed live via the Markov Decision Process formula in Gartner G00835632.

The four scenarios driving the number:
${top
  .slice(0, 4)
  .map((s, i) => `  ${i + 1}. ${s.name} — ${formatDollars(s.ale)} ALE`)
  .join('\n')}

${active.length} of ${mitigations.length} controls active. Toggling any control in **Board CRQ** recomputes the number in real time.`,
    suggestions: [
      'What if I enable Threat Defense on Finance?',
      'Show me the top scenario in 3D',
      'Generate a board pack',
    ],
  };
}

function controlsFlow(mitigations: Mitigation[], scenarios: RiskScenario[]): AgentFlow {
  const top = mitigations
    .slice()
    .sort((a, b) => b.expectedRiskReduction - a.expectedRiskReduction)
    .slice(0, 3);
  return {
    primary: 'pilot',
    toolCalls: [
      { name: 'listMitigations', input: {}, result: `${mitigations.length} controls` },
    ],
    answer: `Your highest-leverage controls right now:

${top
  .map(
    (m, i) =>
      `  ${i + 1}. **${m.name}** — ↓ ${Math.round(m.expectedRiskReduction * 100)}% risk · setup ${formatDollars(m.setupCost)} · ${formatDollars(m.annualCost)}/yr`
  )
  .join('\n')}

Each one is wired into the MDP formula, so toggling it in **Board CRQ** recomputes ALE across all ${scenarios.length} top scenarios immediately.`,
    suggestions: ['Toggle TD on Finance', 'Compare cost vs reduction'],
  };
}

function agentIezFlow(): AgentFlow {
  return {
    primary: 'sandbox',
    toolCalls: [
      { name: 'listPendingAgentActions', input: {}, result: '4 pending' },
    ],
    answer: `Four IBIQ agent proposals are waiting on a Twin verdict:

  1. *Action agent* · quarantine finance endpoint pool → **safe** (96% confidence, 0 production deps)
  2. *Action agent* · block api-update-svc.io org-wide → **unsafe** (91% — breaks 412 users across 23 services)
  3. *Verification agent* · push TD policy to Engineering → **safe** (93%)
  4. *Triage agent* · auto-close 1,247 benign alerts → **safe-with-audit** (88% — escalate 8 outliers)

That's the point of the sandbox Twin — every agent proposal is replayed against a production-fidelity twin before it touches anything real.

Open **Agent IEZ** to approve or escalate each one.`,
    suggestions: ['Why is the domain block unsafe?', 'Approve the safe ones'],
  };
}

function crownJewelsFlow(assets: Asset[]): AgentFlow {
  const cj = assets.filter((a) => a.criticality === 5);
  return {
    primary: 'sentinel',
    toolCalls: [{ name: 'listAssets', input: { criticality: 5 }, result: `${cj.length} crown jewels` }],
    answer: `You have **${cj.length} crown jewels** under continuous watch:

${cj.map((a) => `  • **${a.name}** (${a.segment}) — ${a.vendor} ${a.model}`).join('\n')}

Each one is sized larger in the 3D scene and has a red orbit ring. The Twin recomputes their blast radius and exposure every time a control changes or a new asset joins the graph.`,
    suggestions: ["What's FIN-DB's blast radius?", "How exposed is R&D-VAULT?"],
  };
}

function helpFlow(): AgentFlow {
  return {
    primary: 'brief',
    toolCalls: [],
    answer: `I can answer questions over the live graph. Things I'm good at:

  • **Blast radius** — "what's reachable from FIN-DB?" or "what does it cost if AD-PRIMARY falls?"
  • **Patch triage** — "score CVE-2026-29911 against my network"
  • **Breach replay** — "walk me through Vigorish Viper" or "how does Decoy Dog get to the Vault?"
  • **Compliance** — "what's in my PCI scope?" or "where is the drift?"
  • **Risk in dollars** — "what's my ALE today?" or "what if I deploy TD on Finance?"
  • **Agent verdicts** — "what IBIQ actions are waiting?"

Or ask me what changed overnight.`,
    suggestions: [
      'What changed since yesterday?',
      "What's reachable from FIN-DB?",
      'Score this week\'s patches',
    ],
  };
}

/**
 * Stream an agent turn. Yields messages with realistic pacing.
 * Replace this with an Anthropic Messages API call (tool use enabled) to make it real.
 */
export async function* runAgent(question: string): AsyncGenerator<AgentMessage, void, unknown> {
  // 1. Brief "thinking" pause before any tool calls
  await wait(220);

  const flow = await planFlow(question);
  const primary = flow.primary;

  // Announce which agent is picking it up.
  yield {
    id: uid(),
    role: 'system',
    content: '',
    agentId: primary,
    createdAt: Date.now(),
  };
  await wait(300);

  // 2. Emit each tool call as its own message with a small delay
  for (const t of flow.toolCalls) {
    const inFlight: AgentMessage = {
      id: uid(),
      role: 'tool',
      content: '',
      agentId: t.by ?? primary,
      toolName: t.name,
      toolInput: t.input,
      status: 'streaming',
      createdAt: Date.now(),
    };
    yield inFlight;
    await wait(420 + Math.random() * 380);
    yield {
      ...inFlight,
      toolResult: t.result,
      status: 'done',
    };
  }

  // 3. If there's a handoff queued, narrate it before the final answer.
  let answerAgent: AgentId = primary;
  if (flow.handoffs && flow.handoffs.length > 0) {
    for (const h of flow.handoffs) {
      yield {
        id: uid(),
        role: 'system',
        content: h.rationale,
        agentId: h.toId,
        createdAt: Date.now(),
      };
      answerAgent = h.toId;
      await wait(380);
    }
  }

  // 4. Stream the final answer, attributed to the answering agent.
  const id = uid();
  const tokens = flow.answer.split(/(\s+)/); // keep whitespace
  let acc = '';
  for (let i = 0; i < tokens.length; i++) {
    acc += tokens[i];
    yield {
      id,
      role: 'assistant',
      content: acc,
      agentId: answerAgent,
      status: 'streaming',
      createdAt: Date.now(),
    };
    // ~30-60 ms per token
    await wait(15 + Math.random() * 35);
  }

  yield {
    id,
    role: 'assistant',
    content: flow.answer,
    agentId: answerAgent,
    suggestions: flow.suggestions,
    status: 'done',
    createdAt: Date.now(),
  };
}

export const STARTER_PROMPTS: string[] = [
  'What changed since yesterday?',
  "What's reachable from FIN-DB?",
  'Score this week\'s CVEs against my network',
  'Replay Vigorish Viper hop-by-hop',
  "Where am I drifting on PCI scope?",
  "What's my ALE today, in dollars?",
];
