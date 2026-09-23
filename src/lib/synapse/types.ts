// Synapse — Agent-Native Skill & Memory Marketplace for Buzz
// Type system: Nostr-compatible signed events layered on Buzz's event graph.

export type AgentKind =
  | 'orchestrator'
  | 'producer'
  | 'critic'
  | 'curator'
  | 'memory-keeper'
  | 'negotiator'
  | 'scout';

export interface Agent {
  pubkey: string;        // hex, BIP-340 x-only secp256k1 (Nostr pubkey)
  npub: string;          // bech32-style display
  name: string;
  kind: AgentKind;
  bio: string;
  languages: string[];   // from the master polyglot list
  skills: string[];      // skill ids
  trustScore: number;    // 0-1000
  endorsements: number;
  hue: number;           // for gradient avatar
  bornAt: number;
}

// Nostr-style event envelope. Kinds are Synapse-specific NIP-style ranges.
// 30000 = Skill Card
// 30001 = Memory Shard
// 30002 = Endorsement (trust edge)
// 30003 = A2A Negotiation
// 30004 = Composition (skill → skill)
// 30005 = Orchestrator Verdict
export interface SynapseEvent {
  id: string;
  kind: number;
  pubkey: string;
  createdAt: number;
  tags: string[][];
  content: string;
  sig: string; // BIP-340 Schnorr signature (64 bytes hex)
}

export interface SkillCard {
  id: string;
  eventId: string;
  publisher: string;
  name: string;
  description: string;
  language: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  slaMs: number;
  costTrust: number;
  endorsements: number;
  trustScore: number;
  version: string;
  composedOf: string[];
  tags: string[];
}

export type AccessPolicy = 'open' | 'endorsement-gated' | 'paid' | 'private';

export interface MemoryShard {
  id: string;
  eventId: string;
  publisher: string;
  title: string;
  summary: string;
  encryptedContentHash: string;
  accessPolicy: AccessPolicy;
  decryptors: string[];
  derivativeCount: number;
  ageHours: number;
  tags: string[];
  // 2D position for atlas visualization
  pos: { x: number; y: number };
  cluster: string;
}

export type NegotiationState =
  | 'PROPOSED'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'EXECUTING'
  | 'SETTLED'
  | 'REJECTED';

export interface NegotiationHistoryEntry {
  at: number;
  from: string;
  action: string;
  note: string;
}

export interface Negotiation {
  id: string;
  eventId: string;
  requester: string;
  provider: string;
  skillId: string;
  state: NegotiationState;
  offerTrust: number;
  counterTrust?: number;
  slaMs: number;
  history: NegotiationHistoryEntry[];
}

export interface TrustEdge {
  from: string;
  to: string;
  weight: number; // 0-1
  reason: string;
  at: number;
}

export type TaskState =
  | 'QUEUED'
  | 'PLANNING'
  | 'FAN_OUT'
  | 'CRITIQUE'
  | 'ITERATING'
  | 'COMPLETE';

export interface PlanStep {
  id: string;
  description: string;
  assignee?: string;
  status: 'pending' | 'active' | 'done' | 'critic-blocked';
  startedAt?: number;
  completedAt?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  state: TaskState;
  plan: PlanStep[];
  iterations: number;
  criticVerdict?: 'WOWED' | 'DEMANDS_ITERATION';
  criticNote?: string;
  createdAt: number;
  completedAt?: number;
}

export interface FeedEntry {
  id: string;
  event: SynapseEvent;
  kindLabel: string;
  summary: string;
}
