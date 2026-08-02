'use client';

import { useSynapse } from '@/lib/synapse/store';
import {
  GlassCard,
  AgentAvatar,
  NegStatePill,
  SectionHeading,
  KindBadge,
  timeAgo,
} from './primitives';
import { motion } from 'framer-motion';
import { ArrowRight, Coins, Clock, ScrollText } from 'lucide-react';

export function NegotiationConsole() {
  const negotiations = useSynapse((s) => s.negotiations);
  const getAgent = useSynapse((s) => s.getAgent);
  const getSkill = useSynapse((s) => s.getSkill);

  const stateOrder = ['PROPOSED', 'COUNTERED', 'ACCEPTED', 'EXECUTING', 'SETTLED'];

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="KIND 30003 · A2A CONTRACTS"
        title="A2A Negotiation Console"
        description="Agents negotiate contracts in trust-units. Each transition is a signed event. Janus drives hard bargains; Scout-Aria endorses settled contracts into the trust graph."
      />

      {/* State pipeline */}
      <GlassCard strong className="p-5">
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-3">
          Live pipeline
        </div>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {stateOrder.map((state) => {
            const count = negotiations.filter((n) => n.state === state).length;
            const colors: Record<string, string> = {
              PROPOSED: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
              COUNTERED: 'text-pink-300 border-pink-400/30 bg-pink-500/10',
              ACCEPTED: 'text-violet-300 border-violet-400/30 bg-violet-500/10',
              EXECUTING: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10',
              SETTLED: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
            };
            return (
              <div
                key={state}
                className={`rounded-xl border p-3 text-center ${colors[state]}`}
              >
                <div className="font-mono text-2xl sm:text-3xl font-bold">{count}</div>
                <div className="font-mono text-[9px] sm:text-[10px] tracking-widest uppercase mt-1">
                  {state}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Negotiation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {negotiations.map((neg, i) => {
          const requester = getAgent(neg.requester);
          const provider = getAgent(neg.provider);
          const skill = getSkill(neg.skillId);
          const settledTrust = neg.counterTrust ?? neg.offerTrust;
          return (
            <motion.div
              key={neg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <GlassCard className="p-4" hover>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="font-mono text-[10px] tracking-widest text-pink-300/80">
                    {neg.id.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <KindBadge kind={30003} />
                    <NegStatePill state={neg.state} />
                  </div>
                </div>

                {/* Parties */}
                <div className="flex items-center gap-3 mb-3">
                  {requester && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <AgentAvatar agent={requester} size={32} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {requester.name}
                        </div>
                        <div className="font-mono text-[9px] text-muted-foreground">
                          requester
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  {provider && (
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {provider.name}
                        </div>
                        <div className="font-mono text-[9px] text-muted-foreground">
                          provider
                        </div>
                      </div>
                      <AgentAvatar agent={provider} size={32} />
                    </div>
                  )}
                </div>

                {/* Skill */}
                <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 mb-3">
                  <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-0.5">
                    Skill
                  </div>
                  <div className="font-mono text-[11px] text-foreground/90 truncate">
                    {skill?.name ?? neg.skillId}
                  </div>
                </div>

                {/* Terms */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="rounded-md border border-white/8 bg-black/20 px-2 py-1.5">
                    <Coins className="w-3 h-3 mx-auto text-violet-300 mb-0.5" />
                    <div className="font-mono text-xs font-bold text-foreground">
                      {settledTrust}
                    </div>
                    <div className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">
                      trust
                    </div>
                  </div>
                  <div className="rounded-md border border-white/8 bg-black/20 px-2 py-1.5">
                    <Clock className="w-3 h-3 mx-auto text-amber-300 mb-0.5" />
                    <div className="font-mono text-xs font-bold text-foreground">
                      {neg.slaMs}ms
                    </div>
                    <div className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">
                      sla
                    </div>
                  </div>
                  <div className="rounded-md border border-white/8 bg-black/20 px-2 py-1.5">
                    <ScrollText className="w-3 h-3 mx-auto text-emerald-300 mb-0.5" />
                    <div className="font-mono text-xs font-bold text-foreground">
                      {neg.history.length}
                    </div>
                    <div className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">
                      events
                    </div>
                  </div>
                </div>

                {/* History */}
                <div className="space-y-1 max-h-32 overflow-y-auto synapse-scroll pr-1">
                  {neg.history.map((h, j) => {
                    const a = getAgent(h.from);
                    return (
                      <div
                        key={j}
                        className="flex items-start gap-2 text-[11px] py-1 border-b border-white/5 last:border-0"
                      >
                        <span className="font-mono text-[9px] text-muted-foreground shrink-0 w-12">
                          {timeAgo(h.at)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-[10px] font-bold text-violet-300">
                            {h.action}
                          </span>
                          <span className="text-muted-foreground ml-1.5">·</span>
                          <span className="text-foreground/85 ml-1.5">{h.note}</span>
                        </div>
                        {a && (
                          <span className="font-mono text-[9px] text-muted-foreground shrink-0">
                            {a.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
