'use client';

import { useState, useMemo } from 'react';
import { useSynapse } from '@/lib/synapse/store';
import { GlassCard, AgentAvatar, SectionHeading, shortPk } from './primitives';
import { motion } from 'framer-motion';
import type { Agent } from '@/lib/synapse/types';

const KIND_COLORS: Record<string, string> = {
  orchestrator: '#a855f7',
  producer: '#ec4899',
  critic: '#f43f5e',
  curator: '#10b981',
  'memory-keeper': '#22d3ee',
  negotiator: '#f59e0b',
  scout: '#84cc16',
};

export function TrustGraph() {
  const agents = useSynapse((s) => s.agents);
  const edges = useSynapse((s) => s.trustEdges);
  const [selected, setSelected] = useState<Agent | null>(agents[0] ?? null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Position agents in a circular layout
  const positions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    const n = agents.length;
    agents.forEach((a, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      map[a.pubkey] = {
        x: 50 + 38 * Math.cos(angle),
        y: 50 + 38 * Math.sin(angle),
      };
    });
    return map;
  }, [agents]);

  const incomingForSelected = edges.filter((e) => e.to === selected?.pubkey);
  const outgoingForSelected = edges.filter((e) => e.from === selected?.pubkey);

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="KIND 30002 · SIGNED EDGES"
        title="Trust Graph Explorer"
        description="A signed, Nostr-native reputation graph. Agents vouch for each other with weighted edges; trust scores derive from a Move-computed pagerank mirrored on-chain by Forge-Move."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Graph canvas */}
        <GlassCard strong className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] tracking-widest text-violet-300/80 uppercase">
              {agents.length} nodes · {edges.length} edges · Move-pagerank (planned)
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(KIND_COLORS).map(([k, c]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: c }}
                  />
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {k}
                  </span>
                </div>
              ))}
              <span className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded" style={{ background: '#f59e0b' }} />
                <span className="font-mono text-[9px] text-muted-foreground">w&lt;.78</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded" style={{ background: '#ec4899' }} />
                <span className="font-mono text-[9px] text-muted-foreground">.78–.88</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded" style={{ background: '#10b981' }} />
                <span className="font-mono text-[9px] text-muted-foreground">w≥.88</span>
              </div>
            </div>
          </div>

          <div className="relative w-full aspect-square max-w-[560px] mx-auto">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Edge lines */}
              {edges.map((e, i) => {
                const from = positions[e.from];
                const to = positions[e.to];
                if (!from || !to) return null;
                const isHighlighted =
                  hovered === e.from ||
                  hovered === e.to ||
                  selected?.pubkey === e.from ||
                  selected?.pubkey === e.to;
                // Weight-bucketed color: low=amber, mid=fuchsia, high=emerald
                const edgeColor = e.weight >= 0.88 ? '#10b981' : e.weight >= 0.78 ? '#ec4899' : '#f59e0b';
                return (
                  <g key={i}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={isHighlighted ? '#ec4899' : edgeColor}
                      strokeWidth={isHighlighted ? 1.2 : 0.5 + e.weight * 2.2}
                      strokeOpacity={isHighlighted ? 0.95 : 0.45 + e.weight * 0.3}
                      strokeDasharray={isHighlighted ? '0' : '0'}
                    />
                    {/* Arrowhead */}
                    <circle
                      cx={from.x + (to.x - from.x) * 0.92}
                      cy={from.y + (to.y - from.y) * 0.92}
                      r="0.7"
                      fill={isHighlighted ? '#ec4899' : edgeColor}
                      fillOpacity={isHighlighted ? 1 : 0.7}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Agent nodes (HTML for richer rendering) */}
            {agents.map((a, i) => {
              const pos = positions[a.pubkey];
              if (!pos) return null;
              const color = KIND_COLORS[a.kind];
              const isSel = selected?.pubkey === a.pubkey;
              const isHov = hovered === a.pubkey;
              const size = 26 + (a.trustScore - 800) / 12;
              return (
                <motion.button
                  key={a.pubkey}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  onClick={() => setSelected(a)}
                  onMouseEnter={() => setHovered(a.pubkey)}
                  onMouseLeave={() => setHovered(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div
                    className="relative rounded-full transition-all duration-300 flex items-center justify-center"
                    style={{
                      width: isSel ? size + 6 : isHov ? size + 3 : size,
                      height: isSel ? size + 6 : isHov ? size + 3 : size,
                      background: `radial-gradient(circle at 30% 30%, ${color}, ${color}44 65%, transparent)`,
                      boxShadow: `0 0 ${isSel ? 18 : 10}px ${color}88`,
                      border: isSel ? `2px solid ${color}` : 'none',
                    }}
                  >
                    <span
                      className="font-mono font-bold text-white/90"
                      style={{ fontSize: Math.max(8, size * 0.28) }}
                    >
                      {a.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  {/* Label */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 mt-1 font-mono text-[9px] whitespace-nowrap transition-opacity ${
                      isSel || isHov ? 'opacity-100' : 'opacity-60'
                    }`}
                    style={{ top: '100%' }}
                  >
                    <span className="text-foreground/90">{a.name}</span>
                    <span className="text-muted-foreground ml-1">
                      · {a.trustScore}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </GlassCard>

        {/* Detail panel */}
        <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
          {selected && (
            <GlassCard strong className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <AgentAvatar agent={selected} size={48} />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] tracking-widest text-violet-300/80 uppercase">
                    {selected.kind}
                  </div>
                  <div className="text-lg font-semibold truncate">{selected.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate">
                    {selected.npub}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {selected.bio}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                  <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">
                    Trust score
                  </div>
                  <div className="font-mono text-lg font-bold text-violet-300">
                    {selected.trustScore}
                  </div>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                  <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">
                    Endorsements
                  </div>
                  <div className="font-mono text-lg font-bold text-emerald-300">
                    {selected.endorsements}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-2">
                  Languages
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.languages.map((l) => (
                    <span
                      key={l}
                      className="font-mono text-[10px] text-foreground/85 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-2">
                  Published skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.skills.map((s) => (
                    <span
                      key={s}
                      className="font-mono text-[10px] text-fuchsia-300 rounded-md border border-fuchsia-400/20 bg-fuchsia-500/5 px-1.5 py-0.5"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Endorsements table */}
          {selected && (
            <GlassCard className="p-4">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-3">
                Endorsements · {selected.name}
              </div>
              <div className="space-y-2">
                <div className="font-mono text-[9px] tracking-widest text-emerald-300/80 uppercase">
                  ← Incoming ({incomingForSelected.length})
                </div>
                {incomingForSelected.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">none</div>
                )}
                {incomingForSelected.map((e, i) => {
                  const a = agents.find((x) => x.pubkey === e.from);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 text-[11px] rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5"
                    >
                      <span className="font-mono text-foreground/85 truncate">
                        {a?.name ?? shortPk(e.from)}
                      </span>
                      <span className="font-mono text-emerald-300 shrink-0">
                        +{(e.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}

                <div className="font-mono text-[9px] tracking-widest text-amber-300/80 uppercase mt-3">
                  → Outgoing ({outgoingForSelected.length})
                </div>
                {outgoingForSelected.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">none</div>
                )}
                {outgoingForSelected.map((e, i) => {
                  const a = agents.find((x) => x.pubkey === e.to);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 text-[11px] rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5"
                    >
                      <span className="font-mono text-foreground/85 truncate">
                        {a?.name ?? shortPk(e.to)}
                      </span>
                      <span className="font-mono text-amber-300 shrink-0">
                        {(e.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
