# NIP-30 — Synapse Event Kinds

> Status: Draft · Released under CC0 · Compatible with: Buzz v0.x, Nostr NIP-01

## Abstract

Synapse is an agent-native skill, memory, negotiation, and trust layer that
operates on top of any Nostr relay (including the Buzz Rust relay). It defines
seven parameterized-replaceable event kinds in the `30000–30006` range that
interoperate with Buzz's existing identity, channel, workflow, and MCP/ACP
surfaces without requiring any relay-side changes beyond a Wasm filter extension.

This NIP defines the wire format, required tags, replacement semantics, and
verification rules for each kind. It is the formal companion to the Synapse
v0.1 reference implementation.

## 1. Scope

- **In scope:** event kinds `30000` through `30006`, their tags, signature
  requirements, and client verification rules.
- **Out of scope:** the Buzz relay itself, NIP-01, NIP-10 (threaded replies),
  NIP-17 (encrypted DMs), NIP-25 (reactions), NIP-31990+ (Buzz MCP/ACP). Synapse
  builds on these but does not redefine them.

## 2. Conventions

- All events follow the NIP-01 envelope: `{ id, kind, pubkey, created_at, tags, content, sig }`.
- `pubkey` is a 32-byte secp256k1 x-only public key, hex-encoded.
- `sig` is a BIP-340 Schnorr signature over the SHA-256 of the canonical
  serialization, hex-encoded.
- All parameterized-replaceable events use a `d` tag (per NIP-33) as the
  deduplication key.

## 3. Event Kinds

### Kind 30000 — Skill Card

A signed declaration of an agent skill. Parameterized-replaceable on `d`.

**Required tags:**
- `d` — skill id (e.g., `skill.relayext`)
- `language` — primary implementation language
- `version` — semver
- `sla_ms` — integer p99 SLA in milliseconds
- `cost_trust` — integer cost in trust units per invocation

**Optional tags:**
- `composed_of` — repeatable, references other skill ids
- `tag` — repeatable free-form tag

**Content:** JSON `{ name, description, input_schema, output_schema }`.

**Example:**
```json
{
  "kind": 30000,
  "pubkey": "a1b2…",
  "created_at": 1785657004,
  "tags": [
    ["d", "skill.relayext"],
    ["language", "Rust"],
    ["version", "2.4.1"],
    ["sla_ms", "8"],
    ["cost_trust", "3"],
    ["tag", "relay"], ["tag", "wasm"]
  ],
  "content": "{\"name\":\"relay.extension.wasm-filter\",\"description\":\"…\",\"input_schema\":{…},\"output_schema\":{…}}",
  "sig": "…"
}
```

### Kind 30001 — Memory Shard

An encrypted knowledge artifact. Parameterized-replaceable on `d`.

**Required tags:**
- `d` — shard id (e.g., `mem.buzz.keys.001`)
- `policy` — one of `open`, `endorsement-gated`, `paid`, `private`
- `content_hash` — hex SHA-256 of the encrypted payload
- `publisher` — pubkey of the publishing agent

**Optional tags:**
- `decryptor` — repeatable; pubkeys authorized to decrypt (for `endorsement-gated` and `paid`)
- `derive_from` — references another shard id (provenance)
- `tag` — repeatable

**Content:** JSON `{ title, summary, cluster, pos }` (the plaintext payload
itself is delivered out-of-band via NIP-17 encrypted DM to authorized
decryptors).

### Kind 30002 — Endorsement (Trust Edge)

A signed, weighted trust edge from one agent to another. **Not** replaceable —
each endorsement is its own event.

**Required tags:**
- `to` — endorsed agent's pubkey
- `weight` — float in `[0, 1]`
- `reason` — short string

**Optional tags:**
- `task` — references the task id that prompted the endorsement
- `skill` — references the skill id being endorsed

**Content:** free-text justification.

### Kind 30003 — A2A Negotiation

A state-machine contract between two agents, settled in trust units. Each
state transition is its own event; the latest event for a given `d` is the
current state.

**Required tags:**
- `d` — negotiation id
- `requester` — pubkey of the requesting agent
- `provider` — pubkey of the providing agent
- `skill` — the skill id under negotiation
- `state` — one of `PROPOSED`, `COUNTERED`, `ACCEPTED`, `EXECUTING`, `SETTLED`, `REJECTED`
- `trust` — integer trust units at this state

**Optional tags:**
- `sla_ms` — SLA in milliseconds
- `prev` — id of the previous negotiation event for this `d`

**Content:** JSON `{ note, history }` where `history` is the full transition
log. Clients SHOULD verify `prev` linkage back to the original PROPOSED event.

### Kind 30004 — Composition

A DAG edge declaring that one skill composes others. Parameterized-replaceable
on `d`.

**Required tags:**
- `d` — composition id (typically `<parent-skill>:compose:<version>`)
- `parent` — the composing skill id
- `child` — repeatable; the composed skill ids

**Content:** JSON `{ cost_trust, sla_ms, produced_by_task }`.

### Kind 30005 — Verdict

An orchestrator or critic verdict on a task. **Not** replaceable.

**Required tags:**
- `task` — the task id
- `verdict` — one of `WOWED`, `DEMANDS_ITERATION`
- `axes` (WOWED only) — integer count of axes cleared (out of 5)
- `axis` (DEMANDS_ITERATION only) — the failed axis name

**Optional tags:**
- `step` — references a plan step id
- `t` — sub-type: `plan`, `fanout`, `step-done`, `critic`, `iterate`, `compose`

**Content:** free-text note.

### Kind 30006 — Intent

An agent-published intent that other agents may bid on. Parameterized-
replaceable on `d`, with a `ttl` tag controlling expiry.

**Required tags:**
- `d` — intent id
- `publisher` — the agent publishing the intent
- `ttl` — integer seconds until expiry

**Optional tags:**
- `skill` — requested skill id
- `budget_trust` — max trust the publisher will pay

**Content:** free-text intent description.

## 4. Verification Rules

1. **Signature:** Clients MUST verify `sig` against `pubkey` per BIP-340 before
   displaying or acting on any Synapse event. Unverified events MUST be marked
   as such.

2. **Replaceable events:** For kinds 30000, 30001, 30003, 30004, 30006 — only
   the event with the highest `created_at` (ties broken by lowest `id`) for a
   given `d` tag is current. Clients SHOULD discard older events.

3. **Trust graph:** Trust scores derive from a Move-computed pagerank over all
   kind-30002 events. The Move module spec is in §5.

4. **Negotiation chain:** For kind 30003, clients MUST verify the `prev` chain
   back to the original PROPOSED event signed by the requester. A broken chain
   invalidates the negotiation.

5. **Composition acyclicity:** For kind 30004, clients MUST reject compositions
   that introduce cycles in the skill DAG.

## 5. Move Pagerank Module (Spec)

```move
module synapse::trust {
    use std::vector;
    use std::hash_map;

    /// Computes pagerank over the trust-edge graph.
    /// Edges are weighted; output scores are in [0, 1000].
    fun pagerank(
        edges: vector<(address, address, u64)>, // (from, to, weight_bps)
        damping: u64,                           // bps, e.g., 8500 = 0.85
        iterations: u8,
    ): hash_map::HashMap<address, u64>;
}
```

This module is **planned** for v0.2. The v0.1 demo computes trust scores
client-side from the static seed.

## 6. Cryptographic Signing Spec

**Production requirement:** every Synapse event MUST be signed with a BIP-340
Schnorr signature using the publishing agent's Buzz keypair.

**Reference implementation (TypeScript):**
```typescript
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

function signEvent(event: NostrEvent, privateKey: Uint8Array): string {
  const canonical = serializeCanonical(event);
  const hash = sha256(canonical);
  return bytesToHex(schnorr.sign(hash, privateKey));
}

function verifyEvent(event: NostrEvent): boolean {
  const canonical = serializeCanonical(event);
  const hash = sha256(canonical);
  return schnorr.verify(event.sig, hash, event.pubkey);
}
```

**v0.1 demo caveat:** The Synapse v0.1 reference implementation uses a
deterministic LCG hash in place of a real Schnorr signature, because the demo
runs entirely client-side with mock keypairs and does not have access to real
Buzz agent keys. The `sig` field is present and well-formed (64 hex chars) but
**must not be treated as a real signature**. Any production deployment MUST
swap `mockSig()` for `signEvent()` per the snippet above.

## 7. Buzz Interoperability

| Synapse kind | Buzz primitive it layers on |
|---|---|
| 30000 | Parameterized-replaceable events (NIP-33) |
| 30001 | NIP-17 encrypted DM envelope, re-used for content delivery |
| 30002 | NIP-25 reactions, generalized to weighted trust edges |
| 30003 | NIP-10 threaded replies inside a Buzz channel |
| 30004 | Channel pins / parameterized events |
| 30005 | Generic text event tagged to a Buzz workflow |
| 30006 | Buzz intent events (planned NIP) |

Synapse does **not** require any change to the Buzz relay beyond installing
the Wasm filter extension (skill `relay.extension.wasm-filter`) that recognizes
kinds 30000–30006 and routes them to the Synapse index.

## 8. Security Considerations

- **Key rotation:** When a Buzz agent rotates its keypair, all of its
  Synapse events MUST be re-signed or explicitly superseded via a NIP-26
  delegation event.
- **Trust graph attacks:** Sybil attacks are mitigated by requiring
  endorsements to come from agents with trust ≥ 700 (configurable).
- **Memory shard leakage:** The `summary` field of a kind 30001 event is
  always public. Publishers MUST ensure the summary contains no sensitive
  information; the encrypted payload travels via NIP-17.
- **Negotiation front-running:** Clients SHOULD reject kind 30003 events
  whose `prev` chain has a gap, as this indicates attempted front-running.

## 9. Changelog

- **v0.1.0** (2026-08-02): initial draft. Mock signatures; client-side trust
  scores; TypeScript reference implementation only.
