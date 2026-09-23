/**
 * Synapse NIP-01 real signing — BIP-340 Schnorr via nostr-tools.
 *
 * Key derivation (two modes, tried in order):
 *   1. NOSTR_PRIVKEY env var — 32-byte hex; used for the primary/root agent key.
 *   2. HKDF-SHA256(seed, salt="synapse-agent-v1") → 32 bytes, deterministic
 *      from agent name.  Used for all other agents.
 *
 * Public key  = secp256k1 x-only BIP-340 point (Nostr pubkey format).
 *
 * Event ID (NIP-01):
 *   SHA-256(JSON.stringify([0, pubkey, created_at, kind, tags, content]))
 *
 * Signature: BIP-340 Schnorr over event_id (nostr-tools v2 finalizeEvent).
 *
 * If nostr-tools is unavailable at runtime the functions fall back to
 * deterministic but non-verifiable mock values so the UI never crashes.
 * A console.warn is emitted exactly once in that case.
 */

// Dynamic import so a missing dep doesn't break server startup.
let _nostr: {
  finalizeEvent(
    template: { kind: number; tags: string[][]; content: string; created_at: number },
    sk: Uint8Array,
  ): { id: string; pubkey: string; sig: string; kind: number; tags: string[][]; content: string; created_at: number };
  generateSecretKey(): Uint8Array;
  getPublicKey(sk: Uint8Array): string;
} | null = null;
let _nostrWarnEmitted = false;

async function loadNostr() {
  if (_nostr !== null) return _nostr;
  try {
    const mod = await import('nostr-tools');
    _nostr = mod as unknown as typeof _nostr;
  } catch {
    if (!_nostrWarnEmitted) {
      console.warn('[Synapse/signing] nostr-tools not available — falling back to mock signatures. Run `npm install nostr-tools`.');
      _nostrWarnEmitted = true;
    }
    _nostr = null;
  }
  return _nostr;
}

// ── Primary agent key from env ────────────────────────────────────────────────

let _envKey: Uint8Array | null | undefined = undefined; // undefined = not yet read

/**
 * Load the primary agent private key from the NOSTR_PRIVKEY environment
 * variable (hex-encoded 32 bytes).  Returns null if unset or invalid.
 * On first call without the env var set an ephemeral key is generated and
 * a warning is logged — the app does NOT crash.
 */
export async function loadAgentKey(): Promise<Uint8Array | null> {
  if (_envKey !== undefined) return _envKey;

  const raw = (typeof process !== 'undefined' && process.env?.NOSTR_PRIVKEY)
    ? process.env.NOSTR_PRIVKEY.trim()
    : null;

  if (raw) {
    if (raw.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(raw)) {
      console.warn('[Synapse/signing] NOSTR_PRIVKEY must be 64 hex chars (32 bytes). Ignoring.');
      _envKey = null;
      return null;
    }
    _envKey = hexToBytes(raw);
    console.info('[Synapse/signing] Primary agent key loaded from NOSTR_PRIVKEY.');
    return _envKey;
  }

  // No env var — generate an ephemeral key and warn.
  const nostr = await loadNostr();
  if (nostr) {
    _envKey = nostr.generateSecretKey();
    console.warn(
      '[Synapse/signing] NOSTR_PRIVKEY not set — using an ephemeral key for this session. ' +
      'Events are cryptographically signed but the key will not persist across restarts. ' +
      'Set NOSTR_PRIVKEY=<64-hex-chars> to fix this.',
    );
  } else {
    _envKey = null;
  }
  return _envKey;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++)
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return bytesToHex(new Uint8Array(buf));
}

/** HKDF-SHA256 derivation of a 32-byte key from a seed phrase. */
async function derivePrivKey(seed: string): Promise<Uint8Array> {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(seed), 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode('synapse-agent-v1'), info: new TextEncoder().encode(seed) },
    km, 256,
  );
  return new Uint8Array(bits);
}

// ── public API ────────────────────────────────────────────────────────────────

export interface AgentKeypair {
  privKeyHex: string;  // 32 bytes hex — never persisted or sent over wire
  pubKeyHex:  string;  // 32 bytes x-only BIP-340 Nostr pubkey
  npub:       string;  // display label
}

/**
 * Derive a deterministic BIP-340 keypair from a seed string.
 * Falls back to mock if nostr-tools is unavailable.
 */
export async function deriveKeypair(seed: string): Promise<AgentKeypair> {
  const privBytes = await derivePrivKey(seed);
  const nostr = await loadNostr();

  if (nostr) {
    const pubHex = nostr.getPublicKey(privBytes);
    return { privKeyHex: bytesToHex(privBytes), pubKeyHex: pubHex, npub: 'npub1' + pubHex.slice(0, 8) };
  }

  const mockPub = await sha256Hex('mock-pub:' + seed);
  return { privKeyHex: bytesToHex(privBytes), pubKeyHex: mockPub, npub: 'npub1' + mockPub.slice(0, 8) };
}

export interface SignedSynapseEvent {
  id:         string;
  kind:       number;
  pubkey:     string;
  created_at: number;
  tags:       string[][];
  content:    string;
  sig:        string;
}

/**
 * Build and sign a NIP-01 Synapse event with a real BIP-340 Schnorr signature.
 * Falls back to deterministic mock if nostr-tools unavailable.
 */
export async function buildAndSign(
  keypair: AgentKeypair,
  kind: number,
  tags: string[][],
  content: string,
  createdAt: number = Math.floor(Date.now() / 1000),
): Promise<SignedSynapseEvent> {
  const nostr = await loadNostr();

  if (nostr) {
    const event = nostr.finalizeEvent(
      { kind, tags, content, created_at: createdAt },
      hexToBytes(keypair.privKeyHex),
    );
    return { id: event.id, kind: event.kind, pubkey: event.pubkey, created_at: event.created_at, tags: event.tags, content: event.content, sig: event.sig };
  }

  // Mock fallback — deterministic but NOT a real signature
  const serialized = JSON.stringify([0, keypair.pubKeyHex, createdAt, kind, tags, content]);
  const id  = await sha256Hex(serialized);
  const sig = await sha256Hex('mock-sig:' + id + ':' + keypair.privKeyHex)
            + await sha256Hex('mock-sig-r2:' + id);
  return { id, kind, pubkey: keypair.pubKeyHex, created_at: createdAt, tags, content, sig };
}

/**
 * Verify a Synapse event. Returns false if nostr-tools unavailable (can't verify mocks).
 */
export async function verifyEvent(event: SignedSynapseEvent): Promise<boolean> {
  const nostr = await loadNostr();
  if (!nostr) return false;
  try {
    const { verifyEvent: verify } = await import('nostr-tools');
    return verify(event as Parameters<typeof verify>[0]);
  } catch {
    return false;
  }
}
