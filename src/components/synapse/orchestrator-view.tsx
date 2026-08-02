'use client';

import { useSynapse } from '@/lib/synapse/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassCard,
  AgentAvatar,
  TaskStatePill,
  SectionHeading,
  timeAgo,
} from './primitives';
import { CheckCircle2, Circle, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

export function OrchestratorView() {
  const tasks = useSynapse((s) => s.tasks);
  const activeTaskId = useSynapse((s) => s.activeTaskId);
  const agents = useSynapse((s) => s.agents);
  const feed = useSynapse((s) => s.feed);
  const setActiveTask = useSynapse((s) => s.setActiveTask);
  const getAgent = useSynapse((s) => s.getAgent);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? tasks[0];

  // Critic & Hermes agents
  const hermes = agents.find((a) => a.name === 'Hermes-Prime');
  const critic = agents.find((a) => a.name === 'Critias-Prime');

  // Recent orchestrator events
  const orchEvents = feed
    .filter((f) => f.event.kind === 30005)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="HERMES-CLASS · LIVE"
        title="Orchestrator Live View"
        description="The embedded privileged-but-sandboxed orchestrator fans out specialized sub-agents on every task, runs the harsh-critic loop, and refuses to settle for anything that is not utterly perfect."
        right={
          hermes && (
            <div className="flex items-center gap-2.5 px-3 py-2 glass rounded-xl">
              <AgentAvatar agent={hermes} size={28} />
              <div className="text-xs">
                <div className="font-semibold">{hermes.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  trust {hermes.trustScore}
                </div>
              </div>
              <span className="pulse-dot pulse-dot-violet ml-1" />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        {/* Active task card */}
        <GlassCard strong className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {activeTask && (
              <motion.div
                key={activeTask.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-widest text-violet-300/80 uppercase mb-1">
                      ACTIVE TASK · {activeTask.id}
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold leading-tight">
                      {activeTask.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {activeTask.description}
                    </p>
                  </div>
                  <TaskStatePill state={activeTask.state} />
                </div>

                {/* Iteration & critic bar */}
                <div className="flex items-center gap-4 mb-5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-muted-foreground">ITER</span>
                    <span className="font-mono font-bold text-foreground">
                      {activeTask.iterations}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-white/10" />
                  {activeTask.criticVerdict && (
                    <div
                      className={`flex items-center gap-1.5 font-mono font-bold ${
                        activeTask.criticVerdict === 'WOWED'
                          ? 'text-emerald-300'
                          : 'text-rose-300'
                      }`}
                    >
                      {activeTask.criticVerdict === 'WOWED' ? (
                        <Sparkles className="w-3 h-3" />
                      ) : (
                        <ShieldAlert className="w-3 h-3" />
                      )}
                      {activeTask.criticVerdict}
                    </div>
                  )}
                  {activeTask.completedAt && (
                    <>
                      <div className="h-3 w-px bg-white/10" />
                      <span className="font-mono text-muted-foreground">
                        done {timeAgo(activeTask.completedAt)}
                      </span>
                    </>
                  )}
                </div>

                {/* Plan steps */}
                <div className="space-y-2">
                  <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-2">
                    Plan · Fan-out
                  </div>
                  {activeTask.plan.map((step, i) => {
                    const assignee = step.assignee ? getAgent(step.assignee) : undefined;
                    return (
                      <motion.div
                        key={step.id}
                        initial={false}
                        animate={{
                          backgroundColor:
                            step.status === 'active'
                              ? 'rgba(167, 139, 250, 0.08)'
                              : step.status === 'critic-blocked'
                              ? 'rgba(244, 63, 94, 0.10)'
                              : 'rgba(255,255,255,0.02)',
                        }}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                          step.status === 'active'
                            ? 'border-violet-400/30'
                            : step.status === 'critic-blocked'
                            ? 'border-rose-400/30'
                            : step.status === 'done'
                            ? 'border-emerald-400/15'
                            : 'border-white/8'
                        }`}
                      >
                        <div className="shrink-0">
                          {step.status === 'done' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          ) : step.status === 'active' ? (
                            <Loader2 className="w-4 h-4 text-violet-300 animate-spin" />
                          ) : step.status === 'critic-blocked' ? (
                            <ShieldAlert className="w-4 h-4 text-rose-300" />
                          ) : (
                            <Circle className="w-4 h-4 text-white/25" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm leading-snug ${
                              step.status === 'done'
                                ? 'text-muted-foreground line-through decoration-white/15'
                                : step.status === 'active'
                                ? 'text-foreground'
                                : step.status === 'critic-blocked'
                                ? 'text-rose-200'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <span className="font-mono text-[10px] text-white/40 mr-2">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            {step.description}
                          </div>
                        </div>
                        {assignee && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <AgentAvatar agent={assignee} size={22} ring={false} />
                            <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                              {assignee.name}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Critic note */}
                {activeTask.criticNote && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`mt-4 rounded-xl border p-3 ${
                      activeTask.criticVerdict === 'WOWED'
                        ? 'border-emerald-400/25 bg-emerald-500/5'
                        : 'border-rose-400/20 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {critic && <AgentAvatar agent={critic} size={26} ring={false} />}
                      <div>
                        <div
                          className={`font-mono text-[10px] tracking-widest uppercase mb-0.5 ${
                            activeTask.criticVerdict === 'WOWED'
                              ? 'text-emerald-300/90'
                              : 'text-rose-300/90'
                          }`}
                        >
                          {critic?.name ?? 'Critias-Prime'} ·{' '}
                          {activeTask.criticVerdict === 'WOWED' ? 'verdict' : 'critique'}
                        </div>
                        <p
                          className={`text-xs leading-relaxed ${
                            activeTask.criticVerdict === 'WOWED'
                              ? 'text-emerald-100/90'
                              : 'text-rose-100/85'
                          }`}
                        >
                          {activeTask.criticNote}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Right rail: task queue + critic panel */}
        <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-3">
              Task queue
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto synapse-scroll pr-1">
              {tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTask(t.id)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 border transition-all ${
                    t.id === activeTaskId
                      ? 'border-violet-400/40 bg-violet-500/10'
                      : 'border-white/8 hover:border-white/15 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {t.id}
                    </span>
                    <TaskStatePill state={t.state} />
                  </div>
                  <div className="text-xs leading-snug line-clamp-2">{t.title}</div>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-3">
              Orchestrator stream
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto synapse-scroll pr-1">
              <AnimatePresence initial={false}>
                {orchEvents.length === 0 && (
                  <div className="text-xs text-muted-foreground italic px-1">
                    Waiting for orchestrator events…
                  </div>
                )}
                {orchEvents.map((f) => {
                  const a = getAgent(f.event.pubkey);
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 text-xs"
                    >
                      {a && <AgentAvatar agent={a} size={18} ring={false} />}
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground/90 leading-snug">
                          {f.summary}
                        </div>
                        <div className="font-mono text-[9px] text-muted-foreground mt-0.5">
                          {timeAgo(f.event.createdAt)} · {a?.npub?.slice(0, 14)}…
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
