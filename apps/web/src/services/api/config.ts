/** API base URL — empty string = same origin (/api on Vercel) */
export const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function isApiEnabled(): boolean {
  return import.meta.env.VITE_USE_API !== 'false';
}

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
