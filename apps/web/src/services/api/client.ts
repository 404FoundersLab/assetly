import { apiUrl } from './config';
import { getStoredToken } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

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
