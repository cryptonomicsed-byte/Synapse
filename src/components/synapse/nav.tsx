'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Activity,
  Boxes,
  Brain,
  Handshake,
  Network,
  Users,
  Radio,
  Plug,
} from 'lucide-react';

export type TabId =
  | 'orchestrator'
  | 'skills'
  | 'memory'
  | 'negotiations'
  | 'trust'
  | 'roster'
  | 'feed'
  | 'interop';

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'orchestrator', label: 'Orchestrator', icon: Activity },
  { id: 'skills', label: 'Skills', icon: Boxes },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'negotiations', label: 'A2A', icon: Handshake },
  { id: 'trust', label: 'Trust', icon: Network },
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'feed', label: 'Feed', icon: Radio },
  { id: 'interop', label: 'Buzz Interop', icon: Plug },
];

export function SynapseNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <nav className="sticky top-0 z-30 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 border-b border-white/8 bg-background/70 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 overflow-x-auto synapse-scroll pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 min-h-9 rounded-lg px-3 py-1.5 font-mono text-[11px] font-medium tracking-wide whitespace-nowrap transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/85 hover:bg-white/[0.04]',
              )}
            >
              <Icon
                className={cn(
                  'w-3.5 h-3.5',
                  isActive ? 'text-violet-300' : 'text-muted-foreground',
                )}
              />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-lg border border-violet-400/30 bg-violet-500/10 -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
