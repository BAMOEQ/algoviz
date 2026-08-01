import type { Primitive } from '@/lib/engine/types';

/**
 * One applied operation. The op log — not a dump of the structure's nodes — is what gets saved and
 * shared: replaying operations guarantees the restored structure is valid by construction, and it
 * keeps URLs short.
 */
export interface LoggedOperation {
  op: string;
  args: Record<string, Primitive>;
}

export interface SessionState {
  slug: string;
  seeded: boolean;
  ops: LoggedOperation[];
}

const VERSION = 1;

interface Encoded {
  v: number;
  s: string;
  d?: 1;
  o: Array<[string, Record<string, Primitive>]>;
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  return Buffer.from(padded, 'base64').toString('utf8');
}

export function encodeSession(session: SessionState): string {
  const payload: Encoded = {
    v: VERSION,
    s: session.slug,
    o: session.ops.map((entry) => [entry.op, entry.args]),
  };
  if (session.seeded) payload.d = 1;

  return toBase64Url(JSON.stringify(payload));
}

/** Returns null for anything malformed — a bad share link should degrade, never throw. */
export function decodeSession(encoded: string): SessionState | null {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(encoded));

    if (typeof parsed !== 'object' || parsed === null) return null;
    const payload = parsed as Partial<Encoded>;

    if (payload.v !== VERSION) return null;
    if (typeof payload.s !== 'string' || payload.s === '') return null;
    if (!Array.isArray(payload.o)) return null;

    const ops: LoggedOperation[] = [];
    for (const entry of payload.o) {
      if (!Array.isArray(entry) || entry.length !== 2) return null;
      const [op, args] = entry;
      if (typeof op !== 'string') return null;
      if (typeof args !== 'object' || args === null || Array.isArray(args)) return null;
      ops.push({ op, args: args as Record<string, Primitive> });
    }

    return { slug: payload.s, seeded: payload.d === 1, ops };
  } catch {
    return null;
  }
}

export const SESSION_STORAGE_KEY = 'algoviz:session';

export function saveSession(session: SessionState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, encodeSession(session));
  } catch {
    /* Storage can be full or blocked; losing a saved session is not worth breaking the page over. */
  }
}

export function loadSession(): SessionState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw === null ? null : decodeSession(raw);
  } catch {
    return null;
  }
}
