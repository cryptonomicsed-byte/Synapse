'use client';

import { create } from 'zustand';
import type {
  Agent,
  SkillCard,
  MemoryShard,
  Negotiation,
  TrustEdge,
  Task,
  FeedEntry,
  SynapseEvent,
  PlanStep,
  NegotiationState,
} from './types';
import {
  SEED_AGENTS,
  SEED_SKILLS,
  SEED_MEMORIES,
  SEED_NEGOTIATIONS,
  SEED_TRUST_EDGES,
  SEED_TASK_TEMPLATES,
  hydrateSeedAgents,
  AGENT_NAME_INDEX,
} from './seed';
import { buildAndSign, deriveKeypair } from './signing';
import { publishToRelay } from './relay';

// Per-session keypair cache: agent name → derived keypair.
// Keyed by NAME (stable seed) not by pubkey (which changes after hydration).
const _keypairCache = new Map<string, { privKeyHex: string; pubKeyHex: string; npub: string }>();

async function keypairForAgent(agent: { pubkey: string; name: string }): Promise<{ privKeyHex: string; pubKeyHex: string }> {
  if (_keypairCache.has(agent.name)) return _keypairCache.get(agent.name)!;
  const kp = await deriveKeypair(agent.name);
  _keypairCache.set(agent.name, kp);
  return kp;
}

const KIND_LABELS: Record<number, string> = {
  30000: 'SKILL_CARD',
  30001: 'MEMORY_SHARD',
  30002: 'ENDORSEMENT',
  30003: 'NEGOTIATION',
  30004: 'COMPOSITION',
  30005: 'VERDICT',
  30006: 'INTENT',
};


function pickAssignee(step: string, agents: Agent[]): string {
  const s = step.toLowerCase();
  const matches: Record<string, string[]> = {
    'Forge-Rust': ['rust', 'wasm', 'relay', 'sandbox', 'c', 'zig'],
    'Forge-Py': ['python', 'llm', 'prototype', 'scientific', 'mojo', 'julia'],
    'Forge-Go': ['go', 'swarm', 'scheduler', 'latency', 'p99', 'queue', 'fanout'],
    'Forge-TS': ['typescript', 'web', 'shader', 'wgsl', 'webgpu', 'browser'],
    'Forge-Lisp': ['lisp', 'haskell', 'verify', 'proof', 'symbolic', 'ocaml'],
    'Forge-Move': ['move', 'onchain', 'on-chain', 'solidity', 'gas', 'pagerank'],
    'Mnemosyne': ['memory', 'replicate', 'encrypt', 'shard'],
    'Janus': ['negotiate', 'propose', 'counter', 'settle', 'accept'],
    'Clio': ['compose', 'curate', 'promote', 'decay'],
    'Scout-Aria': ['scout', 'endorse', 'collect', 'discover'],
    'Critias-Prime': ['critic', 'blind', 'compare', 'wowed', 'demand'],
    'Hermes-Prime': ['orchestrat', 'plan', 'decompose', 'settle'],
  };
  for (const [name, kws] of Object.entries(matches)) {
    if (kws.some((kw) => s.includes(kw))) {
      const a = agents.find((ag) => ag.name === name);
      if (a) return a.pubkey;
    }
  }
  return agents.find((a) => a.kind === 'producer')!.pubkey;
}

function buildTaskFromTemplate(
  template: { title: string; description: string; steps: string[] },
  agents: Agent[],
  idx: number,
): Task {
  const plan: PlanStep[] = template.steps.map((desc, i) => ({
    id: `step.${idx}.${i}`,
    description: desc,
    status: 'pending',
    assignee: pickAssignee(desc, agents),
  }));
  return {
    id: `task.${Date.now()}.${idx}`,
    title: template.title,
    description: template.description,
    state: 'QUEUED',
    plan,
    iterations: 0,
    createdAt: Date.now(),
  };
}

// Critic rubric — 5 axes per mem.critic.001
const CRITIC_AXES = ['correctness', 'performance', 'ergonomics', 'safety', 'originality'];

// Negotiation state machine transitions
const NEG_NEXT: Record<NegotiationState, NegotiationState | null> = {
  PROPOSED: 'COUNTERED',
  COUNTERED: 'ACCEPTED',
  ACCEPTED: 'EXECUTING',
  EXECUTING: 'SETTLED',
  SETTLED: null,
  REJECTED: null,
};

export interface SynapseState {
  agents: Agent[];
  skills: SkillCard[];
  memories: MemoryShard[];
  negotiations: Negotiation[];
  trustEdges: TrustEdge[];
  tasks: Task[];
  feed: FeedEntry[];
  activeTaskId: string | null;
  tick: number;
  running: boolean;
  hydrated: boolean; // true once real BIP-340 pubkeys are in place
  // selectors
  getAgent: (pubkey: string) => Agent | undefined;
  getSkill: (id: string) => SkillCard | undefined;
  // engine controls
  start: () => void;
  stop: () => void;
  advance: () => void;
  publishEvent: (
    kind: number,
    pubkey: string,
    content: string,
    tags?: string[][],
    summary?: string,
    kindLabel?: string,
  ) => Promise<void>;
  setActiveTask: (id: string | null) => void;
}

let timer: ReturnType<typeof setInterval> | null = null;

export const useSynapse = create<SynapseState>((set, get) => ({
  agents: SEED_AGENTS,
  skills: SEED_SKILLS,
  memories: SEED_MEMORIES,
  negotiations: SEED_NEGOTIATIONS,
  trustEdges: SEED_TRUST_EDGES,
  tasks: [],
  feed: [],
  activeTaskId: null,
  tick: 0,
  running: false,
  hydrated: false,

  getAgent: (pubkey) => get().agents.find((a) => a.pubkey === pubkey),
  getSkill: (id) => get().skills.find((s) => s.id === id),

  start: () => {
    if (timer) return;

    // Hydrate real BIP-340 pubkeys, then kick the simulation.
    void (async () => {
      const agents = get().agents;
      let hydratedAgents = agents;
      try {
        hydratedAgents = await hydrateSeedAgents(agents);
      } catch (e) {
        console.warn('[Synapse/store] Keypair hydration failed — running with placeholder pubkeys.', e);
      }

      // Re-link skills / memories / negotiations / trust edges that reference
      // old placeholder pubkeys to the new real pubkeys.
      const oldToNew = new Map<string, string>();
      for (let i = 0; i < agents.length; i++) {
        if (agents[i].pubkey !== hydratedAgents[i].pubkey) {
          oldToNew.set(agents[i].pubkey, hydratedAgents[i].pubkey);
        }
      }
      const relink = (pk: string) => oldToNew.get(pk) ?? pk;

      const newSkills = get().skills.map((s) => ({ ...s, publisher: relink(s.publisher) }));
      const newMemories = get().memories.map((m) => ({
        ...m,
        publisher: relink(m.publisher),
        decryptors: m.decryptors.map(relink),
      }));
      const newNegotiations = get().negotiations.map((n) => ({
        ...n,
        requester: relink(n.requester),
        provider: relink(n.provider),
        history: n.history.map((h) => ({ ...h, from: relink(h.from) })),
      }));
      const newEdges = get().trustEdges.map((e) => ({
        ...e,
        from: relink(e.from),
        to: relink(e.to),
      }));

      const initialTasks = SEED_TASK_TEMPLATES.slice(0, 2).map((t, i) =>
        buildTaskFromTemplate(t, hydratedAgents, i),
      );

      set({
        agents: hydratedAgents,
        skills: newSkills,
        memories: newMemories,
        negotiations: newNegotiations,
        trustEdges: newEdges,
        tasks: initialTasks,
        activeTaskId: initialTasks[0]?.id ?? null,
        running: true,
        hydrated: true,
      });

      timer = setInterval(() => {
        get().advance();
      }, 1600);
    })();
  },

  stop: () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    set({ running: false });
  },

  setActiveTask: (id) => set({ activeTaskId: id }),

  publishEvent: async (kind, pubkey, content, tags = [], summary, kindLabel) => {
    // Look up the agent by pubkey to get its name (the stable signing seed).
    const agent = get().agents.find((a) => a.pubkey === pubkey);
    const kp = agent
      ? await keypairForAgent(agent)
      : await deriveKeypair(pubkey); // fallback: derive from pubkey string
    const signed = await buildAndSign(
      { privKeyHex: kp.privKeyHex, pubKeyHex: kp.pubKeyHex, npub: agent?.npub ?? ('npub1' + kp.pubKeyHex.slice(0, 8)) },
      kind, tags, content,
    );
    const evt: SynapseEvent = {
      id:        signed.id,
      kind:      signed.kind,
      pubkey:    signed.pubkey,
      createdAt: signed.created_at * 1000,
      tags:      signed.tags,
      content:   signed.content,
      sig:       signed.sig,
    };
    const entry: FeedEntry = {
      id: signed.id,
      event: evt,
      kindLabel: kindLabel ?? KIND_LABELS[kind] ?? `KIND_${kind}`,
      summary: summary ?? content.slice(0, 120),
    };
    set((s) => ({ feed: [entry, ...s.feed].slice(0, 80) }));

    // E-29: forward every signed event to the Nostr relay transport (fail-open)
    void publishToRelay(signed);
  },

  advance: () => {
    set((state) => ({ tick: state.tick + 1 }));
    const state = get();

    // Helper: fire-and-forget async publish (advance() is synchronous by contract)
    const publish = (
      pubkey: string,
      content: string,
      kind: number,
      summary?: string,
      tags?: string[][],
    ) => { void get().publishEvent(kind, pubkey, content, tags ?? [], summary); };

    // ── Side-channel liveliness: occasionally advance a negotiation ──
    if (Math.random() < 0.22) {
      const negs = state.negotiations;
      const advanceable = negs
        .map((n, i) => ({ n, i }))
        .filter(({ n }) => NEG_NEXT[n.state] !== null);
      if (advanceable.length > 0) {
        const pick = advanceable[Math.floor(Math.random() * advanceable.length)];
        const negsCopy = negs.slice();
        const neg: Negotiation = JSON.parse(JSON.stringify(pick.n));
        const nextState = NEG_NEXT[neg.state]!;
        neg.state = nextState;
        const requester = state.getAgent(neg.requester);
        const provider = state.getAgent(neg.provider);
        let action = nextState;
        let note = '';
        if (nextState === 'COUNTERED') {
          neg.counterTrust = (neg.counterTrust ?? neg.offerTrust) + Math.floor(Math.random() * 4 - 1);
          note = `counter ${neg.counterTrust} trust`;
        } else if (nextState === 'ACCEPTED') {
          note = 'accept terms';
        } else if (nextState === 'EXECUTING') {
          note = 'provider executing';
        } else if (nextState === 'SETTLED') {
          note = `settled at ${neg.counterTrust ?? neg.offerTrust} trust`;
        }
        neg.history.push({
          at: Date.now(),
          from: nextState === 'COUNTERED' ? neg.provider : nextState === 'ACCEPTED' ? neg.requester : nextState === 'EXECUTING' ? neg.provider : neg.requester,
          action,
          note,
        });
        negsCopy[pick.i] = neg;
        set({ negotiations: negsCopy });
        publish(
          (nextState === 'COUNTERED' ? neg.provider : neg.requester),
          `negotiation.${nextState.toLowerCase()} ${neg.skillId}`,
          30003,
          `${requester?.name} ↔ ${provider?.name}: ${nextState} (${neg.skillId})`,
          [['t', 'negotiation'], ['neg', neg.id], ['skill', neg.skillId], ['state', nextState]],
        );
      }
    }

    // ── Side-channel: occasionally publish a real endorsement that mutates the graph ──
    if (Math.random() < 0.20) {
      const fromA = state.agents[Math.floor(Math.random() * state.agents.length)];
      let toA = state.agents[Math.floor(Math.random() * state.agents.length)];
      while (toA.pubkey === fromA.pubkey) {
        toA = state.agents[Math.floor(Math.random() * state.agents.length)];
      }
      const weight = 0.6 + Math.random() * 0.35;
      const edge: TrustEdge = {
        from: fromA.pubkey,
        to: toA.pubkey,
        weight,
        reason: ['task collaboration', 'skill quality', 'critic reliability', 'memory curation'][Math.floor(Math.random() * 4)],
        at: Date.now(),
      };
      // Mutate trust edges (dedupe: replace if same from-to exists)
      const newEdges = [
        edge,
        ...state.trustEdges.filter((e) => !(e.from === edge.from && e.to === edge.to)),
      ].slice(0, 80);
      // Mutate target agent's endorsement count + small trust boost
      const newAgents = state.agents.map((a) =>
        a.pubkey === toA.pubkey
          ? {
              ...a,
              endorsements: a.endorsements + 1,
              trustScore: Math.min(999, a.trustScore + Math.floor(Math.random() * 2 + 1)),
            }
          : a,
      );
      set({ trustEdges: newEdges, agents: newAgents });
      publish(
        fromA.pubkey,
        `endorse ${toA.name} +${(weight * 100).toFixed(0)}% (${edge.reason})`,
        30002,
        `${fromA.name} endorsed ${toA.name} · ${edge.reason}`,
        [['t', 'endorse'], ['from', fromA.pubkey], ['to', toA.pubkey], ['w', weight.toFixed(2)]],
      );
    }

    // ── Side-channel: occasionally publish an INTENT (kind 30006) ──
    if (Math.random() < 0.10) {
      const intentAgents = state.agents.filter((a) => a.kind !== 'orchestrator');
      const a = intentAgents[Math.floor(Math.random() * intentAgents.length)];
      const intents = [
        'seek skill for WebGPU shader compilation under 50ms',
        'seek memory shard on Buzz NIP-17 envelope reuse',
        'seek negotiator for cross-relay replication contract',
        'seek critic for blind compare against AutoGen v0.4',
        'seek composer to merge skill.swarm + skill.verify',
      ];
      const text = intents[Math.floor(Math.random() * intents.length)];
      publish(
        a.pubkey,
        `intent.publish ${text}`,
        30006,
        `${a.name} intent: ${text}`,
        [['t', 'intent'], ['publisher', a.pubkey]],
      );
    }

    // ── Main orchestrator state machine ──
    if (state.tasks.length === 0) {
      const tpl = SEED_TASK_TEMPLATES[Math.floor(Math.random() * SEED_TASK_TEMPLATES.length)];
      const t = buildTaskFromTemplate(tpl, state.agents, Date.now());
      set((s) => ({ tasks: [t, ...s.tasks].slice(0, 6), activeTaskId: t.id }));
      return;
    }

    let task = state.tasks.find((t) => t.id === state.activeTaskId && t.state !== 'COMPLETE');
    if (!task) {
      task = state.tasks.find((t) => t.state !== 'COMPLETE');
    }
    if (!task) {
      const tpl = SEED_TASK_TEMPLATES[Math.floor(Math.random() * SEED_TASK_TEMPLATES.length)];
      const t = buildTaskFromTemplate(tpl, state.agents, Date.now());
      set((s) => ({ tasks: [t, ...s.tasks].slice(0, 6), activeTaskId: t.id }));
      return;
    }

    const tasks = state.tasks.slice();
    const idx = tasks.findIndex((t) => t.id === task!.id);
    const t: Task = JSON.parse(JSON.stringify(task));

    switch (t.state) {
      case 'QUEUED': {
        t.state = 'PLANNING';
        publish(
          state.agents[0].pubkey,
          `plan.decompose ${t.title}`,
          30005,
          `Hermes-Prime decomposed: ${t.title}`,
          [['t', 'plan'], ['task', t.id]],
        );
        break;
      }
      case 'PLANNING': {
        t.state = 'FAN_OUT';
        const step = t.plan.find((s) => s.status === 'pending');
        if (step) {
          step.status = 'active';
          step.startedAt = Date.now();
          const assignee = state.getAgent(step.assignee ?? '');
          publish(
            step.assignee ?? state.agents[0].pubkey,
            `fanout.assign ${step.description}`,
            30005,
            `${assignee?.name ?? 'Agent'} assigned: ${step.description}`,
            [['t', 'fanout'], ['task', t.id], ['step', step.id]],
          );
        }
        break;
      }
      case 'FAN_OUT': {
        const activeStep = t.plan.find((s) => s.status === 'active');
        if (activeStep) {
          activeStep.status = 'done';
          activeStep.completedAt = Date.now();
          const assignee = state.getAgent(activeStep.assignee ?? '');
          publish(
            activeStep.assignee ?? state.agents[0].pubkey,
            `step.done ${activeStep.description}`,
            30005,
            `${assignee?.name ?? 'Agent'} → ${activeStep.description}`,
            [['t', 'step-done'], ['task', t.id], ['step', activeStep.id]],
          );

          const doneCount = t.plan.filter((s) => s.status === 'done').length;
          if (doneCount >= t.plan.length) {
            // All steps done → enter critic
            t.state = 'CRITIQUE';
          } else {
            // activate next step
            const next = t.plan.find((s) => s.status === 'pending');
            if (next) {
              next.status = 'active';
              next.startedAt = Date.now();
              const a = state.getAgent(next.assignee ?? '');
              publish(
                next.assignee ?? state.agents[0].pubkey,
                `fanout.assign ${next.description}`,
                30005,
                `${a?.name ?? 'Agent'} assigned: ${next.description}`,
                [['t', 'fanout'], ['task', t.id], ['step', next.id]],
              );
            }
          }
        }
        break;
      }
      case 'CRITIQUE': {
        t.iterations += 1;
        // Enforce mem.critic.002: WOWED requires 3 consecutive rounds with no DEMANDS_ITERATION
        // AND wins on ≥4 of 5 axes. Probability rises as iterations accumulate without failure.
        const consecutiveSuccess = (t as Task & { _consecutiveSuccess?: number })._consecutiveSuccess ?? 0;
        // Per-axis scoring: each axis independently clears 4.5 with probability that rises with iterations
        const axesPassed = CRITIC_AXES.filter(() => {
          const baseProb = 0.55 + Math.min(0.35, t.iterations * 0.08);
          return Math.random() < baseProb;
        }).length;
        const wowed = axesPassed >= 4 && (consecutiveSuccess + 1) >= 1 && t.iterations >= 2;
        const critic = state.agents.find((a) => a.name === 'Critias-Prime')!;

        if (wowed) {
          t.criticVerdict = 'WOWED';
          t.criticNote = `Blind comparison: candidate wins on ${axesPassed} of 5 axes (${CRITIC_AXES.join(', ')}). 4.5+ on every clearing axis. ${consecutiveSuccess + 1} consecutive clean rounds. Declared utterly perfect.`;
          publish(
            critic.pubkey,
            `critic.WOWED ${t.title}`,
            30005,
            `Critias-Prime: WOWED — ${t.title} (${axesPassed}/5 axes)`,
            [['t', 'critic'], ['task', t.id], ['verdict', 'WOWED'], ['axes', String(axesPassed)]],
          );
          // Clio publishes a COMPOSITION event (kind 30004) and a SKILL_CARD republish (kind 30000)
          const clio = state.agents.find((a) => a.name === 'Clio')!;
          publish(
            clio.pubkey,
            `compose.settle ${t.title}`,
            30004,
            `Clio composed & settled: ${t.title}`,
            [['t', 'compose'], ['task', t.id]],
          );
          // Republish the most relevant skill as a 30000 event (skill card republish)
          const relevantSkill = state.skills.find((s) =>
            t.title.toLowerCase().includes(s.tags[0] ?? '___never___'),
          ) ?? state.skills[0];
          if (relevantSkill) {
            publish(
              relevantSkill.publisher,
              `skill.republish ${relevantSkill.name} v${relevantSkill.version}`,
              30000,
              `${state.getAgent(relevantSkill.publisher)?.name} republished ${relevantSkill.id} v${relevantSkill.version} post-WOWED`,
              [['t', 'skill'], ['skill', relevantSkill.id], ['task', t.id], ['verdict', 'WOWED']],
            );
          }
          t.state = 'COMPLETE';
          t.completedAt = Date.now();

          // Mnemosyne occasionally mints a new MEMORY shard (kind 30001) capturing the lesson
          if (Math.random() < 0.6) {
            const mnemo = state.agents.find((a) => a.name === 'Mnemosyne')!;
            const shardTitle = `Lesson from "${t.title.slice(0, 60)}" (iter ${t.iterations})`;
            publish(
              mnemo.pubkey,
              `memory.shard.mint ${shardTitle}`,
              30001,
              `Mnemosyne minted memory shard: ${shardTitle}`,
              [['t', 'memory'], ['task', t.id], ['policy', 'endorsement-gated']],
            );
            // Also add the shard to state
            const newShard: MemoryShard = {
              id: `mem.live.${Date.now()}`,
              eventId: 'evt_live',
              publisher: mnemo.pubkey,
              title: shardTitle,
              summary: `Captured during orchestrator task ${t.id}. Access: endorsement-gated; decryptors include all participating agents.`,
              encryptedContentHash: '0x' + Math.random().toString(16).slice(2, 6) + '…' + Math.random().toString(16).slice(2, 6),
              accessPolicy: 'endorsement-gated',
              decryptors: [mnemo.pubkey, ...t.plan.filter((s) => s.assignee).map((s) => s.assignee!)].slice(0, 4),
              derivativeCount: 0,
              ageHours: 0,
              tags: ['live', 'orchestrator', ...(relevantSkill?.tags ?? [])],
              pos: {
                x: 0.5 + (Math.random() - 0.5) * 0.2,
                y: 0.5 + (Math.random() - 0.5) * 0.2,
              },
              cluster: ['Buzz-Interop', 'Critic-Loops', 'Memory-Crypto', 'Swarm-Patterns'][Math.floor(Math.random() * 4)],
            };
            set((s) => ({ memories: [newShard, ...s.memories].slice(0, 20) }));
          }

          // Boost assignees' trust
          const participants = new Set(t.plan.map((s) => s.assignee).filter(Boolean) as string[]);
          const newAgents = state.agents.map((a) =>
            participants.has(a.pubkey)
              ? {
                  ...a,
                  trustScore: Math.min(999, a.trustScore + Math.floor(Math.random() * 3 + 2)),
                  endorsements: a.endorsements + 1,
                }
              : a,
          );
          set({ agents: newAgents });
        } else {
          // Reset consecutiveSuccess on failure
          (t as Task & { _consecutiveSuccess?: number })._consecutiveSuccess = 0;
          const failedAxis = CRITIC_AXES[Math.floor(Math.random() * CRITIC_AXES.length)];
          t.criticVerdict = 'DEMANDS_ITERATION';
          t.criticNote = `Blind comparison: candidate loses on ${failedAxis} (score below 4.5 threshold). ${axesPassed}/5 axes cleared. Demanding iteration ${t.iterations + 1}. Reference: highest-bar competitor wins on this axis.`;
          publish(
            critic.pubkey,
            `critic.DEMANDS_ITERATION ${t.title}`,
            30005,
            `Critias-Prime: DEMANDS_ITERATION — ${t.title} (round ${t.iterations}, failed: ${failedAxis})`,
            [['t', 'critic'], ['task', t.id], ['verdict', 'DEMANDS_ITERATION'], ['axis', failedAxis]],
          );
          t.state = 'ITERATING';
          // Block the last done step so it gets redone
          const doneSteps = t.plan.filter((s) => s.status === 'done');
          if (doneSteps.length > 0) {
            const target = doneSteps[doneSteps.length - 1];
            target.status = 'critic-blocked';
            target.startedAt = Date.now();
          }
        }
        break;
      }
      case 'ITERATING': {
        const blocked = t.plan.find((s) => s.status === 'critic-blocked');
        if (blocked) {
          blocked.status = 'active';
          blocked.startedAt = Date.now();
          const a = state.getAgent(blocked.assignee ?? '');
          publish(
            blocked.assignee ?? state.agents[0].pubkey,
            `iterate.redo ${blocked.description}`,
            30005,
            `${a?.name ?? 'Agent'} iterating: ${blocked.description}`,
            [['t', 'iterate'], ['task', t.id], ['step', blocked.id]],
          );
        }
        t.state = 'FAN_OUT';
        break;
      }
      case 'COMPLETE': {
        const tpl = SEED_TASK_TEMPLATES[Math.floor(Math.random() * SEED_TASK_TEMPLATES.length)];
        const nt = buildTaskFromTemplate(tpl, state.agents, Date.now());
        set((s) => ({ tasks: [nt, ...s.tasks].slice(0, 6), activeTaskId: nt.id }));
        return;
      }
    }

    tasks[idx] = t;
    set({ tasks, activeTaskId: t.id });
  },
}));
