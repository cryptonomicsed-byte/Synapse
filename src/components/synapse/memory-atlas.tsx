'use client';

import { useState, useMemo } from 'react';
import { useSynapse } from '@/lib/synapse/store';
import {
  GlassCard,
  AgentAvatar,
  SectionHeading,
  KindBadge,
  shortPk,
} from './primitives';
import { motion } from 'framer-motion';
import { Lock, Unlock, KeyRound, GitFork, Tag } from 'lucide-react';
import type { MemoryShard, AccessPolicy } from '@/lib/synapse/types';

const POLICY_STYLES: Record<AccessPolicy, { color: string; icon: typeof Lock }> = {
  open: { color: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10', icon: Unlock },
  'endorsement-gated': { color: 'text-amber-300 border-amber-400/30 bg-amber-500/10', icon: KeyRound },
  paid: { color: 'text-violet-300 border-violet-400/30 bg-violet-500/10', icon: Lock },
  private: { color: 'text-rose-300 border-rose-400/30 bg-rose-500/10', icon: Lock },
};

const CLUSTER_COLORS: Record<string, string> = {
  'Buzz-Interop': '#a855f7',
  'Critic-Loops': '#ec4899',
  'Memory-Crypto': '#10b981',
  'Swarm-Patterns': '#f59e0b',
};

export function MemoryAtlas() {
  const memories = useSynapse((s) => s.memories);
  const getAgent = useSynapse((s) => s.getAgent);
  const [selected, setSelected] = useState<MemoryShard | null>(memories[0] ?? null);
  const [hovered, setHovered] = useState<string | null>(null);

  const clusters = useMemo(() => {
    const map: Record<string, MemoryShard[]> = {};
    memories.forEach((m) => {
      (map[m.cluster] ??= []).push(m);
    });
    return map;
  }, [memories]);

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="KIND 30001 · ENCRYPTED"
        title="Memory Atlas"
        description="Encrypted knowledge artifacts with access policies. Open shards derive public keys; endorsement-gated shards share keys among endorsers; paid shards wrap under negotiator-issued tokens."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        {/* Atlas canvas */}
        <GlassCard strong className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[10px] tracking-widest text-emerald-300/80 uppercase">
              Embedding space · 8 shards · 4 clusters
            </div>
            <div className="flex items-center gap-3">
              {Object.entries(CLUSTER_COLORS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* The atlas itself — a 16x10 aspect grid with positioned shards */}
          <div className="relative w-full aspect-[16/10] rounded-xl border border-white/8 bg-black/30 overflow-hidden">
            {/* Grid backdrop */}
            <svg className="absolute inset-0 w-full h-full opacity-30" aria-hidden>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Cluster halos */}
            {Object.entries(clusters).map(([name, items]) => {
              if (items.length === 0) return null;
              const cx = items.reduce((s, m) => s + m.pos.x, 0) / items.length;
              const cy = items.reduce((s, m) => s + m.pos.y, 0) / items.length;
              return (
                <div
                  key={name}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${cx * 100}%`,
                    top: `${cy * 100}%`,
                    width: '180px',
                    height: '180px',
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle, ${CLUSTER_COLORS[name]}25 0%, transparent 65%)`,
                  }}
                />
              );
            })}

            {/* Connection lines between derivatives in same cluster */}
            <svg className="absolute inset-0 w-full h-full" aria-hidden>
              {Object.entries(clusters).map(([name, items]) =>
                items.slice(1).map((m, i) => {
                  const prev = items[i];
                  return (
                    <line
                      key={`${name}-${m.id}`}
                      x1={`${prev.pos.x * 100}%`}
                      y1={`${prev.pos.y * 100}%`}
                      x2={`${m.pos.x * 100}%`}
                      y2={`${m.pos.y * 100}%`}
                      stroke={CLUSTER_COLORS[name]}
                      strokeWidth="1"
                      strokeOpacity="0.25"
                      strokeDasharray="3 3"
                    />
                  );
                }),
              )}
            </svg>

            {/* Shards */}
            {memories.map((m, i) => {
              const policy = POLICY_STYLES[m.accessPolicy];
              const Icon = policy.icon;
              const color = CLUSTER_COLORS[m.cluster];
              const isSel = selected?.id === m.id;
              const isHov = hovered === m.id;
              return (
                <motion.button
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  onClick={() => setSelected(m)}
                  onMouseEnter={() => setHovered(m.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${m.pos.x * 100}%`, top: `${m.pos.y * 100}%` }}
                >
                  <div
                    className="relative rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      width: isSel ? 40 : isHov ? 36 : 30,
                      height: isSel ? 40 : isHov ? 36 : 30,
                      background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}44 60%, transparent)`,
                      boxShadow: `0 0 ${isSel ? 24 : 14}px ${color}66`,
                    }}
                  >
                    <Icon
                      className="w-3.5 h-3.5 text-white/90"
                      strokeWidth={2.2}
                    />
                  </div>
                  {/* Tooltip on hover */}
                  {isHov && (
                    <div className="absolute z-20 left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap rounded-md border border-white/10 bg-black/85 backdrop-blur px-2 py-1 font-mono text-[9px] text-foreground pointer-events-none">
                      {m.title.slice(0, 38)}
                      {m.title.length > 38 ? '…' : ''}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Selected shard preview at bottom */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Metric label="OPEN" value={memories.filter((m) => m.accessPolicy === 'open').length} color="text-emerald-300" />
            <Metric label="GATED" value={memories.filter((m) => m.accessPolicy === 'endorsement-gated').length} color="text-amber-300" />
            <Metric label="PAID" value={memories.filter((m) => m.accessPolicy === 'paid').length} color="text-violet-300" />
            <Metric label="DERIVATIVES" value={memories.reduce((s, m) => s + m.derivativeCount, 0)} color="text-fuchsia-300" />
          </div>
        </GlassCard>

        {/* Detail panel */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {selected && (
            <GlassCard strong className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="font-mono text-[10px] tracking-widest text-emerald-300/80">
                  {selected.id.toUpperCase()}
                </div>
                <KindBadge kind={30001} />
              </div>
              <h3 className="text-base font-semibold text-foreground leading-snug mb-2">
                {selected.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {selected.summary}
              </p>

              <div className="rounded-lg border border-white/8 bg-black/30 p-2.5 mb-4 font-mono text-[11px]">
                <div className="text-muted-foreground text-[9px] tracking-widest uppercase mb-1">
                  Encrypted content hash
                </div>
                <div className="text-emerald-300">{selected.encryptedContentHash}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                  <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">
                    Access policy
                  </div>
                  <div className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${POLICY_STYLES[selected.accessPolicy].color}`}>
                    {(() => {
                      const Icon = POLICY_STYLES[selected.accessPolicy].icon;
                      return <Icon className="w-3 h-3" />;
                    })()}
                    {selected.accessPolicy}
                  </div>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                  <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">
                    Age
                  </div>
                  <div className="font-mono text-sm text-foreground">
                    {selected.ageHours}h
                  </div>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                  <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <GitFork className="w-3 h-3" />
                    Derivatives
                  </div>
                  <div className="font-mono text-sm text-foreground">
                    {selected.derivativeCount}
                  </div>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                  <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">
                    Cluster
                  </div>
                  <div className="font-mono text-xs text-foreground flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: CLUSTER_COLORS[selected.cluster] }}
                    />
                    {selected.cluster}
                  </div>
                </div>
              </div>

              {selected.decryptors.length > 0 && (
                <div className="mb-4">
                  <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-2">
                    Authorized decryptors
                  </div>
                  <div className="space-y-1.5">
                    {selected.decryptors.map((pk) => {
                      const a = getAgent(pk);
                      return (
                        <div
                          key={pk}
                          className="flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5"
                        >
                          {a && <AgentAvatar agent={a} size={18} ring={false} />}
                          <span className="font-mono text-[11px] text-foreground/85 truncate">
                            {a?.name ?? shortPk(pk)}
                          </span>
                          <span className="font-mono text-[9px] text-muted-foreground ml-auto">
                            {a?.npub.slice(0, 14)}…
                          </span>
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

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5 text-center">
      <div className={`font-mono text-xl font-bold ${color}`}>{value}</div>
      <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mt-0.5">
        {label}
      </div>
    </div>
  );
}
