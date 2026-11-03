import { sha256Hex } from './crypto';

export const MIN_PASSWORD_LENGTH = 12;

const COMMON = new Set([
  'password', 'password1', 'password123', 'passw0rd', 'letmein', 'welcome', 'welcome1', 'admin123', 'administrator',
  'qwerty', 'qwerty123', 'qwertyuiop', 'iloveyou', 'abc12345', '12345678', '123456789', '1234567890', '111111',
  'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'trustno1', 'changeme', 'default', 'secret',
  'assetly', 'demo@123456', 'viewonly@2026', 'p@ssw0rd', 'p@ssword1', 'welcome123', 'login', 'master', 'shadow',
]);

/** Synchronous policy checks. Returns a human-readable problem, or null when acceptable. */
export function passwordPolicyProblem(password: string, context?: { email?: string }): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (password.length > 128) return 'Password must be at most 128 characters';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/\d/.test(password)) return 'Password must include a number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a symbol';
  const lower = password.toLowerCase();
  const squashed = lower.replace(/[^a-z0-9]/g, '');
  if (COMMON.has(lower) || COMMON.has(squashed)) return 'Password is too common';
  if (/^(.)\1+$/.test(password)) return 'Password is too repetitive';
  const local = context?.email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return 'Password must not contain your email name';
  return null;
}

/**
 * Breach check using the HIBP k-anonymity range API (only a 5-char SHA-1 prefix leaves the server).
 * Best effort: network failures never block a password change.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  try {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
    const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hex.slice(0, 5);
    const suffix = hex.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.split('\n').some((line) => {
      const [s, count] = line.trim().split(':');
      return s === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

export async function validateNewPassword(password: string, context?: { email?: string }): Promise<string | null> {
  const problem = passwordPolicyProblem(password, context);
  if (problem) return problem;
  if (process.env.NODE_ENV !== 'test' && (await isBreachedPassword(password))) {
    return 'This password has appeared in a data breach. Choose a different one';
  }
  return null;
}

export { sha256Hex };
