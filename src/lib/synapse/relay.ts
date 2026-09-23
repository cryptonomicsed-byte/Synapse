/**
 * Synapse → Nostr relay transport (E-29)
 *
 * Publishes every signed SynapseEvent to a Nostr relay via WebSocket.
 * Uses nostr-tools SimplePool when available, bare WebSocket otherwise.
 *
 * Configuration:
 *   SYNAPSE_RELAY_URL  — relay to publish to (default: wss://relay.damus.io)
 *   SYNAPSE_RELAY_ENABLED — set to "false" to disable (default: enabled in browser)
 *
 * The module is fail-open: any error during publish is logged but never thrown.
 * All 7 Synapse event kinds (30000–30006) are forwarded.
 */

import type { SignedSynapseEvent } from './signing';

// ── configuration ─────────────────────────────────────────────────────────────

function relayUrl(): string {
  if (typeof process !== 'undefined' && process.env?.SYNAPSE_RELAY_URL) {
    return process.env.SYNAPSE_RELAY_URL.trim();
  }
  return 'wss://relay.damus.io';
}

function relayEnabled(): boolean {
  // Disabled only if explicitly set to "false"
  if (typeof process !== 'undefined' && process.env?.SYNAPSE_RELAY_ENABLED === 'false') {
    return false;
  }
  return true;
}

// ── nostr-tools SimplePool (preferred path) ────────────────────────────────────

type NostrModule = {
  SimplePool?: { new(): { publish(relays: string[], event: unknown): unknown } };
};

let _pool: { publish(relays: string[], event: unknown): unknown } | null = null;
let _poolTried = false;

async function getPool() {
  if (_poolTried) return _pool;
  _poolTried = true;
  try {
    const mod: NostrModule = await import('nostr-tools');
    if (mod.SimplePool) {
      _pool = new mod.SimplePool();
    }
  } catch {
    // nostr-tools unavailable — fall through to bare WebSocket
  }
  return _pool;
}

// ── bare WebSocket fallback ────────────────────────────────────────────────────

function publishViaBareWebSocket(url: string, event: SignedSynapseEvent): void {
  // Only runs in environments where WebSocket is available (browser / Node ≥22)
  const WS = typeof WebSocket !== 'undefined'
    ? WebSocket
    : (typeof globalThis.WebSocket !== 'undefined' ? globalThis.WebSocket : null);

  if (!WS) {
    console.warn('[Synapse/relay] WebSocket unavailable — event not forwarded to relay.', event.id);
    return;
  }

  try {
    const ws = new WS(url);
    ws.onopen = () => {
      try {
        // NIP-01: ["EVENT", <event>]
        ws.send(JSON.stringify(['EVENT', event]));
      } catch (e) {
        console.warn('[Synapse/relay] ws.send failed:', e);
      } finally {
        // Close after a short drain window
        setTimeout(() => {
          try { ws.close(); } catch { /* ignore */ }
        }, 2000);
      }
    };
    ws.onerror = (e) => {
      console.warn('[Synapse/relay] WebSocket error for', url, e);
    };
  } catch (e) {
    console.warn('[Synapse/relay] Could not open WebSocket to', url, e);
  }
}

// ── public API ─────────────────────────────────────────────────────────────────

let _warned = false;

/**
 * Publish a signed SynapseEvent to the configured Nostr relay.
 * Fire-and-forget — never throws.
 */
export async function publishToRelay(event: SignedSynapseEvent): Promise<void> {
  if (!relayEnabled()) return;

  const url = relayUrl();

  try {
    const pool = await getPool();

    if (pool) {
      // nostr-tools path
      pool.publish([url], event);
      return;
    }

    // Bare WebSocket fallback
    if (!_warned) {
      console.info(
        `[Synapse/relay] nostr-tools SimplePool unavailable — using bare WebSocket to ${url}`,
      );
      _warned = true;
    }
    publishViaBareWebSocket(url, event);
  } catch (e) {
    console.warn('[Synapse/relay] publishToRelay failed (fail-open):', e);
  }
}
