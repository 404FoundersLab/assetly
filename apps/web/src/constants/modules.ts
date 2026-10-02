import type { Tenant } from '../types';

export interface SystemModuleConfig {
  id: 'module:assets' | 'module:hr' | 'module:docs' | 'module:finance';
  name: string;
  description: string;
  badge: string;
  color: string;
  route: string;
}

export const SYSTEM_MODULES: readonly SystemModuleConfig[] = [
  {
    id: 'module:assets',
    name: 'IT Asset Intelligence',
    description: 'Hardware fleet, peripherals, network devices, store devices, software SAM, endpoint security, and lifecycle management.',
    badge: 'CORE INVENTORY',
    color: '#6366F1',
    route: '/dashboard',
  },
  {
    id: 'module:hr',
    name: 'HR People & Governance',
    description: 'Headcount tracking, departmental allocations, leave workflows, attendance logs, performance reviews, and company policies.',
    badge: 'PEOPLE OPS',
    color: '#10B981',
    route: '/hr',
  },
  {
    id: 'module:docs',
    name: 'Executive Doc Vault',
    description: 'Corporate governance charters, board meeting records, compliance audits, and executive document library.',
    badge: 'COMPLIANCE',
    color: '#3B82F6',
    route: '/exec-docs',
  },
  {
    id: 'module:finance',
    name: 'IT Spend & Financials',
    description: 'Asset valuation schedules, CapEx/OpEx amortization, IT expenditure tracking, and cost center budget monitoring.',
    badge: 'FINANCE & CAPEX',
    color: '#F59E0B',
    route: '/it-spend',
  },
] as const;

export const DEFAULT_ENABLED_MODULES: string[] = SYSTEM_MODULES.map((m) => m.id);

/**
 * Check whether a module is enabled for a given tenant.
 * Defaults to true if enabledModules is not configured (legacy/all-inclusive fallback).
 */
export function isTenantModuleEnabled(
  tenant: Tenant | null | undefined,
  moduleId: string
): boolean {
  if (!tenant) return true;
  if (!tenant.enabledModules || !Array.isArray(tenant.enabledModules)) {
    return true; // Backward compatibility for tenants created before module restriction
  }
  return tenant.enabledModules.includes(moduleId);
}
