/** AES-256-GCM encryption for secrets at rest (TOTP secrets), keyed by APP_ENCRYPTION_KEY. */
import { MIN_SECRET_BYTES } from './security';

const PREFIX = 'enc:v1:';

async function aesKey(): Promise<CryptoKey> {
  const raw = process.env.APP_ENCRYPTION_KEY?.trim();
  if (!raw || new TextEncoder().encode(raw).length < MIN_SECRET_BYTES) {
    throw new Error('Insecure configuration: APP_ENCRYPTION_KEY must be set (at least 32 bytes)');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), new TextEncoder().encode(plain)),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return PREFIX + toB64(out);
}

/** Decrypts values written by encryptSecret; legacy plaintext values are returned unchanged. */
export async function decryptSecret(stored: string): Promise<string> {
  if (!stored.startsWith(PREFIX)) return stored;
  const raw = fromB64(stored.slice(PREFIX.length));
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, 12) },
    await aesKey(),
    raw.slice(12),
  );
  return new TextDecoder().decode(pt);
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

export async function sha256Hex(input: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return toB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
