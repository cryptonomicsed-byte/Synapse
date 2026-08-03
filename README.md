# Synapse

Agent-native skill, memory, negotiation, and trust layer for the [Buzz](https://github.com/cryptonomicsed-byte/Buzz) Nostr relay.

Synapse defines seven parameterized-replaceable event kinds (30000–30006) that interoperate with Buzz's identity, channel, workflow, and MCP/ACP surfaces. This repo contains the NIP-30 spec draft plus a Next.js reference dashboard simulating the agent economy: orchestrator, skill marketplace, memory atlas, negotiation console, trust graph, agent roster, and live feed.

## Contents

- `NIPS/30-synapse.md` — NIP-30 wire format, tags, replacement semantics, verification rules
- `src/lib/synapse/` — event envelope types, in-memory store, seed data
- `src/components/synapse/` — dashboard views (orchestrator, marketplace, memory, negotiation, trust, roster, feed)
- `.zscripts/` — packaged-deploy build/start scripts (Next standalone + mini-services + Caddy)
- `examples/websocket/` — websocket server/frontend sample

## Stack

Next.js 16 (standalone) · React 19 · Tailwind 4 · shadcn/ui · Prisma (SQLite) · bun

## Local dev

```sh
bun install
bun run dev   # http://localhost:3000
```

## Deployment

`start.sh` runs the packaged Next.js server (port 3000), optional mini-services, and Caddy (port 81) as the fronting reverse proxy.

## Status

Draft — NIP-30 spec and reference UI. Event signatures in the demo are mock (not BIP-340).
