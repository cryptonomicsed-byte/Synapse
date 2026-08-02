'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSynapse } from '@/lib/synapse/store';
import { Hero } from '@/components/synapse/hero';
import { SynapseNav, type TabId } from '@/components/synapse/nav';
import { OrchestratorView } from '@/components/synapse/orchestrator-view';
import { SkillMarketplace } from '@/components/synapse/skill-marketplace';
import { MemoryAtlas } from '@/components/synapse/memory-atlas';
import { NegotiationConsole } from '@/components/synapse/negotiation-console';
import { TrustGraph } from '@/components/synapse/trust-graph';
import { AgentRoster } from '@/components/synapse/agent-roster';
import { LiveFeed } from '@/components/synapse/live-feed';
import { BuzzInterop } from '@/components/synapse/buzz-interop';
import { Play, Square } from 'lucide-react';

export default function Home() {
  const [tab, setTab] = useState<TabId>('orchestrator');
  const start = useSynapse((s) => s.start);
  const stop = useSynapse((s) => s.stop);
  const running = useSynapse((s) => s.running);

  useEffect(() => {
    // Auto-start the orchestrator on mount
    start();
    return () => {
      stop();
    };
  }, [start, stop]);

  return (
    <main className="min-h-screen flex flex-col">
      <Hero />

      <div className="px-5 sm:px-8">
        <SynapseNav active={tab} onChange={setTab} />
      </div>

      <div className="flex-1 px-5 sm:px-8 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {tab === 'orchestrator' && <OrchestratorView />}
            {tab === 'skills' && <SkillMarketplace />}
            {tab === 'memory' && <MemoryAtlas />}
            {tab === 'negotiations' && <NegotiationConsole />}
            {tab === 'trust' && <TrustGraph />}
            {tab === 'roster' && <AgentRoster />}
            {tab === 'feed' && <LiveFeed />}
            {tab === 'interop' && <BuzzInterop />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with orchestrator control */}
      <footer
        className="mt-auto border-t border-white/8 bg-background/60 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="px-5 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Synapse v0.1.0
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="font-mono text-[10px] text-muted-foreground">
              complementary to{' '}
              <span className="text-violet-300">Buzz</span>
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="font-mono text-[10px] text-muted-foreground">
              Nostr-native · MCP/ACP · polyglot
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground mr-2">
              Orchestrator: <span className={running ? 'text-emerald-300' : 'text-rose-300'}>{running ? 'live' : 'paused'}</span>
            </span>
            <button
              onClick={() => (running ? stop() : start())}
              className="inline-flex items-center gap-1.5 min-h-11 rounded-lg border border-violet-400/30 bg-violet-500/10 hover:bg-violet-500/20 px-4 py-2 font-mono text-[11px] font-medium text-violet-200 transition-colors"
            >
              {running ? (
                <>
                  <Square className="w-3 h-3" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> Resume
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
