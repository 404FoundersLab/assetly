import { apiUrl } from './config';
import { getStoredToken, storeToken } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/** Exchanges the HttpOnly refresh cookie for a new short-lived access token (single-flight). */
function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(apiUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { token?: string };
        if (!data.token) return false;
        storeToken(data.token);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

/** Revokes the refresh token server-side and clears auth cookies. Best effort. */
export function serverLogout(): void {
  void fetch(apiUrl('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  }).catch(() => undefined);
}

const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const send = () => {
    const token = getStoredToken();
    return fetch(apiUrl(path), {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  };
  let res = await send();
  if (res.status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p)) && (await refreshAccessToken())) {
    res = await send();
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function checkApiHealth(): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl('/api/health'));
    const contentType = res.headers.get('content-type') ?? '';

    if (contentType.includes('text/html')) {
      return {
        ok: false,
        message:
          'API is not running. Stop other dev terminals, then run: npm run dev (from the project root or apps/web).',
      };
    }

    if (!res.ok) {
      return { ok: false, message: 'Backend health check failed.' };
    }

    const data = (await res.json()) as {
      status?: string;
      database?: string;
      message?: string;
    };

    if (data.status === 'ok' && data.database === 'connected') {
      const loginProbe = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (loginProbe.status === 404) {
        return {
          ok: false,
          message:
            'An old API is still running without login support. Stop all dev terminals, then run: npm run dev',
        };
      }
      return { ok: true };
    }

    return {
      ok: false,
      message:
        data.message ??
        (data.database === 'disconnected'
          ? 'Database disconnected. Check DATABASE_URL in .env and run SQL migrations.'
          : 'Backend health check failed.'),
    };
  } catch {
    return {
      ok: false,
      message:
        'Cannot reach the API. Run npm run dev from the project root (starts both API and web app).',
    };
  }
}

export function loginErrorMessage(status: number, serverMessage: string): string {
  if (status === 404) {
    return 'Login API not found — restart dev with npm run dev (not vite alone).';
  }
  if (status === 401) return serverMessage || 'Invalid email or password';
  if (status === 500 && serverMessage.includes('user_passwords')) {
    return 'Database migration needed. Run database/supabase/003_user_passwords.sql in Neon, or restart the API.';
  }
  return serverMessage || 'Sign in failed';
}
