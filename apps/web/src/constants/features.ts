/**
 * Feature flags. To re-enable Endpoint Security, set
 * VITE_ENABLE_ENDPOINT_SECURITY=true in the web app environment (or flip the default below).
 */
export const ENDPOINT_SECURITY_ENABLED = import.meta.env.VITE_ENABLE_ENDPOINT_SECURITY === 'true';

