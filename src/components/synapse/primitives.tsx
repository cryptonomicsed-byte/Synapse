'use client';

import { cn } from '@/lib/utils';
import type { Agent, TaskState, NegotiationState } from '@/lib/synapse/types';

// ─── Agent Avatar ─────────────────────────────────────────────
export function AgentAvatar({
  agent,
  size = 36,
  ring = true,
}: {
  agent: Agent;
  size?: number;
  ring?: boolean;
}) {
  const hue = agent.hue;
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full shrink-0 overflow-hidden',
        ring && 'ring-1 ring-white/10',
      )}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from 200deg at 50% 50%,
          hsl(${hue} 80% 55%),
          hsl(${(hue + 50) % 360} 80% 60%),
          hsl(${(hue + 120) % 360} 75% 50%),
          hsl(${hue} 80% 55%))`,
      }}
    >
      <div className="absolute inset-[2px] rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center">
        <span
          className="font-mono font-bold text-white/90"
          style={{ fontSize: size * 0.36 }}
        >
          {agent.name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ─── Trust Meter ─────────────────────────────────────────────
export function TrustMeter({
  value,
  max = 1000,
  showValue = true,
  className,
}: {
  value: number;
  max?: number;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tier =
    value >= 950 ? 'S' : value >= 900 ? 'A' : value >= 800 ? 'B' : value >= 700 ? 'C' : 'D';
  const tierColor =
    tier === 'S'
      ? 'text-fuchsia-300'
      : tier === 'A'
      ? 'text-violet-300'
      : tier === 'B'
      ? 'text-emerald-300'
      : tier === 'C'
      ? 'text-amber-300'
      : 'text-rose-300';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, oklch(0.72 0.27 305), oklch(0.78 0.20 75), oklch(0.72 0.22 162))',
          }}
        />
      </div>
      {showValue && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-muted-foreground">{value}</span>
          <span className={cn('font-mono text-[10px] font-bold', tierColor)}>{tier}</span>
        </div>
      )}
    </div>
  );
}

// ─── Kind Badge ─────────────────────────────────────────────
const KIND_STYLES: Record<number, { label: string; color: string }> = {
  30000: { label: 'SKILL', color: 'text-violet-300 border-violet-400/30 bg-violet-500/10' },
  30001: { label: 'MEMORY', color: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10' },
  30002: { label: 'ENDORSE', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10' },
  30003: { label: 'NEGOTIATE', color: 'text-pink-300 border-pink-400/30 bg-pink-500/10' },
  30004: { label: 'COMPOSE', color: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10' },
  30005: { label: 'VERDICT', color: 'text-rose-300 border-rose-400/30 bg-rose-500/10' },
  30006: { label: 'INTENT', color: 'text-teal-300 border-teal-400/30 bg-teal-500/10' },
};

export function KindBadge({ kind }: { kind: number }) {
  const s = KIND_STYLES[kind] ?? { label: `K${kind}`, color: 'text-white/70 border-white/15 bg-white/5' };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider',
        s.color,
      )}
    >
      {s.label}
    </span>
  );
}

// ─── Task State Pill ─────────────────────────────────────────
export function TaskStatePill({ state }: { state: TaskState }) {
  const map: Record<TaskState, string> = {
    QUEUED: 'text-white/60 border-white/15 bg-white/5',
    PLANNING: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
    FAN_OUT: 'text-violet-300 border-violet-400/30 bg-violet-500/10',
    CRITIQUE: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
    ITERATING: 'text-pink-300 border-pink-400/30 bg-pink-500/10',
    COMPLETE: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase',
        map[state],
      )}
    >
      {state === 'CRITIQUE' || state === 'ITERATING' ? (
        <span className="pulse-dot pulse-dot-rose" />
      ) : state === 'FAN_OUT' ? (
        <span className="pulse-dot pulse-dot-violet" />
      ) : state === 'PLANNING' ? (
        <span className="pulse-dot pulse-dot-amber" />
      ) : state === 'COMPLETE' ? (
        <span className="pulse-dot" />
      ) : null}
      {state.replace('_', ' ')}
    </span>
  );
}

// ─── Negotiation State Pill ─────────────────────────────────
export function NegStatePill({ state }: { state: NegotiationState }) {
  const map: Record<NegotiationState, string> = {
    PROPOSED: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
    COUNTERED: 'text-pink-300 border-pink-400/30 bg-pink-500/10',
    ACCEPTED: 'text-violet-300 border-violet-400/30 bg-violet-500/10',
    EXECUTING: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10',
    SETTLED: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
    REJECTED: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider',
        map[state],
      )}
    >
      {state}
    </span>
  );
}

// ─── Glass Card ─────────────────────────────────────────────
export function GlassCard({
  children,
  className,
  hover = false,
  strong = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        strong ? 'glass-strong' : 'glass',
        'rounded-2xl',
        hover && 'glass-hover',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Section heading ────────────────────────────────────────
export function SectionHeading({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="font-mono text-[10px] tracking-[0.25em] text-violet-300/80 uppercase mb-1.5">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ─── Time-ago helper ────────────────────────────────────────
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Shorten pubkey ─────────────────────────────────────────
export function shortPk(pk: string): string {
  if (!pk) return '';
  return pk.slice(0, 8) + '…' + pk.slice(-6);
}
