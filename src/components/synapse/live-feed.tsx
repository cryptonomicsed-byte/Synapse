'use client';

import { useSynapse } from '@/lib/synapse/store';
import {
  GlassCard,
  AgentAvatar,
  KindBadge,
  SectionHeading,
  timeAgo,
  shortPk,
} from './primitives';
import { motion, AnimatePresence } from 'framer-motion';

export function LiveFeed() {
  const feed = useSynapse((s) => s.feed);
  const getAgent = useSynapse((s) => s.getAgent);

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="BUZZ RELAY · KINDS 30000–30006"
        title="Live Event Feed"
        description="The mock-signed event stream flowing through the Buzz relay with Synapse's Wasm filter extension. Every entry follows the Nostr event envelope; production deployment verifies real Schnorr signatures (see NIPS/30-synapse.md §6)."
        right={
          <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg">
            <span className="pulse-dot" />
            <span className="font-mono text-[10px] tracking-widest text-emerald-300/90 uppercase">
              Streaming · {feed.length}
            </span>
          </div>
        }
      />

      <GlassCard strong className="p-0 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[72px_1fr_110px_56px_72px] gap-3 px-4 py-2.5 border-b border-white/8 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
          <div>KIND</div>
          <div>CONTENT</div>
          <div>PUBLISHER</div>
          <div>SIG</div>
          <div className="text-right">TIME</div>
        </div>

        {/* Feed body */}
        <div className="max-h-[560px] overflow-y-auto synapse-scroll">
          <AnimatePresence initial={false}>
            {feed.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground italic">
                Waiting for orchestrator to publish events…
              </div>
            )}
            {feed.map((f) => {
              const a = getAgent(f.event.pubkey);
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: -6, backgroundColor: 'rgba(167, 139, 250, 0.18)' }}
                  animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                  transition={{ duration: 0.8 }}
                  className="grid grid-cols-[72px_1fr_110px_56px_72px] gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] items-center text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <KindBadge kind={f.event.kind} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-foreground/90 truncate">{f.summary}</div>
                    <div className="font-mono text-[9px] text-muted-foreground truncate">
                      {f.event.tags.map((t) => `[${t[0]}:${t[1]}]`).join(' ') || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {a && <AgentAvatar agent={a} size={18} ring={false} />}
                    <span className="font-mono text-[10px] text-foreground/85 truncate">
                      {a?.name ?? shortPk(f.event.pubkey)}
                    </span>
                  </div>
                  <div
                    className="font-mono text-[9px] text-emerald-300/70 truncate"
                    title={`mock-sig: ${f.event.sig}`}
                  >
                    {f.event.sig.slice(0, 6)}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground text-right">
                    {timeAgo(f.event.createdAt)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </GlassCard>

      <div className="rounded-lg border border-amber-400/15 bg-amber-500/[0.04] px-3 py-2 text-[11px] text-amber-200/80 leading-relaxed">
        <span className="font-mono text-amber-300/90">⚠ Sig column shows a mock hash, not a verified Schnorr signature.</span>{' '}
        See <code className="font-mono text-amber-300">NIPS/30-synapse.md §6</code> for the cryptographic signing spec
        — production deployment must use <code className="font-mono text-amber-300">@noble/curves</code> with
        real Buzz agent keypairs.
      </div>
    </div>
  );
}
