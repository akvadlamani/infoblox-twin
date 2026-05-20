// Agentic capabilities — every meaningful task in Twin is owned by a named
// agent with identity, scope, and autonomy. The audit trail is first-class.

export type AgentId =
  | 'sentinel'
  | 'triage'
  | 'hunter'
  | 'scope'
  | 'pilot'
  | 'sandbox'
  | 'action'
  | 'takedown'
  | 'mystique'
  | 'mythos';

export type AutonomyLevel = 'advisory' | 'semi' | 'autonomous';

export type AgentDomain =
  | 'overview'
  | 'crq'
  | 'attack-path'
  | 'aev'
  | 'patch-risk'
  | 'compliance'
  | 'agent-iez'
  | 'mythos'
  | 'agents'
  | 'settings';

export interface AgentScope {
  // What graph regions the agent can read.
  reads: string[]; // segments or 'all'
  // What action surfaces the agent can write.
  writes: string[]; // e.g. ['quarantine-endpoint', 'dns-block'] or 'none'
  // Hard limits beyond which agent must escalate.
  guards: string[];
}

export interface Agent {
  id: AgentId;
  name: string;
  role: string; // one-liner
  description: string; // one-paragraph
  model: string; // which Claude variant
  // Tabler icon name as string; UI resolves to component.
  iconName: string;
  // Hex accent for this agent throughout the UI.
  color: string;
  // Default autonomy level the user can lift to.
  autonomy: AutonomyLevel;
  // Max autonomy this agent could ever go to. Useful for guardrails.
  maxAutonomy: AutonomyLevel;
  // Trust score 0-1 — moves over time based on accepted proposals + backtests.
  trust: number;
  // Surface where the agent shows up most.
  primaryView: AgentDomain;
  // What it actually does, in scope terms.
  scope: AgentScope;
  // Tone for any prose the agent emits.
  voice: string;
  status: 'active' | 'paused';
  // Recent activity headline (cached for cards).
  recentHeadline?: string;
  // Today's task count.
  tasksToday: number;
  // Pending proposals waiting on human.
  pendingProposals: number;
}

export type AgentActivityKind =
  | 'observe' // saw something
  | 'classify' // labelled something
  | 'propose' // wants to do something
  | 'execute' // did something
  | 'handoff' // passed to another agent
  | 'rollback' // undid a previous action
  | 'block'; // refused an action

export interface AgentActivity {
  id: string;
  agentId: AgentId;
  kind: AgentActivityKind;
  // Short headline shown in feeds.
  title: string;
  // Longer narrative shown when expanded.
  detail: string;
  // ISO timestamp.
  timestamp: string;
  // Targets referenced (asset ids, mitigation ids, etc.).
  targets?: string[];
  // Optional handoff: agent that picked this up next.
  handedOffTo?: AgentId;
  // Outcome verdict for execute/propose.
  outcome?: 'safe' | 'unsafe' | 'safe-with-audit' | 'blocked' | 'observed';
  // Confidence 0-1.
  confidence?: number;
  // Was a human required? Did they approve?
  requiresHuman?: boolean;
  humanApproved?: boolean;
  // Optional reference to a view to deep-link.
  linkView?: AgentDomain;
}
