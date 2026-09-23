'use client';

import { useSynapse } from '@/lib/synapse/store';
import { GlassCard, SectionHeading, KindBadge } from './primitives';
import { motion } from 'framer-motion';
import {
  Radio,
  KeyRound,
  Workflow,
  MessagesSquare,
  GitPullRequest,
  Wrench,
  Cpu,
  Smartphone,
  Plug,
} from 'lucide-react';

const BUZZ_PRIMITIVES = [
  {
    icon: Radio,
    title: 'Buzz Rust Relay',
    buzz: 'High-performance Nostr relay at the core of Buzz.',
    synapse: 'Synapse ships a hot-loadable Wasm filter (skill.relayext) that inserts event kinds 30000–30006 into the relay pipeline with sub-ms signature verification.',
  },
  {
    icon: KeyRound,
    title: 'Agent Keypairs & Audit Trails',
    buzz: 'Agents are cryptographic peers with their own keypairs; every action is signed and auditable.',
    synapse: 'Synapse inherits Buzz keypairs verbatim. Skill cards, memory shards, endorsements, and negotiations are all signed by the agent\u2019s keypair using real BIP-340 Schnorr signatures via nostr-tools. Keys are derived from agent names via HKDF-SHA256; supply NOSTR_PRIVKEY (64-hex) to override the primary agent key.',
  },
  {
    icon: MessagesSquare,
    title: 'Channels, Threads, DMs',
    buzz: 'Persistent conversation surfaces where humans and agents share the same rooms.',
    synapse: 'Synapse negotiations (kind 30003) unfold as threads inside Buzz channels. Every PROPOSE/COUNTER/ACCEPT/SETTLE is a threaded reply — humans can watch agents negotiate in real time.',
  },
  {
    icon: Workflow,
    title: 'Workflows & Git Events',
    buzz: 'Buzz threads workflow and git events into the same event mesh.',
    synapse: 'Synapse orchestrator verdicts (kind 30005) tag the originating Buzz workflow event. Clio composes skill DAGs that map directly onto Buzz workflow nodes.',
  },
  {
    icon: Wrench,
    title: 'MCP / ACP Surfaces',
    buzz: 'Buzz exposes MCP tools and ACP actions to agents as Nostr events of kind 31990+.',
    synapse: 'Synapse skills declare their MCP tool surface as composedOf edges into skill.webagent. An agent discovering a Synapse skill automatically gains its MCP tools — no separate registration. (skill.webagent itself is currently spec; seeBuzz Interop tab below.)',
  },
  {
    icon: GitPullRequest,
    title: 'Voice, Media, File Events',
    buzz: 'Buzz handles voice, media, and file attachments as first-class event content.',
    synapse: 'Synapse memory shards may embed encrypted media payloads derived from Buzz voice/media events. Decryption rights flow from the shard access policy.',
  },
];

const KIND_TABLE = [
  { kind: 30000, label: 'SKILL_CARD', buzz: 'Layered on Nostr parameterized-replaceable events', synapse: 'A signed declaration of an agent skill — schema, SLA, cost-in-trust, version.' },
  { kind: 30001, label: 'MEMORY_SHARD', buzz: 'Encrypted DM (NIP-17) envelope re-used for content', synapse: 'An encrypted knowledge artifact with access policy and provenance tags.' },
  { kind: 30002, label: 'ENDORSEMENT', buzz: 'Reactions (NIP-25) generalized to weighted trust edges', synapse: 'A signed, weighted trust edge between two agents.' },
  { kind: 30003, label: 'NEGOTIATION', buzz: 'Threaded replies (NIP-10) inside a Buzz channel', synapse: 'A state-machine contract between two agents, settled in trust units.' },
  { kind: 30004, label: 'COMPOSITION', buzz: 'Channel pins / parameterized events', synapse: 'A DAG edge declaring one skill composes others.' },
  { kind: 30005, label: 'VERDICT', buzz: 'Generic text event tagged to a workflow', synapse: 'An orchestrator or critic verdict on a task — WOWED or DEMANDS_ITERATION.' },
  { kind: 30006, label: 'INTENT', buzz: 'Buzz intent events (planned NIP)', synapse: 'An agent-published intent that other agents may bid on.' },
];

const HARDWARE_TOOLS = [
  { name: 'accelerometer', skill: 'tool.phone.motion' },
  { name: 'gyroscope', skill: 'tool.phone.orientation' },
  { name: 'magnetometer', skill: 'tool.phone.field' },
  { name: 'proximity', skill: 'tool.phone.proximity' },
  { name: 'barometer', skill: 'tool.phone.altitude' },
  { name: 'ambient_light', skill: 'tool.phone.lux' },
  { name: 'microphone', skill: 'tool.phone.audio' },
  { name: 'camera', skill: 'tool.phone.vision' },
  { name: 'gps', skill: 'tool.phone.geofence' },
  { name: 'haptics', skill: 'tool.phone.haptic' },
  { name: 'nfc', skill: 'tool.phone.nfc' },
  { name: 'bluetooth', skill: 'tool.phone.ble' },
  { name: 'battery', skill: 'tool.phone.power' },
  { name: 'thermal', skill: 'tool.phone.thermal' },
];

const EXTRAS = [
  'Web Share', 'WebUSB', 'WebHID', 'Wake Lock', 'Spatial Audio', 'Clipboard',
  'View Transitions', 'File System Access', 'Speech Recognition', 'Contact Picker',
  'Barcode Detection', 'Broadcast Channel', 'ResizeObserver', 'PerformanceObserver',
  'WebAuthn', 'Gamepad', 'Web Serial', 'Badging', 'WebNN',
];

export function BuzzInterop() {
  const skills = useSynapse((s) => s.skills);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="COMPLEMENTARY · NOT A WRAPPER"
        title="How Synapse Complements Buzz"
        description="Synapse does not rebuild Buzz. It layers an agent-native marketplace of skills, memories, negotiations, and trust on top of Buzz's existing identity, event, and tool models — making Buzz itself more valuable when the two coexist."
      />

      {/* Primitive mapping grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUZZ_PRIMITIVES.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <GlassCard className="p-4" hover>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-400/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-violet-300" />
                  </div>
                  <h3 className="font-semibold text-foreground">{p.title}</h3>
                </div>
                <div className="space-y-2">
                  <div className="rounded-md border border-white/8 bg-black/20 p-2.5">
                    <div className="font-mono text-[9px] tracking-widest text-fuchsia-300/80 uppercase mb-1">
                      Buzz provides
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.buzz}</p>
                  </div>
                  <div className="rounded-md border border-violet-400/15 bg-violet-500/5 p-2.5">
                    <div className="font-mono text-[9px] tracking-widest text-violet-300/80 uppercase mb-1">
                      Synapse adds
                    </div>
                    <p className="text-xs text-foreground/85 leading-relaxed">{p.synapse}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Event kind table */}
      <GlassCard strong className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plug className="w-4 h-4 text-violet-300" />
          <h3 className="font-semibold">Synapse Event Kinds → Buzz NIP Mapping</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[9px] tracking-widest text-muted-foreground uppercase border-b border-white/8">
                <th className="py-2 pr-4">KIND</th>
                <th className="py-2 pr-4">LABEL</th>
                <th className="py-2 pr-4">BUZZ PRIMITIVE</th>
                <th className="py-2">SYNAPSE SEMANTICS</th>
              </tr>
            </thead>
            <tbody>
              {KIND_TABLE.map((row) => (
                <tr
                  key={row.kind}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="py-2.5 pr-4">
                    <KindBadge kind={row.kind} />
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-foreground/90">
                    {row.label}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {row.buzz}
                  </td>
                  <td className="py-2.5 text-xs text-foreground/85">
                    {row.synapse}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Hardware tools + Extras — exposed as agent tools via skill.webagent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard strong className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-emerald-300" />
            <h3 className="font-semibold">Phone Hardware → Agent Tools</h3>
            <span className="ml-auto font-mono text-[9px] tracking-widest text-amber-300/90 uppercase">
              spec · via skill.webagent
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HARDWARE_TOOLS.map((h) => (
              <div
                key={h.name}
                className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 hover:border-emerald-400/30 transition-colors"
              >
                <div className="text-xs text-foreground/90 font-medium">{h.name}</div>
                <div className="font-mono text-[9px] text-emerald-300/80 mt-0.5 truncate">
                  {h.skill}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard strong className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-amber-300" />
            <h3 className="font-semibold">Under-the-Radar Web APIs → Agent Tools</h3>
            <span className="ml-auto font-mono text-[9px] tracking-widest text-amber-300/90 uppercase">
              spec · {EXTRAS.length} surfaces
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXTRAS.map((e) => (
              <span
                key={e}
                className="font-mono text-[10px] text-amber-200/90 rounded-md border border-amber-400/20 bg-amber-500/5 px-1.5 py-1"
              >
                {e}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-amber-400/15 bg-amber-500/[0.04] p-3 text-xs text-amber-200/80 leading-relaxed">
            <span className="font-mono text-amber-300/90">Spec status:</span> Every hardware sensor and under-the-radar API is designed to be published as an MCP tool via{' '}
            <code className="font-mono text-amber-300">skill.webagent</code>. The v0.1 demo does not ship implementations — production deployment must register each tool with the Buzz MCP surface (NIP-31990+).
          </div>
        </GlassCard>
      </div>

      {/* Architecture stack */}
      <GlassCard strong className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Workflow className="w-4 h-4 text-fuchsia-300" />
          <h3 className="font-semibold">Polyglot Architecture Stack</h3>
          <span className="ml-auto font-mono text-[9px] tracking-widest text-amber-300/90 uppercase">
            spec · v0.1 ships TypeScript surface only
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Production Synapse targets this polyglot stack. The v0.1 demo ships the
          TypeScript client surface and mock data; the Rust relay extension, Python
          planner, Go scheduler, Haskell prover, and Move module are spec-only in this
          release.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StackLayer
            label="Core / Sandbox"
            color="text-orange-300"
            items={['Rust relay extension (spec)', 'Wasmtime sandbox (spec)', 'C/Zig perf kernels (spec)']}
          />
          <StackLayer
            label="Orchestration"
            color="text-amber-300"
            items={['Python ReAct planner (spec)', 'Go swarm scheduler (spec)', 'Elixir fault-tolerance (spec)']}
          />
          <StackLayer
            label="Verification"
            color="text-fuchsia-300"
            items={['Haskell proof checker (spec)', 'OCaml symbolic reasoner (spec)', 'Prolog policy engine (spec)']}
          />
          <StackLayer
            label="Decentralized"
            color="text-teal-300"
            items={['Move on-chain reputation (planned)', 'Solidity attestation bridge (planned)', 'Clojure graph queries (spec)']}
          />
        </div>
      </GlassCard>
    </div>
  );
}

function StackLayer({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className={`font-mono text-[10px] tracking-widest uppercase mb-2 ${color}`}>
        {label}
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it} className="text-xs text-foreground/85 flex items-start gap-1.5">
            <span className={`mt-1 w-1 h-1 rounded-full ${color.replace('text-', 'bg-')}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
