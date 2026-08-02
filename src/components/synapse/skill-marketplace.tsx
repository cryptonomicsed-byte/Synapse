'use client';

import { useState } from 'react';
import { useSynapse } from '@/lib/synapse/store';
import {
  GlassCard,
  AgentAvatar,
  TrustMeter,
  SectionHeading,
  KindBadge,
} from './primitives';
import { motion } from 'framer-motion';
import { Boxes, GitBranch, Clock, Coins, Tag } from 'lucide-react';
import type { SkillCard } from '@/lib/synapse/types';

const LANG_COLORS: Record<string, string> = {
  Rust: 'text-orange-300 border-orange-400/30 bg-orange-500/10',
  Python: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  Go: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  TypeScript: 'text-violet-300 border-violet-400/30 bg-violet-500/10',
  Haskell: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10',
  Elixir: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  Scala: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  Move: 'text-teal-300 border-teal-400/30 bg-teal-500/10',
};

export function SkillMarketplace() {
  const skills = useSynapse((s) => s.skills);
  const getAgent = useSynapse((s) => s.getAgent);
  const getSkill = useSynapse((s) => s.getSkill);
  const [selected, setSelected] = useState<SkillCard | null>(skills[0] ?? null);

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="KIND 30000 · SIGNED EVENTS"
        title="Skill Marketplace"
        description="Every skill is a signed Nostr event. Agents publish capabilities with schemas, SLAs, and cost-in-trust. Composition edges let skills compose into swarms — Clio tends the DAG."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Skill grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skills.map((skill, i) => {
            const publisher = getAgent(skill.publisher);
            const isSelected = selected?.id === skill.id;
            return (
              <motion.button
                key={skill.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                onClick={() => setSelected(skill)}
                className={`text-left rounded-2xl p-4 border transition-all ${
                  isSelected
                    ? 'glass-strong border-violet-400/40'
                    : 'glass border-white/8 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-mono text-[10px] tracking-widest text-violet-300/80">
                    {skill.id.toUpperCase()}
                  </div>
                  <KindBadge kind={30000} />
                </div>
                <h3 className="font-mono text-sm font-semibold text-foreground leading-snug mb-1.5">
                  {skill.name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                  {skill.description}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${
                      LANG_COLORS[skill.language] ?? 'text-white/70 border-white/15 bg-white/5'
                    }`}
                  >
                    {skill.language}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    v{skill.version}
                  </span>
                  {skill.composedOf.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-fuchsia-300">
                      <GitBranch className="w-3 h-3" />
                      {skill.composedOf.length}
                    </span>
                  )}
                </div>
                <TrustMeter value={skill.trustScore} />
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {skill.costTrust} trust
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {skill.slaMs}ms
                  </span>
                  <span>↑ {skill.endorsements}</span>
                </div>
                {publisher && (
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/8">
                    <AgentAvatar agent={publisher} size={18} ring={false} />
                    <span className="font-mono text-[10px] text-muted-foreground truncate">
                      {publisher.name}
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {selected && (
            <GlassCard strong className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="font-mono text-[10px] tracking-widest text-violet-300/80">
                  {selected.id.toUpperCase()}
                </div>
                <KindBadge kind={30000} />
              </div>
              <h3 className="font-mono text-base font-semibold text-foreground mb-2">
                {selected.name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {selected.description}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Stat label="LANGUAGE" value={selected.language} />
                <Stat label="VERSION" value={`v${selected.version}`} />
                <Stat label="SLA" value={`${selected.slaMs}ms`} />
                <Stat label="COST" value={`${selected.costTrust} trust`} />
                <Stat label="ENDORSEMENTS" value={`${selected.endorsements}`} />
                <Stat label="TRUST" value={`${selected.trustScore}`} />
              </div>

              <div className="mb-4">
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-2">
                  Input schema
                </div>
                <div className="rounded-lg border border-white/8 bg-black/30 p-2.5 font-mono text-[11px] space-y-1">
                  {Object.entries(selected.inputSchema).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-violet-300">{k}</span>
                      <span className="text-white/30">:</span>
                      <span className="text-emerald-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-2">
                  Output schema
                </div>
                <div className="rounded-lg border border-white/8 bg-black/30 p-2.5 font-mono text-[11px] space-y-1">
                  {Object.entries(selected.outputSchema).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-fuchsia-300">{k}</span>
                      <span className="text-white/30">:</span>
                      <span className="text-emerald-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selected.composedOf.length > 0 && (
                <div className="mb-4">
                  <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                    <Boxes className="w-3 h-3" />
                    Composed of
                  </div>
                  <div className="space-y-1.5">
                    {selected.composedOf.map((sid) => {
                      const dep = getSkill(sid);
                      return (
                        <div
                          key={sid}
                          className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5"
                        >
                          <span className="font-mono text-[11px] text-foreground/80">
                            {dep?.name ?? sid}
                          </span>
                          {dep && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              v{dep.version}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3 h-3 text-muted-foreground" />
                {selected.tags.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[10px] text-muted-foreground/80 rounded-md bg-white/5 px-1.5 py-0.5"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
      <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-0.5">
        {label}
      </div>
      <div className="font-mono text-sm text-foreground font-semibold">{value}</div>
    </div>
  );
}
