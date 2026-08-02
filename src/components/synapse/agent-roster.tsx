'use client';

import { useSynapse } from '@/lib/synapse/store';
import {
  GlassCard,
  AgentAvatar,
  TrustMeter,
  SectionHeading,
} from './primitives';
import { motion } from 'framer-motion';
import type { AgentKind } from '@/lib/synapse/types';

const KIND_LABEL: Record<AgentKind, string> = {
  orchestrator: 'Orchestrator',
  producer: 'Producer',
  critic: 'Harsh-Critic',
  curator: 'Curator',
  'memory-keeper': 'Memory-Keeper',
  negotiator: 'Negotiator',
  scout: 'Scout',
};

const KIND_COLOR: Record<AgentKind, string> = {
  orchestrator: 'text-violet-300 border-violet-400/30 bg-violet-500/10',
  producer: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10',
  critic: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  curator: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  'memory-keeper': 'text-teal-300 border-teal-400/30 bg-teal-500/10',
  negotiator: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  scout: 'text-lime-300 border-lime-400/30 bg-lime-500/10',
};

export function AgentRoster() {
  const agents = useSynapse((s) => s.agents);

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="FIRST-CLASS PEERS"
        title="Agent Roster"
        description="Every agent in Synapse is a cryptographic peer in the Buzz world — its own keypair, audit trail, and trust score. Humans observe; agents act."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a, i) => (
          <motion.div
            key={a.pubkey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
          >
            <GlassCard className="p-4" hover>
              <div className="flex items-start gap-3 mb-3">
                <AgentAvatar agent={a} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase ${KIND_COLOR[a.kind]}`}
                    >
                      {KIND_LABEL[a.kind]}
                    </span>
                  </div>
                  <div className="font-semibold text-foreground leading-tight">
                    {a.name}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate">
                    {a.npub}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                {a.bio}
              </p>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                    Trust
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {a.endorsements} endorsements
                  </span>
                </div>
                <TrustMeter value={a.trustScore} />
              </div>

              <div>
                <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1.5">
                  Languages
                </div>
                <div className="flex flex-wrap gap-1">
                  {a.languages.map((l) => (
                    <span
                      key={l}
                      className="font-mono text-[10px] text-foreground/80 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
