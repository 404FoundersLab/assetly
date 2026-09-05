import { json, corsPreflight } from '../_lib/db';
import { isDemoAuthEnabled } from '../_lib/security';
import {
  isPortfolioGuestEnabled,
  PORTFOLIO_GUEST_EMAIL,
  PORTFOLIO_GUEST_PASSWORD,
} from '../_lib/portfolio-guest';

export const config = { runtime: 'edge' };

/** Public flags for the login UI. Guest password is intended to be published. */
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }
  return json({
    enabled: isDemoAuthEnabled(),
    portfolioGuest: isPortfolioGuestEnabled()
      ? { enabled: true, email: PORTFOLIO_GUEST_EMAIL, password: PORTFOLIO_GUEST_PASSWORD }
      : { enabled: false },
  });
}
