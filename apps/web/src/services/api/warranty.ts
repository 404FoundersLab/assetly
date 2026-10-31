import { apiFetch } from './client';

export interface WarrantyItem {
  name: string;
  type: string;
  startDate?: string;
  endDate?: string;
  status: string;
  deliveryType?: string;
  description?: string;
}

export interface WarrantyLookupResult {
  success: boolean;
  manufacturer: string;
  serialNumber: string;
  productName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  planName?: string;
  deliveryType?: string;
  supportUrl: string;
  requiresManualVerification?: boolean;
  message?: string;
  allWarranties?: WarrantyItem[];
}

export async function lookupWarranty(serialNumber: string, manufacturer: string): Promise<WarrantyLookupResult> {
  const query = new URLSearchParams({
    serialNumber: serialNumber.trim(),
    manufacturer: manufacturer.trim().toLowerCase(),
  });
  return apiFetch<WarrantyLookupResult>(`/api/warranty/lookup?${query.toString()}`);
}
