import type {
  Asset,
  AssetAssignment,
  AuditLog,
  Department,
  Employee,
  OwnershipEvent,
  Vendor,
} from '../../types';
import { apiFetch } from './client';

export interface SyncPayload {
  assets: Asset[];
  employees: Employee[];
  departments: Department[];
  vendors: Vendor[];
  assignments: AssetAssignment[];
  ownershipHistory: OwnershipEvent[];
  auditLogs: AuditLog[];
}

export async function fetchSync(): Promise<SyncPayload> {
  return apiFetch<SyncPayload>('/api/sync');
}

export async function createAsset(
  asset: Omit<Asset, 'createdAt'> & {
    assignedBy?: string;
    assignmentNotes?: string;
    qrOrigin?: string;
    audit?: {
      userId: string;
      userName: string;
      action: string;
      entityType: string;
      entityId: string;
      entityLabel: string;
      details: string;
    };
  },
): Promise<Asset> {
  return apiFetch<Asset>('/api/assets', {
    method: 'POST',
    body: JSON.stringify(asset),
  });
}

export async function importInventory(payload: {
  items: Asset[];
  employees: Employee[];
  assignedBy: string;
  qrOrigin?: string;
  audit: {
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId: string;
    entityLabel: string;
    details: string;
  };
}): Promise<{ imported: number; assets: Asset[] }> {
  return apiFetch('/api/assets/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function patchAsset(
  id: string,
  patch: Partial<Asset> & {
    audit?: {
      userId: string;
      userName: string;
      action: string;
      entityType: string;
      entityId: string;
      entityLabel: string;
      details: string;
    };
  },
): Promise<Asset> {
  return apiFetch<Asset>(`/api/assets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteAsset(id: string): Promise<void> {
  await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
}

export async function assignAssetApi(payload: {
  assetId: string;
  employeeId: string;
  assignedBy: string;
  notes?: string;
  audit?: {
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId: string;
    entityLabel: string;
    details: string;
  };
}): Promise<Asset> {
  return apiFetch<Asset>('/api/assets/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function returnAssetApi(payload: {
  assetId: string;
  performedBy: string;
  returnCondition?: string;
  audit?: {
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId: string;
    entityLabel: string;
    details: string;
  };
}): Promise<Asset> {
  return apiFetch<Asset>('/api/assets/return', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
