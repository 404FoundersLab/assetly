import type { AssetCategory, AssetStatus, LifecycleStage } from '../types';

export const ASSET_CATEGORIES: AssetCategory[] = [
  'laptop',
  'desktop',
  'server',
  'mobile',
  'monitor',
  'keyboard',
  'mouse',
  'webcam',
  'headset',
  'peripheral',
  'network',
  'software',
  'other',
];

export const ASSET_STATUSES: AssetStatus[] = [
  'in_stock',
  'deployed',
  'in_repair',
  'retired',
  'lost',
  'disposed',
];

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'procurement',
  'active',
  'maintenance',
  'end_of_life',
];

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  procurement: 'Procurement',
  active: 'Active',
  maintenance: 'Maintenance',
  end_of_life: 'End of Life',
};

/** Generate a unique asset tag like AST-A3F92K */
export function generateAssetTag(): string {
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `AST-${suffix}`;
}

/** QR payload — scannable lookup URL for mobile devices */
export function getAssetQrValue(assetId: string, origin = window.location.origin): string {
  return `${origin}/lookup/${assetId}`;
}

/** Alternate label format (matches sticker / external scanner conventions) */
export function getAssetQrLabel(assetTag: string, assetId: string): string {
  return `ASSET:${assetTag}:${assetId}`;
}

export function downloadQrFromCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function findEmployeeByAssigneeName(
  name: string,
  employees: { id: string; firstName: string; lastName: string }[],
): string | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;

  const match = employees.find((emp) => {
    const full = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const reverse = `${emp.lastName} ${emp.firstName}`.toLowerCase();
    return normalized === full || normalized === reverse || full.includes(normalized);
  });

  return match?.id;
}

export function defaultWarrantyDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
}

export function createEmptyAssetForm(category: AssetCategory = 'laptop') {
  return {
    assetTag: generateAssetTag(),
    name: '',
    category,
    status: 'in_stock' as AssetStatus,
    lifecycleStage: 'active' as LifecycleStage,
    serialNumber: '',
    manufacturer: '',
    model: '',
    specs: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    currentValue: '',
    repairCost: '',
    warrantyExpiresAt: defaultWarrantyDate(),
    location: '',
    department: '',
    assignedTo: '',
    assignedAssetId: '',
    vendorId: '',
    activationKey: '',
    notes: '',
    imageUrl: '' as string | undefined,
  };
}

export type AssetFormState = ReturnType<typeof createEmptyAssetForm>;
