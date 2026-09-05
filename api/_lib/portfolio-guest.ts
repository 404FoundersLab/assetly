/** Public read-only account for portfolio / recruiter demos. */

export const PORTFOLIO_GUEST_EMAIL = (
  process.env.PORTFOLIO_GUEST_EMAIL?.trim().toLowerCase() || 'guest@assetly.demo'
);

export const PORTFOLIO_GUEST_PASSWORD =
  process.env.PORTFOLIO_GUEST_PASSWORD?.trim() || 'ViewOnly@2026';

export const PORTFOLIO_GUEST_NAME = {
  firstName: 'Portfolio',
  lastName: 'Guest',
} as const;

export function isPortfolioGuestEnabled(): boolean {
  return process.env.PORTFOLIO_GUEST_ENABLED === 'true';
}

export function isPortfolioGuestEmail(email: string | undefined): boolean {
  return String(email ?? '').trim().toLowerCase() === PORTFOLIO_GUEST_EMAIL;
}

export function matchPortfolioGuest(email: string, password: string): boolean {
  if (!isPortfolioGuestEnabled()) return false;
  return isPortfolioGuestEmail(email) && password === PORTFOLIO_GUEST_PASSWORD;
}

export function isReadOnlyRole(role: string | undefined): boolean {
  return role === 'viewer';
}
